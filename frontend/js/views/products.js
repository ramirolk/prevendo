import '../auth-guard.js';

import { apiFetch, getRole } from '../api.js';
import { mountNav } from '../layout/nav.js';
import { escapeHtml } from '../utils/escape.js';

const productsHead = document.getElementById('products-head');
const productsBody = document.getElementById('products-body');
const productsCount = document.getElementById('products-count');
const productsStatus = document.getElementById('products-status');
const productsAlert = document.getElementById('products-alert');
const productsErrorMessage = document.getElementById('products-error-message');
const retryProducts = document.getElementById('retry-products');
const categoriesAlert = document.getElementById('categories-alert');
const categoriesErrorMessage = document.getElementById('categories-error-message');
const retryCategories = document.getElementById('retry-categories');
const includeInactiveControl = document.getElementById('include-inactive-control');
const includeInactive = document.getElementById('include-inactive');
const pagination = document.getElementById('products-pagination');
const paginationSummary = document.getElementById('products-pagination-summary');
const pageLabel = document.getElementById('products-page-label');

const perPage = 10;
const isOwner = getRole() === 'owner';
let currentPage = 1;
let lastPage = 1;
let products = [];
let categoriesById = new Map();
let productsLoaded = false;
let includesCostPrice = false;
let requestedPage = 1;

mountNav();

if (isOwner) includeInactiveControl.hidden = false;

function setProductsStatus(message, tone = 'neutral') {
    const tones = {
        neutral: 'text-muted',
        error: 'text-danger',
    };

    productsStatus.className = `text-xs font-medium ${tones[tone]}`;
    productsStatus.textContent = message;
}

function showProductsError(message) {
    productsErrorMessage.textContent = message;
    productsAlert.hidden = false;
}

function clearProductsError() {
    productsErrorMessage.textContent = '';
    productsAlert.hidden = true;
}

function showCategoriesError(message) {
    categoriesErrorMessage.textContent = message;
    categoriesAlert.hidden = false;
}

function clearCategoriesError() {
    categoriesErrorMessage.textContent = '';
    categoriesAlert.hidden = true;
}

function renderTableMessage(message) {
    const columnCount = includesCostPrice ? 6 : 5;
    productsBody.innerHTML = `
        <tr>
            <td colspan="${columnCount}" class="px-5 py-12 text-center text-sm text-muted sm:px-6">${escapeHtml(message)}</td>
        </tr>
    `;
}

function setListLoading(loading) {
    pagination.querySelectorAll('button[data-page]').forEach(button => {
        button.disabled = loading || (button.dataset.page === 'previous' ? currentPage <= 1 : currentPage >= lastPage);
    });
    if (isOwner) includeInactive.disabled = loading;
}

function formatCurrency(value) {
    if (value === null || value === undefined || value === '') return '—';

    const amount = Number(value);

    if (!Number.isFinite(amount)) return '—';

    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
    }).format(amount);
}

function formatNumber(value) {
    const number = Number(value);

    return Number.isFinite(number) ? number.toLocaleString('es-AR') : '—';
}

function categoryName(product) {
    return categoriesById.get(String(product.category_id)) ?? `Categoría ${product.category_id}`;
}

function renderProducts() {
    const columns = [
        '<th scope="col" class="px-5 py-3.5 sm:px-6">Producto</th>',
        '<th scope="col" class="px-5 py-3.5 sm:px-6">Categoría</th>',
        '<th scope="col" class="px-5 py-3.5 sm:px-6">Precio de venta</th>',
    ];

    if (includesCostPrice) {
        columns.push('<th scope="col" class="px-5 py-3.5 sm:px-6">Costo</th>');
    }

    columns.push(
        '<th scope="col" class="px-5 py-3.5 sm:px-6">Stock</th>',
        '<th scope="col" class="px-5 py-3.5 sm:px-6">Estado</th>',
    );
    productsHead.innerHTML = `<tr>${columns.join('')}</tr>`;

    const count = products.length;
    productsCount.textContent = `${formatNumber(productsTotal)} ${productsTotal === 1 ? 'producto' : 'productos'}`;
    paginationSummary.textContent = productsTotal === 0
        ? 'No hay productos para mostrar'
        : `Mostrando ${formatNumber(productsFrom)}–${formatNumber(productsTo)} de ${formatNumber(productsTotal)}`;
    pageLabel.textContent = `Página ${formatNumber(currentPage)} de ${formatNumber(lastPage)}`;
    pagination.querySelector('[data-page="previous"]').disabled = currentPage <= 1;
    pagination.querySelector('[data-page="next"]').disabled = currentPage >= lastPage;

    if (count === 0) {
        setProductsStatus('', 'neutral');
        renderTableMessage(productsTotal === 0
            ? 'Todavía no hay productos registrados.'
            : 'No hay productos en esta página.');
        return;
    }

    productsBody.innerHTML = products.map(product => {
        const stock = Number(product.current_stock);
        const minimumStock = Number(product.minimum_stock);
        const isActive = Boolean(product.active);
        const statusLabel = !isActive
            ? '<span class="inline-flex rounded-full bg-ground px-2.5 py-1 text-xs font-medium text-muted">Inactivo</span>'
            : stock <= 0
                ? '<span class="inline-flex rounded-full bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger">Sin stock</span>'
                : stock <= minimumStock
                    ? '<span class="inline-flex rounded-full bg-warn/10 px-2.5 py-1 text-xs font-medium text-warn">Stock bajo</span>'
                    : '<span class="inline-flex rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">Disponible</span>';
        const costCell = includesCostPrice
            ? `<td class="px-5 py-4 tabular-nums text-muted sm:px-6">${escapeHtml(formatCurrency(product.cost_price))}</td>`
            : '';

        return `
            <tr class="transition-colors hover:bg-ground/60">
                <th scope="row" class="px-5 py-4 font-medium text-ink sm:px-6">${escapeHtml(product.name)}</th>
                <td class="px-5 py-4 text-muted sm:px-6">${escapeHtml(categoryName(product))}</td>
                <td class="px-5 py-4 tabular-nums text-ink sm:px-6">${escapeHtml(formatCurrency(product.sale_price))}</td>
                ${costCell}
                <td class="px-5 py-4 tabular-nums text-ink sm:px-6">${escapeHtml(formatNumber(product.current_stock))}</td>
                <td class="px-5 py-4 sm:px-6">${statusLabel}</td>
            </tr>
        `;
    }).join('');
    setProductsStatus('', 'neutral');
}

let productsTotal = 0;
let productsFrom = 0;
let productsTo = 0;

function updateProductPagination(meta) {
    const values = ['current_page', 'last_page', 'per_page', 'total'];

    if (values.some(key => !Number.isSafeInteger(meta?.[key]) || meta[key] < 0)) {
        throw new Error('Formato de paginación inesperado');
    }

    currentPage = Math.max(1, meta.current_page);
    lastPage = Math.max(1, meta.last_page);
    productsTotal = meta.total;
    productsFrom = Number.isSafeInteger(meta.from) ? meta.from : 0;
    productsTo = Number.isSafeInteger(meta.to) ? meta.to : 0;
}

async function loadProducts({ page = currentPage } = {}) {
    requestedPage = page;
    productsLoaded = false;
    setListLoading(true);
    productsCount.textContent = '— productos';
    paginationSummary.textContent = 'Cargando productos';
    pageLabel.textContent = 'Página —';
    setProductsStatus('Cargando productos', 'neutral');
    clearProductsError();
    renderTableMessage('Cargando productos...');

    const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
    });

    if (isOwner && includeInactive.checked) {
        params.set('include_inactive', 'true');
    }

    try {
        const response = await apiFetch(`/products?${params.toString()}`);

        if (!Array.isArray(response?.data)) {
            throw new Error('Formato de respuesta inesperado');
        }

        updateProductPagination(response.meta);
        requestedPage = currentPage;
        products = response.data;
        includesCostPrice = products.some(product => Object.prototype.hasOwnProperty.call(product, 'cost_price'));
        productsLoaded = true;
        renderProducts();
    } catch (error) {
        if (error.status === 401) return;

        productsLoaded = false;
        productsCount.textContent = '— productos';
        paginationSummary.textContent = 'No se pudo cargar el total';
        setProductsStatus('Error al cargar', 'error');
        renderTableMessage('No se pudieron cargar los productos.');
        showProductsError('Revisá tu conexión e intentá nuevamente.');
        console.error('Error al cargar los productos:', error);
    } finally {
        setListLoading(false);
    }
}

async function loadCategories() {
    clearCategoriesError();

    try {
        const response = await apiFetch('/categories');

        if (!Array.isArray(response?.data)) {
            throw new Error('Formato de categorías inesperado');
        }

        categoriesById = new Map(response.data.map(category => [String(category.id), category.name]));
        if (productsLoaded) renderProducts();
    } catch (error) {
        if (error.status === 401) return;

        showCategoriesError('No se pudieron cargar los nombres de las categorías. Podés reintentar sin perder la lista de productos.');
        console.error('Error al cargar las categorías de productos:', error);
    }
}

retryProducts.addEventListener('click', () => loadProducts({ page: requestedPage }));
retryCategories.addEventListener('click', loadCategories);
includeInactive.addEventListener('change', () => loadProducts({ page: 1 }));

pagination.addEventListener('click', event => {
    const button = event.target.closest('button[data-page]');

    if (!button || button.disabled) return;

    const nextPage = button.dataset.page === 'next' ? currentPage + 1 : currentPage - 1;
    loadProducts({ page: nextPage });
});

loadCategories();
loadProducts({ page: 1 });
