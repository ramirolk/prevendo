import '../auth-guard.js';

import { apiFetch, getRole } from '../api.js';
import { mountNav } from '../layout/nav.js';
import { escapeHtml } from '../utils/escape.js';

const salesHeading = document.getElementById('sales-heading');
const salesBody = document.getElementById('sales-body');
const salesCount = document.getElementById('sales-count');
const salesStatus = document.getElementById('sales-status');
const salesAlert = document.getElementById('sales-alert');
const salesErrorMessage = document.getElementById('sales-error-message');
const retrySales = document.getElementById('retry-sales');
const pagination = document.getElementById('sales-pagination');
const paginationSummary = document.getElementById('sales-pagination-summary');
const pageLabel = document.getElementById('sales-page-label');
const detailPanel = document.getElementById('sale-detail-panel');
const detailHeading = document.getElementById('sale-detail-heading');
const detailSummary = document.getElementById('sale-detail-summary');
const detailStatusBadge = document.getElementById('sale-detail-status-badge');
const detailLoading = document.getElementById('sale-detail-loading');
const detailAlert = document.getElementById('sale-detail-alert');
const detailErrorMessage = document.getElementById('sale-detail-error-message');
const retrySaleDetail = document.getElementById('retry-sale-detail');
const detailContent = document.getElementById('sale-detail-content');
const saleItemsBody = document.getElementById('sale-items-body');
const detailTotal = document.getElementById('sale-detail-total');
const closeDetailButton = document.getElementById('close-sale-detail');

const perPage = 10;
const isOwner = getRole() === 'owner';
let currentPage = 1;
let lastPage = 1;
let totalSales = 0;
let sales = [];
let selectedSaleId = null;
let isCancelling = false;
let cancellingSaleId = null;
let latestSalesRequestId = 0;
let latestDetailRequestId = 0;

mountNav();

function formatCurrency(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) return '—';

    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
    }).format(amount);
}

function formatDate(value) {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '—';

    return new Intl.DateTimeFormat('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

function getSellerName(sale) {
    return sale.user?.name || (sale.user_id ? `Usuario #${sale.user_id}` : 'Usuario desconocido');
}

function statusDetails(status) {
    if (status === 'completed') {
        return { label: 'Completada', className: 'bg-brand/10 text-brand' };
    }

    if (status === 'cancelled') {
        return { label: 'Anulada', className: 'bg-danger/10 text-danger' };
    }

    return { label: 'Estado desconocido', className: 'bg-ground text-muted' };
}

function renderTableMessage(message) {
    salesBody.innerHTML = `
        <tr>
            <td colspan="7" class="px-5 py-12 text-center text-sm text-muted sm:px-6">${escapeHtml(message)}</td>
        </tr>
    `;
}

function setSalesStatus(message, tone = 'neutral') {
    const tones = {
        neutral: 'text-muted',
        error: 'text-danger',
    };

    salesStatus.className = `text-xs font-medium ${tones[tone]}`;
    salesStatus.textContent = message;
}

function showSalesError(message) {
    salesErrorMessage.textContent = message;
    salesAlert.hidden = false;
}

function clearSalesError() {
    salesErrorMessage.textContent = '';
    salesAlert.hidden = true;
}

function showDetailError(message) {
    detailErrorMessage.textContent = message;
    detailAlert.hidden = false;
}

function clearDetailError() {
    detailErrorMessage.textContent = '';
    detailAlert.hidden = true;
}

function renderSales() {
    if (sales.length === 0) {
        renderTableMessage('Todavía no hay ventas registradas.');
    } else {
        salesBody.innerHTML = sales.map(sale => {
            const safeId = escapeHtml(sale.id);
            const status = statusDetails(sale.status);
            const sellerName = escapeHtml(getSellerName(sale));
            const itemCount = Number.isSafeInteger(sale.items_count) ? sale.items_count : 0;
            const cancelAction = isOwner && sale.status === 'completed'
                ? `<button type="button" data-action="cancel" data-id="${safeId}" aria-label="Anular venta ${safeId}" class="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger" ${isCancelling && String(cancellingSaleId) === String(sale.id) ? 'disabled' : ''}>Anular</button>`
                : '';

            return `
                <tr class="transition-colors hover:bg-ground/60">
                    <th scope="row" class="whitespace-nowrap px-5 py-4 font-medium text-ink sm:px-6">#${safeId}</th>
                    <td class="whitespace-nowrap px-5 py-4 text-muted sm:px-6">${escapeHtml(formatDate(sale.created_at))}</td>
                    <td class="px-5 py-4 text-muted sm:px-6">${sellerName}</td>
                    <td class="px-5 py-4 tabular-nums text-ink sm:px-6">${escapeHtml(itemCount.toLocaleString('es-AR'))}</td>
                    <td class="whitespace-nowrap px-5 py-4 tabular-nums text-ink sm:px-6">${escapeHtml(formatCurrency(sale.total))}</td>
                    <td class="px-5 py-4 sm:px-6"><span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${status.className}">${escapeHtml(status.label)}</span></td>
                    <td class="px-5 py-4 sm:px-6">
                        <div class="flex items-center gap-1">
                            <button type="button" data-action="details" data-id="${safeId}" aria-label="Ver detalle de la venta ${safeId}" class="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand/10 focus:outline-none focus:ring-2 focus:ring-brand" ${isCancelling && String(cancellingSaleId) === String(sale.id) ? 'disabled' : ''}>Ver detalle</button>
                            ${cancelAction}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    salesCount.textContent = `${totalSales.toLocaleString('es-AR')} ${totalSales === 1 ? 'venta' : 'ventas'}`;
    paginationSummary.textContent = totalSales === 0
        ? 'No hay ventas para mostrar'
        : `Mostrando ${sales[0] ? (currentPage - 1) * perPage + 1 : 0}–${Math.min(currentPage * perPage, totalSales)} de ${totalSales.toLocaleString('es-AR')} ventas`;
    pageLabel.textContent = `Página ${currentPage} de ${lastPage}`;
    pagination.querySelector('[data-page="previous"]').disabled = currentPage <= 1;
    pagination.querySelector('[data-page="next"]').disabled = currentPage >= lastPage || totalSales === 0;
    pagination.hidden = totalSales <= perPage;

    setSalesStatus('', 'neutral');
}

async function loadSales({ page = currentPage } = {}) {
    const requestId = ++latestSalesRequestId;
    currentPage = page;
    salesCount.textContent = '— ventas';
    paginationSummary.textContent = 'Cargando ventas';
    pageLabel.textContent = 'Página —';
    setSalesStatus('Cargando ventas', 'neutral');
    clearSalesError();
    renderTableMessage('Cargando ventas...');
    pagination.querySelectorAll('button').forEach(button => {
        button.disabled = true;
    });

    try {
        const params = new URLSearchParams({
            page: String(page),
            per_page: String(perPage),
        });
        const response = await apiFetch(`/sales?${params.toString()}`);

        if (requestId !== latestSalesRequestId) return false;

        if (!Array.isArray(response?.data)) {
            throw new Error('Formato de respuesta inesperado');
        }

        const meta = response.meta;
        if (!Number.isSafeInteger(meta?.current_page) || !Number.isSafeInteger(meta?.last_page) || !Number.isSafeInteger(meta?.total)) {
            throw new Error('Metadatos de paginación inesperados');
        }

        if (page > Math.max(1, meta.last_page)) {
            return loadSales({ page: Math.max(1, meta.last_page) });
        }

        currentPage = Math.max(1, meta.current_page);
        lastPage = Math.max(1, meta.last_page);
        totalSales = meta.total;
        sales = response.data;
        renderSales();
        return true;
    } catch (error) {
        if (requestId !== latestSalesRequestId) return false;
        if (error.status === 401) return false;

        totalSales = 0;
        sales = [];
        salesCount.textContent = '— ventas';
        paginationSummary.textContent = 'No se pudo cargar el historial';
        pageLabel.textContent = 'Página —';
        setSalesStatus('Error al cargar', 'error');
        renderTableMessage('No se pudieron cargar las ventas.');
        showSalesError('Revisá tu conexión e intentá nuevamente.');
        console.error('Error al cargar las ventas:', error);
        return false;
    }
}

function closeSaleDetail({ restoreFocus = true } = {}) {
    const previousId = selectedSaleId;
    selectedSaleId = null;
    latestDetailRequestId += 1;
    detailPanel.hidden = true;

    if (!restoreFocus) return;

    const trigger = [...salesBody.querySelectorAll('button[data-action="details"]')]
        .find(button => button.dataset.id === String(previousId));
    (trigger ?? salesHeading).focus();
}

function renderSaleDetail(sale) {
    const status = statusDetails(sale.status);
    const sellerName = getSellerName(sale);
    detailHeading.textContent = `Detalle de la venta #${sale.id}`;
    detailSummary.textContent = `${formatDate(sale.created_at)} · Registrada por ${sellerName}`;
    detailStatusBadge.innerHTML = `<span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${status.className}">${escapeHtml(status.label)}</span>`;
    saleItemsBody.innerHTML = sale.items.map(item => {
        const quantity = Number(item.quantity);
        const unitPriceCents = Math.round(Number(item.unit_price) * 100);
        const subtotal = Number.isSafeInteger(quantity) && Number.isSafeInteger(unitPriceCents)
            ? (quantity * unitPriceCents) / 100
            : NaN;

        return `
            <tr>
                <th scope="row" class="px-5 py-4 font-medium text-ink sm:px-6">${escapeHtml(item.product?.name ?? 'Producto no disponible')}</th>
                <td class="px-5 py-4 tabular-nums text-ink sm:px-6">${escapeHtml(String(item.quantity))}</td>
                <td class="px-5 py-4 tabular-nums text-muted sm:px-6">${escapeHtml(formatCurrency(item.unit_price))}</td>
                <td class="px-5 py-4 text-right tabular-nums text-ink sm:px-6">${escapeHtml(formatCurrency(subtotal))}</td>
            </tr>
        `;
    }).join('');
    detailTotal.textContent = formatCurrency(sale.total);
    detailLoading.hidden = true;
    detailContent.hidden = false;
}

async function loadSaleDetail(saleId, { focus = true } = {}) {
    const requestId = ++latestDetailRequestId;
    selectedSaleId = saleId;
    detailPanel.hidden = false;
    detailHeading.textContent = `Detalle de la venta #${saleId}`;
    detailSummary.textContent = '';
    detailStatusBadge.innerHTML = '';
    detailLoading.hidden = false;
    detailContent.hidden = true;
    detailLoading.textContent = 'Cargando detalle...';
    clearDetailError();

    try {
        const response = await apiFetch(`/sales/${encodeURIComponent(saleId)}`);

        if (requestId !== latestDetailRequestId) return false;

        if (!Array.isArray(response?.data?.items)) {
            throw new Error('Formato de respuesta inesperado');
        }

        renderSaleDetail(response.data);
        if (focus) detailHeading.focus();
        return true;
    } catch (error) {
        if (requestId !== latestDetailRequestId) return false;
        if (error.status === 401) return false;

        detailLoading.hidden = true;
        showDetailError(error.status === 404
            ? 'Esa venta ya no existe. Actualizá el historial e intentá nuevamente.'
            : 'No se pudo cargar el detalle. Revisá tu conexión e intentá nuevamente.');
        console.error('Error al cargar el detalle de la venta:', error);
        return false;
    }
}

function findSale(saleId) {
    return sales.find(sale => String(sale.id) === String(saleId));
}

async function cancelSale(sale, button) {
    if (isCancelling || sale.status !== 'completed') return;
    if (!window.confirm(`¿Anular la venta #${sale.id}? Se repondrá el stock de sus productos.`)) return;

    const shouldRefreshDetail = !detailPanel.hidden && String(selectedSaleId) === String(sale.id);
    isCancelling = true;
    cancellingSaleId = sale.id;
    const row = button.closest('tr');
    row?.querySelectorAll('button').forEach(rowButton => {
        rowButton.disabled = true;
    });
    button.textContent = 'Anulando...';
    clearSalesError();

    try {
        await apiFetch(`/sales/${encodeURIComponent(sale.id)}/cancel`, { method: 'POST' });
        const refreshed = await loadSales({ page: currentPage });

        if (shouldRefreshDetail) {
            await loadSaleDetail(sale.id, { focus: false });
        }

        if (refreshed) {
            setSalesStatus('Venta anulada', 'neutral');
        } else {
            showSalesError('La venta se anuló, pero no se pudo actualizar el historial. Recargá la página para ver el nuevo estado.');
        }

        const detailsButton = [...salesBody.querySelectorAll('button[data-action="details"]')]
            .find(rowButton => rowButton.dataset.id === String(sale.id));
        (detailsButton ?? salesHeading).focus();
    } catch (error) {
        if (error.status === 401) return;

        if (error.status === 409) {
            await loadSales({ page: currentPage });
            if (shouldRefreshDetail) await loadSaleDetail(sale.id, { focus: false });
            showSalesError('La venta ya fue anulada. Se actualizó el historial.');
        } else if (error.status === 404) {
            await loadSales({ page: currentPage });
            if (shouldRefreshDetail) closeSaleDetail({ restoreFocus: false });
            showSalesError('No se encontró esa venta. Se actualizó el historial.');
        } else {
            showSalesError('No se pudo anular la venta. Intentá nuevamente.');
            console.error('Error al anular la venta:', error);
        }
    } finally {
        isCancelling = false;
        cancellingSaleId = null;
        if (row?.isConnected) {
            row.querySelectorAll('button').forEach(rowButton => {
                rowButton.disabled = false;
            });
            const cancelButton = row.querySelector('button[data-action="cancel"]');
            if (cancelButton) cancelButton.textContent = 'Anular';
        }
        const currentButton = [...salesBody.querySelectorAll('button[data-action="cancel"]')]
            .find(rowButton => rowButton.dataset.id === String(sale.id));
        if (currentButton) currentButton.disabled = false;
    }
}

salesBody.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');

    if (!button || !salesBody.contains(button) || button.disabled) return;

    const sale = findSale(button.dataset.id);
    if (!sale) return;

    if (button.dataset.action === 'details') {
        if (String(selectedSaleId) === String(sale.id) && !detailPanel.hidden) {
            closeSaleDetail({ restoreFocus: false });
        } else {
            loadSaleDetail(sale.id);
        }
    } else if (button.dataset.action === 'cancel' && isOwner) {
        cancelSale(sale, button);
    }
});

retrySales.addEventListener('click', () => loadSales({ page: currentPage }));
retrySaleDetail.addEventListener('click', () => {
    if (selectedSaleId) loadSaleDetail(selectedSaleId);
});
closeDetailButton.addEventListener('click', () => closeSaleDetail());

pagination.addEventListener('click', event => {
    const button = event.target.closest('button[data-page]');
    if (!button || button.disabled) return;

    const nextPage = button.dataset.page === 'next' ? currentPage + 1 : currentPage - 1;
    closeSaleDetail({ restoreFocus: false });
    loadSales({ page: nextPage });
});

loadSales({ page: 1 });
