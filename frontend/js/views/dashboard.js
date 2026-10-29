import '../auth-guard.js';

import { apiFetch } from '../api.js';
import { mountNav } from '../layout/nav.js';
import { escapeHtml } from '../utils/escape.js';

const lowStockBody = document.getElementById('low-stock-body');
const lowStockCount = document.getElementById('low-stock-count');
const outOfStockCount = document.getElementById('out-of-stock-count');
const reportStatus = document.getElementById('report-status');
const activeProductsCount = document.getElementById('active-products-count');
const activeProductsStatus = document.getElementById('active-products-status');
const retryActiveProducts = document.getElementById('retry-active-products');

mountNav();

document.getElementById('current-date').textContent = new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'full',
}).format(new Date());

function setStatus(message, tone = 'neutral') {
    const tones = {
        neutral: 'bg-ground text-muted',
        success: 'bg-brand/10 text-brand',
        warning: 'bg-warn/10 text-warn',
        error: 'bg-danger/10 text-danger',
    };
    const dots = {
        neutral: 'bg-muted',
        success: 'bg-brand',
        warning: 'bg-warn',
        error: 'bg-danger',
    };

    reportStatus.className = `mt-2 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-medium sm:mt-0 ${tones[tone]}`;
    reportStatus.innerHTML = `<span class="size-1.5 rounded-full ${dots[tone]}" aria-hidden="true"></span>${escapeHtml(message)}`;
}

function renderMessage(message, { error = false } = {}) {
    lowStockBody.innerHTML = `
        <tr>
            <td colspan="4" class="px-5 py-12 text-center sm:px-6">
                <p class="text-sm ${error ? 'text-danger' : 'text-muted'}">${escapeHtml(message)}</p>
                ${error ? '<button id="retry-low-stock" type="button" class="mt-3 rounded-lg px-3 py-2 text-sm font-semibold text-brand hover:bg-brand/10 focus:outline-none focus:ring-2 focus:ring-brand">Volver a intentar</button>' : ''}
            </td>
        </tr>
    `;

    if (error) {
        document.getElementById('retry-low-stock').addEventListener('click', loadLowStock);
    }
}

function renderProducts(products) {
    lowStockCount.textContent = products.length.toLocaleString('es-AR');
    const unavailable = products.filter(product => Number(product.current_stock) <= 0).length;
    outOfStockCount.textContent = unavailable.toLocaleString('es-AR');

    if (products.length === 0) {
        setStatus('Todo al día', 'success');
        renderMessage('No hay productos con stock bajo. El inventario está dentro de los mínimos definidos.');
        return;
    }

    setStatus(`${products.length} ${products.length === 1 ? 'producto requiere' : 'productos requieren'} atención`, 'warning');

    lowStockBody.innerHTML = products.map(product => {
        const isOutOfStock = Number(product.current_stock) <= 0;
        const stock = escapeHtml(product.current_stock);
        const minimum = escapeHtml(product.minimum_stock);
        const status = isOutOfStock
            ? '<span class="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger"><span class="size-1.5 rounded-full bg-danger" aria-hidden="true"></span>Agotado</span>'
            : '<span class="inline-flex items-center gap-1.5 rounded-full bg-warn/10 px-2.5 py-1 text-xs font-medium text-warn"><span class="size-1.5 rounded-full bg-warn" aria-hidden="true"></span>Reponer pronto</span>';

        return `
            <tr class="transition-colors hover:bg-ground/60">
                <th scope="row" class="px-5 py-4 font-medium text-ink sm:px-6">${escapeHtml(product.name)}</th>
                <td class="px-5 py-4 tabular-nums ${isOutOfStock ? 'font-semibold text-danger' : 'text-ink'}">${stock}</td>
                <td class="px-5 py-4 tabular-nums text-muted">${minimum}</td>
                <td class="px-5 py-4 sm:px-6">${status}</td>
            </tr>
        `;
    }).join('');
}

async function loadLowStock() {
    lowStockCount.textContent = '—';
    outOfStockCount.textContent = '—';
    setStatus('Cargando reporte', 'neutral');
    renderMessage('Cargando productos...');

    try {
        const response = await apiFetch('/reports/low-stock');

        if (!Array.isArray(response?.data)) {
            throw new Error('Formato de respuesta inesperado');
        }

        renderProducts(response.data);
    } catch (error) {
        if (error.status === 401) {
            return;
        }

        setStatus('No disponible', 'error');
        renderMessage('No se pudo cargar el reporte. Revisá tu conexión e intentá nuevamente.', { error: true });
        console.error('Error al cargar el reporte de stock bajo:', error);
    }
}

async function loadActiveProducts() {
    activeProductsCount.textContent = '—';
    activeProductsStatus.className = 'mt-1 text-sm text-muted';
    activeProductsStatus.textContent = 'Cargando productos';
    retryActiveProducts.hidden = true;
    retryActiveProducts.classList.add('hidden');

    try {
        const response = await apiFetch('/products?per_page=1');
        const total = response?.meta?.total;

        if (!Number.isSafeInteger(total) || total < 0) {
            throw new Error('Formato de respuesta inesperado');
        }

        activeProductsCount.textContent = total.toLocaleString('es-AR');
        activeProductsStatus.className = 'mt-1 text-sm text-muted';
        activeProductsStatus.textContent = 'Productos activos en el inventario';
    } catch (error) {
        if (error.status === 401) {
            return;
        }

        activeProductsCount.textContent = '—';
        activeProductsStatus.className = 'mt-1 text-sm text-danger';
        activeProductsStatus.textContent = 'No se pudieron cargar los productos';
        retryActiveProducts.hidden = false;
        retryActiveProducts.classList.remove('hidden');
        console.error('Error al cargar el total de productos activos:', error);
    }
}

retryActiveProducts.addEventListener('click', loadActiveProducts);

// Cada bloque se carga por separado: un error no debe bloquear al otro.
loadLowStock();
loadActiveProducts();
