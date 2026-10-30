import '../auth-guard.js';

import { apiFetch, getRole } from '../api.js';
import { renderButton } from '../components/button.js';
import { renderInput } from '../components/input.js';
import { mountNav } from '../layout/nav.js';
import { escapeHtml } from '../utils/escape.js';

const productsHead = document.getElementById('products-head');
const productsHeading = document.getElementById('products-heading');
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
const productForm = document.getElementById('product-form');
const productFormHeading = document.getElementById('product-form-heading');
const productFormDescription = document.getElementById('product-form-description');
const productFields = document.getElementById('product-fields');
const productFormError = document.getElementById('product-form-error');
const productActions = document.getElementById('product-actions');
const stockAdjustmentPanel = document.getElementById('stock-adjustment-panel');
const stockAdjustmentProduct = document.getElementById('stock-adjustment-product');
const stockAdjustmentCurrent = document.getElementById('stock-adjustment-current');
const stockAdjustmentForm = document.getElementById('stock-adjustment-form');
const stockAdjustmentFields = document.getElementById('stock-adjustment-fields');
const stockAdjustmentError = document.getElementById('stock-adjustment-error');
const stockAdjustmentActions = document.getElementById('stock-adjustment-actions');

const perPage = 10;
const isOwner = getRole() === 'owner';
let currentPage = 1;
let lastPage = 1;
let products = [];
let categoriesById = new Map();
let productsLoaded = false;
let includesCostPrice = false;
let requestedPage = 1;
let categories = [];
let categoriesLoaded = false;
let categoriesLoadFailed = false;
let isSubmitting = false;
let editingProduct = null;
let isAdjustingStock = false;
let adjustingProduct = null;
let stockAdjustmentReturnFocusId = null;
let isProductActionPending = false;

mountNav();

if (isOwner) includeInactiveControl.hidden = false;

function emptyProductFormValues() {
    return {
        category_id: '',
        name: '',
        description: '',
        sale_price: '',
        cost_price: '',
        minimum_stock: '',
    };
}

function productFormValues(product) {
    return {
        category_id: String(product.category_id ?? ''),
        name: product.name ?? '',
        description: product.description ?? '',
        sale_price: product.sale_price ?? '',
        cost_price: product.cost_price ?? '',
        minimum_stock: product.minimum_stock ?? '',
    };
}

function readProductFormValues() {
    return Object.fromEntries(
        ['category_id', 'name', 'description', 'sale_price', 'cost_price', 'minimum_stock']
            .map(name => [name, productForm.elements.namedItem(name)?.value ?? '']),
    );
}

function getProductFieldError(errors, name) {
    return errors[name]?.[0] ?? null;
}

function renderCategorySelect(value = '', error = null) {
    const options = categories.length
        ? `<option value="">Seleccioná una categoría</option>${categories.map(category => `
            <option value="${escapeHtml(category.id)}" ${String(category.id) === String(value) ? 'selected' : ''}>${escapeHtml(category.name)}</option>
        `).join('')}`
        : `<option value="">${categoriesLoaded ? 'No hay categorías disponibles' : categoriesLoadFailed ? 'No se pudieron cargar las categorías' : 'Cargando categorías...'}</option>`;

    return `
        <div class="space-y-2" data-product-field>
            <label for="category_id" class="block text-sm font-medium text-ink">Categoría</label>
            <select id="category_id" name="category_id" required ${categories.length ? '' : 'disabled'} ${error ? 'aria-invalid="true" aria-describedby="category_id-error"' : ''} class="block min-h-11 w-full rounded-lg border ${error ? 'border-danger focus:ring-danger/20' : 'border-line focus:ring-brand/20'} bg-white px-3.5 py-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 disabled:cursor-not-allowed disabled:bg-ground">
                ${options}
            </select>
            ${error ? `<p id="category_id-error" class="field-error text-sm text-danger">${escapeHtml(error)}</p>` : ''}
            ${categoriesLoaded && categories.length === 0 ? '<p class="text-sm text-muted">Creá una <a href="/views/categories.html" class="font-medium text-brand underline underline-offset-2">categoría</a> antes de registrar productos.</p>' : ''}
        </div>
    `;
}

function renderProductForm({ values = editingProduct ? productFormValues(editingProduct) : emptyProductFormValues(), errors = {} } = {}) {
    const isEditing = Boolean(editingProduct);
    const fields = [
        `<div id="product-category-field">${renderCategorySelect(values.category_id, getProductFieldError(errors, 'category_id'))}</div>`,
        `<div data-product-field>${renderInput({ id: 'product-name', name: 'name', label: 'Nombre', required: true, value: values.name, maxLength: 255, error: getProductFieldError(errors, 'name'), placeholder: 'Ej. Cinta aisladora', autoComplete: 'off' })}</div>`,
        `<div class="space-y-2" data-product-field>
            <label for="product-description" class="block text-sm font-medium text-ink">Descripción <span class="font-normal text-muted">(opcional)</span></label>
            <textarea id="product-description" name="description" rows="3" ${getProductFieldError(errors, 'description') ? 'aria-invalid="true" aria-describedby="description-error"' : ''} class="block w-full rounded-lg border ${getProductFieldError(errors, 'description') ? 'border-danger focus:ring-danger/20' : 'border-line focus:ring-brand/20'} bg-white px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-2" placeholder="Detalles útiles para identificarlo">${escapeHtml(values.description)}</textarea>
            ${getProductFieldError(errors, 'description') ? `<p id="description-error" class="field-error text-sm text-danger">${escapeHtml(getProductFieldError(errors, 'description'))}</p>` : ''}
        </div>`,
        `<div data-product-field>${renderInput({ id: 'product-sale-price', name: 'sale_price', label: 'Precio de venta', type: 'number', required: true, value: values.sale_price, min: 0, step: 0.01, error: getProductFieldError(errors, 'sale_price'), placeholder: '0,00' })}</div>`,
    ];

    if (isOwner) {
        const costIsRequired = !isEditing || editingProduct.cost_price !== null && editingProduct.cost_price !== undefined;
        fields.push(`<div data-product-field>${renderInput({ id: 'product-cost-price', name: 'cost_price', label: 'Costo', type: 'number', required: costIsRequired, value: values.cost_price, min: 0, step: 0.01, error: getProductFieldError(errors, 'cost_price'), placeholder: costIsRequired ? '0,00' : 'Aún sin registrar' })}</div>`);
    }

    fields.push(`<div data-product-field>${renderInput({ id: 'product-minimum-stock', name: 'minimum_stock', label: 'Stock mínimo', type: 'number', required: true, value: values.minimum_stock, min: 0, step: 1, error: getProductFieldError(errors, 'minimum_stock'), placeholder: '0' })}</div>`);

    productFormHeading.textContent = isEditing ? 'Editar producto' : 'Nuevo producto';
    productFormDescription.textContent = isEditing
        ? 'Actualizá los datos del producto. El stock actual se gestiona con ajustes de inventario.'
        : 'Completá los datos para incorporarlo al inventario.';
    productFields.innerHTML = fields.join('');
    renderProductSubmitButton();
}

function renderProductSubmitButton({ loading = false } = {}) {
    const isEditing = Boolean(editingProduct);
    const submitButton = renderButton({
        id: 'product-submit-button',
        text: isEditing ? 'Guardar cambios' : 'Crear producto',
        type: 'submit',
        loading,
        loadingText: isEditing ? 'Guardando...' : 'Creando...',
        disabled: isAdjustingStock || isProductActionPending || !categoriesLoaded || categories.length === 0,
        className: 'w-full min-h-11 rounded-lg py-3',
    });
    const cancelButton = isEditing
        ? renderButton({
            id: 'product-cancel-button',
            text: 'Cancelar',
            variant: 'secondary',
            disabled: loading,
            className: 'w-full min-h-11 rounded-lg py-3',
        })
        : '';

    productActions.innerHTML = `${submitButton}${cancelButton}`;
    productActions.querySelector('#product-cancel-button')?.addEventListener('click', cancelEditing);
}

function renderStockAdjustmentForm({ values = { quantity: '', reason: '' }, errors = {} } = {}) {
    if (!adjustingProduct) return;

    const currentStock = Number(adjustingProduct.current_stock);
    const quantityError = getProductFieldError(errors, 'quantity');
    const reasonError = getProductFieldError(errors, 'reason');
    stockAdjustmentProduct.textContent = adjustingProduct.name;
    stockAdjustmentCurrent.textContent = formatNumber(currentStock);
    stockAdjustmentFields.innerHTML = `
        <div data-product-field>${renderInput({ id: 'stock-adjustment-quantity', name: 'quantity', label: 'Cantidad a ajustar', type: 'number', required: true, value: values.quantity, min: -Math.max(0, currentStock), step: 1, error: quantityError, placeholder: 'Ej. 12 o -3' })}</div>
        <div data-product-field>${renderInput({ id: 'stock-adjustment-reason', name: 'reason', label: 'Motivo', required: true, value: values.reason, maxLength: 255, error: reasonError, placeholder: 'Ej. Reposición o merma', autoComplete: 'off' })}</div>
    `;
    renderStockAdjustmentButtons();
}

function renderStockAdjustmentButtons({ loading = false } = {}) {
    stockAdjustmentActions.innerHTML = `
        ${renderButton({ id: 'stock-adjustment-submit', text: 'Guardar ajuste', type: 'submit', loading, loadingText: 'Guardando...', className: 'min-h-11 rounded-lg py-3' })}
        ${renderButton({ id: 'stock-adjustment-cancel', text: 'Cancelar', variant: 'secondary', disabled: loading, className: 'min-h-11 rounded-lg py-3' })}
    `;
    stockAdjustmentActions.querySelector('#stock-adjustment-cancel')?.addEventListener('click', cancelStockAdjustment);
}

function clearStockAdjustmentError() {
    stockAdjustmentError.textContent = '';
    stockAdjustmentError.hidden = true;
}

function showStockAdjustmentError(message) {
    stockAdjustmentError.textContent = message;
    stockAdjustmentError.hidden = false;
}

function startStockAdjustment(product) {
    adjustingProduct = product;
    stockAdjustmentReturnFocusId = String(product.id);
    clearStockAdjustmentError();
    stockAdjustmentPanel.hidden = false;
    renderStockAdjustmentForm();
    document.getElementById('stock-adjustment-quantity')?.focus();
}

function focusStockAdjustmentTrigger(productId) {
    const trigger = [...productsBody.querySelectorAll('button[data-action="stock-adjust"]')]
        .find(button => button.dataset.id === String(productId));

    (trigger ?? productsHeading).focus();
}

function cancelStockAdjustment() {
    const productId = stockAdjustmentReturnFocusId;
    adjustingProduct = null;
    stockAdjustmentPanel.hidden = true;
    clearStockAdjustmentError();
    stockAdjustmentForm.reset();

    if (productId) focusStockAdjustmentTrigger(productId);
}

function focusProductAction(productId, action) {
    const trigger = [...productsBody.querySelectorAll('button[data-action]')]
        .find(button => button.dataset.id === String(productId) && button.dataset.action === action);

    if (trigger && !trigger.disabled) {
        trigger.focus();
    } else {
        productsHeading.focus();
    }
}

async function loadProductsAfterRowAction() {
    const refreshed = await loadProducts({ page: currentPage });

    if (refreshed && currentPage > lastPage) {
        return loadProducts({ page: lastPage });
    }

    return refreshed;
}

async function runProductAction(product, {
    request,
    successMessage,
    focusAction = null,
    conflictMessage = 'No se pudo completar la acción porque el producto tiene movimientos asociados.',
} = {}) {
    if (isProductActionPending || isSubmitting || isAdjustingStock) return;

    isProductActionPending = true;
    setProductRowBusy(product.id, true);
    setListLoading(true);
    renderProductSubmitButton();

    try {
        await request();
        const refreshed = await loadProductsAfterRowAction();

        if (refreshed) {
            setProductsStatus(successMessage, 'neutral');
            if (focusAction) {
                focusProductAction(product.id, focusAction);
            } else {
                productsHeading.focus();
            }
        } else {
            showProductsError(`${successMessage}, pero no se pudo actualizar la lista. Volvé a intentar para verla.`);
            retryProducts.focus();
        }
    } catch (error) {
        if (error.status === 401) return;

        if (error.status === 409) {
            showProductsError(conflictMessage);
            productsAlert.focus();
        } else if (error.status === 404) {
            const refreshed = await loadProductsAfterRowAction();
            showProductsError(refreshed
                ? 'Ese producto ya no existe.'
                : 'Ese producto ya no existe. No se pudo actualizar la lista; volvé a intentar.');
            productsAlert.focus();
        } else {
            showProductsError('No se pudo completar la acción. Revisá tu conexión e intentá nuevamente.');
            productsAlert.focus();
            console.error('Error al actualizar el estado del producto:', error);
        }
    } finally {
        isProductActionPending = false;
        setProductRowBusy(product.id, false);
        setListLoading(false);
        renderProductSubmitButton();
    }
}

function toggleProductActive(product) {
    const active = !Boolean(product.active);

    return runProductAction(product, {
        request: () => apiFetch(`/products/${encodeURIComponent(product.id)}`, {
            method: 'PATCH',
            body: JSON.stringify({ active }),
        }),
        successMessage: active ? 'Producto activado' : 'Producto desactivado',
        focusAction: 'toggle-active',
    });
}

function deleteProduct(product) {
    const confirmed = window.confirm(`¿Eliminar el producto ${product.name}? Si tiene ventas o movimientos de stock asociados, no se podrá eliminar.`);

    if (!confirmed) return;

    return runProductAction(product, {
        request: () => apiFetch(`/products/${encodeURIComponent(product.id)}`, { method: 'DELETE' }),
        successMessage: 'Producto eliminado',
        conflictMessage: 'El producto tiene ventas o movimientos de stock asociados. Desactivalo para ocultarlo sin perder su historial.',
    });
}

function startEditing(product) {
    editingProduct = product;
    clearProductFormError();
    clearProductsError();
    renderProductForm({ values: productFormValues(product) });
    focusProductField('name');
}

function cancelEditing() {
    editingProduct = null;
    clearProductFormError();
    renderProductForm({ values: emptyProductFormValues() });
    focusProductField('name');
}

async function refreshProductsAfterChange(successMessage, {
    page = 1,
    successAlert = null,
    refreshFailureMessage = null,
} = {}) {
    const refreshed = await loadProducts({ page });

    if (refreshed) {
        setProductsStatus(successMessage, 'neutral');
        if (successAlert) showProductsError(successAlert);
        return true;
    }

    showProductsError(refreshFailureMessage ?? `${successMessage}, pero no se pudo actualizar la lista. Volvé a intentar para verla.`);
    return false;
}

function clearProductFormError() {
    productFormError.textContent = '';
    productFormError.hidden = true;
}

function showProductFormError(message) {
    productFormError.textContent = message;
    productFormError.hidden = false;
}

function focusProductField(name) {
    const ids = {
        category_id: 'category_id',
        name: 'product-name',
        description: 'product-description',
        sale_price: 'product-sale-price',
        cost_price: 'product-cost-price',
        minimum_stock: 'product-minimum-stock',
    };

    document.getElementById(ids[name] ?? 'product-name')?.focus();
}

function clearProductFieldError(target) {
    const field = target.closest('[data-product-field]');

    if (!field) return;

    const error = field.querySelector('.field-error');
    const input = field.querySelector('[aria-invalid="true"]');

    if (!error || !input) return;

    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
    input.classList.remove('border-danger', 'focus:ring-danger/20');
    input.classList.add('border-line', 'focus:ring-brand/20');
    error.remove();
}

async function saveProduct(event) {
    event.preventDefault();

    if (isSubmitting || isAdjustingStock || isProductActionPending || !categoriesLoaded || categories.length === 0) return;

    const values = readProductFormValues();
    const targetProduct = editingProduct;
    const isEditing = Boolean(targetProduct);
    const payload = {
        category_id: values.category_id,
        name: values.name.trim(),
        description: values.description.trim() || null,
        sale_price: values.sale_price,
        minimum_stock: values.minimum_stock,
    };

    clearProductFormError();
    clearProductsError();
    clearCategoriesError();

    if (!payload.name) {
        renderProductForm({ values, errors: { name: ['El nombre es obligatorio.'] } });
        focusProductField('name');
        return;
    }

    if (isOwner) {
        const costIsRequired = !isEditing || targetProduct.cost_price !== null && targetProduct.cost_price !== undefined;

        if (costIsRequired && values.cost_price === '') {
            renderProductForm({ values, errors: { cost_price: ['El costo es obligatorio.'] } });
            focusProductField('cost_price');
            return;
        }

        if (values.cost_price !== '') {
            payload.cost_price = values.cost_price;
        }

        const comparisonCost = values.cost_price !== ''
            ? Number(values.cost_price)
            : Number(targetProduct?.cost_price);

        if (values.sale_price !== '' && Number.isFinite(comparisonCost) && Number(values.sale_price) < comparisonCost) {
            renderProductForm({ values, errors: { sale_price: ['El precio de venta debe ser mayor o igual al costo.'] } });
            focusProductField('sale_price');
            return;
        }
    }

    isSubmitting = true;
    renderProductSubmitButton({ loading: true });

    try {
        await apiFetch(isEditing ? `/products/${encodeURIComponent(targetProduct.id)}` : '/products', {
            method: isEditing ? 'PUT' : 'POST',
            body: JSON.stringify(payload),
        });

        const currentValues = readProductFormValues();
        const formChangedWhileSubmitting = Object.entries(values)
            .some(([name, value]) => currentValues[name] !== value);
        editingProduct = null;
        renderProductForm({ values: formChangedWhileSubmitting ? currentValues : emptyProductFormValues() });
        clearProductFormError();
        const successMessage = isEditing ? 'Cambios guardados' : 'Producto creado';
        await refreshProductsAfterChange(successMessage, {
            page: isEditing ? currentPage : 1,
            refreshFailureMessage: isEditing
                ? 'Los cambios se guardaron, pero no se pudo actualizar la lista. Volvé a intentar para verla.'
                : 'El producto se creó, pero no se pudo actualizar la lista. Volvé a intentar para verlo.',
        });

        focusProductField('name');
    } catch (error) {
        if (error.status === 401) return;

        if (error.status === 404 && targetProduct) {
            editingProduct = null;
            renderProductForm({ values: emptyProductFormValues() });
            await refreshProductsAfterChange('Ese producto ya no existe', {
                page: currentPage,
                successAlert: 'Ese producto ya no existe.',
                refreshFailureMessage: 'Ese producto ya no existe. No se pudo actualizar la lista; volvé a intentar.',
            });
            focusProductField('name');
            return;
        }

        if (error.status === 422 && error.data?.errors) {
            const errors = error.data.errors;
            const currentValues = readProductFormValues();
            renderProductForm({ values: currentValues, errors });
            const firstInvalidField = ['category_id', 'name', 'description', 'sale_price', 'cost_price', 'minimum_stock']
                .find(name => getProductFieldError(errors, name));
            focusProductField(firstInvalidField);
        } else {
            showProductFormError(isEditing
                ? 'No se pudieron guardar los cambios. Revisá los datos e intentá nuevamente.'
                : 'No se pudo crear el producto. Revisá los datos e intentá nuevamente.');
            focusProductField('name');
            console.error(isEditing ? 'Error al actualizar el producto:' : 'Error al crear el producto:', error);
        }
    } finally {
        isSubmitting = false;
        renderProductSubmitButton();
    }
}

function readStockAdjustmentValues() {
    return {
        quantity: stockAdjustmentForm.elements.namedItem('quantity')?.value ?? '',
        reason: stockAdjustmentForm.elements.namedItem('reason')?.value ?? '',
    };
}

async function submitStockAdjustment(event) {
    event.preventDefault();

    if (isAdjustingStock || isProductActionPending || !adjustingProduct) return;

    const values = readStockAdjustmentValues();
    const quantity = Number(values.quantity);
    const reason = values.reason.trim();
    const currentStock = Number(adjustingProduct.current_stock);

    clearStockAdjustmentError();

    if (values.quantity === '' || !Number.isInteger(quantity) || quantity === 0) {
        renderStockAdjustmentForm({ values, errors: { quantity: ['Ingresá una cantidad entera distinta de cero.'] } });
        document.getElementById('stock-adjustment-quantity')?.focus();
        return;
    }

    if (currentStock + quantity < 0) {
        renderStockAdjustmentForm({ values, errors: { quantity: ['La cantidad a retirar supera el stock disponible.'] } });
        document.getElementById('stock-adjustment-quantity')?.focus();
        return;
    }

    if (!reason) {
        renderStockAdjustmentForm({ values, errors: { reason: ['El motivo es obligatorio.'] } });
        document.getElementById('stock-adjustment-reason')?.focus();
        return;
    }

    isAdjustingStock = true;
    const productId = adjustingProduct.id;
    setProductRowBusy(productId, true);
    setListLoading(true);
    renderProductSubmitButton();
    renderStockAdjustmentButtons({ loading: true });

    try {
        await apiFetch(`/products/${encodeURIComponent(productId)}/stock-adjustments`, {
            method: 'POST',
            body: JSON.stringify({ quantity, reason }),
        });

        adjustingProduct = null;
        stockAdjustmentPanel.hidden = true;
        stockAdjustmentForm.reset();
        clearStockAdjustmentError();
        const refreshed = await loadProducts({ page: currentPage });

        if (refreshed) {
            setProductsStatus('Stock actualizado', 'neutral');
            setProductRowBusy(productId, false);
            focusStockAdjustmentTrigger(productId);
        } else {
            showProductsError('El ajuste se guardó, pero no se pudo actualizar la lista. Volvé a intentar para ver el stock actualizado.');
            retryProducts.focus();
        }
    } catch (error) {
        if (error.status === 401) return;

        if (error.status === 409) {
            showStockAdjustmentError('El ajuste dejaría el stock por debajo de cero. Revisá la cantidad ingresada.');
            document.getElementById('stock-adjustment-quantity')?.focus();
        } else if (error.status === 404) {
            const productId = adjustingProduct.id;
            adjustingProduct = null;
            stockAdjustmentPanel.hidden = true;

            if (String(editingProduct?.id) === String(productId)) {
                editingProduct = null;
                renderProductForm({ values: emptyProductFormValues() });
            }

            const refreshed = await loadProducts({ page: currentPage });
            showProductsError(refreshed
                ? 'Ese producto ya no existe.'
                : 'Ese producto ya no existe. No se pudo actualizar la lista; volvé a intentar.');
            retryProducts.focus();
        } else if (error.status === 422 && error.data?.errors) {
            const errors = error.data.errors;
            renderStockAdjustmentForm({ values: readStockAdjustmentValues(), errors });
            document.getElementById(errors.quantity ? 'stock-adjustment-quantity' : 'stock-adjustment-reason')?.focus();
        } else {
            showStockAdjustmentError('No se pudo ajustar el stock. Revisá los datos e intentá nuevamente.');
            document.getElementById('stock-adjustment-quantity')?.focus();
            console.error('Error al ajustar el stock del producto:', error);
        }
    } finally {
        isAdjustingStock = false;
        setProductRowBusy(productId, false);
        setListLoading(false);
        renderProductSubmitButton();
        if (stockAdjustmentPanel && !stockAdjustmentPanel.hidden && adjustingProduct) {
            renderStockAdjustmentButtons();
        }
    }
}

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
    const columnCount = includesCostPrice ? 7 : 6;
    productsBody.innerHTML = `
        <tr>
            <td colspan="${columnCount}" class="px-5 py-12 text-center text-sm text-muted sm:px-6">${escapeHtml(message)}</td>
        </tr>
    `;
}

function setListLoading(loading) {
    const disabled = loading || isAdjustingStock || isProductActionPending;
    pagination.querySelectorAll('button[data-page]').forEach(button => {
        button.disabled = disabled || (button.dataset.page === 'previous' ? currentPage <= 1 : currentPage >= lastPage);
    });
    if (isOwner) includeInactive.disabled = disabled;
}

function setProductRowBusy(productId, busy) {
    const row = [...productsBody.querySelectorAll('button[data-id]')]
        .find(button => button.dataset.id === String(productId))
        ?.closest('tr');

    row?.querySelectorAll('button[data-action]').forEach(button => {
        button.disabled = busy;
    });
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
        '<th scope="col" class="px-5 py-3.5 sm:px-6">Acciones</th>',
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
        const activeActionLabel = isActive ? 'Desactivar' : 'Activar';
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
        const ownerActions = isOwner ? `
            <button type="button" data-action="toggle-active" data-id="${escapeHtml(product.id)}" aria-label="${activeActionLabel} ${escapeHtml(product.name)}" class="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand/10 focus:outline-none focus:ring-2 focus:ring-brand">${activeActionLabel}</button>
            <button type="button" data-action="delete" data-id="${escapeHtml(product.id)}" aria-label="Eliminar ${escapeHtml(product.name)}" class="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger">Eliminar</button>
        ` : '';

        return `
            <tr class="transition-colors hover:bg-ground/60">
                <th scope="row" class="px-5 py-4 font-medium text-ink sm:px-6">${escapeHtml(product.name)}</th>
                <td class="px-5 py-4 text-muted sm:px-6">${escapeHtml(categoryName(product))}</td>
                <td class="px-5 py-4 tabular-nums text-ink sm:px-6">${escapeHtml(formatCurrency(product.sale_price))}</td>
                ${costCell}
                <td class="px-5 py-4 tabular-nums text-ink sm:px-6">${escapeHtml(formatNumber(product.current_stock))}</td>
                <td class="px-5 py-4 sm:px-6">${statusLabel}</td>
                <td class="px-5 py-4 sm:px-6">
                    <button type="button" data-action="edit" data-id="${escapeHtml(product.id)}" aria-label="Editar ${escapeHtml(product.name)}" class="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand/10 focus:outline-none focus:ring-2 focus:ring-brand">Editar</button>
                    <button type="button" data-action="stock-adjust" data-id="${escapeHtml(product.id)}" aria-label="Ajustar stock de ${escapeHtml(product.name)}" class="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand/10 focus:outline-none focus:ring-2 focus:ring-brand">Ajustar stock</button>
                    ${ownerActions}
                </td>
            </tr>
        `;
    }).join('');
    setProductsStatus('', 'neutral');
}

productsBody.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');

    if (!button || !productsBody.contains(button) || isSubmitting || isAdjustingStock || isProductActionPending) return;

    const product = products.find(item => String(item.id) === button.dataset.id);

    if (!product) return;

    if (button.dataset.action === 'edit') {
        startEditing(product);
    } else if (button.dataset.action === 'stock-adjust') {
        startStockAdjustment(product);
    } else if (button.dataset.action === 'toggle-active' && isOwner) {
        toggleProductActive(product);
    } else if (button.dataset.action === 'delete' && isOwner) {
        deleteProduct(product);
    }
});

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
        return true;
    } catch (error) {
        if (error.status === 401) return false;

        productsLoaded = false;
        productsCount.textContent = '— productos';
        paginationSummary.textContent = 'No se pudo cargar el total';
        setProductsStatus('Error al cargar', 'error');
        renderTableMessage('No se pudieron cargar los productos.');
        showProductsError('Revisá tu conexión e intentá nuevamente.');
        console.error('Error al cargar los productos:', error);
        return false;
    } finally {
        setListLoading(false);
    }
}

async function loadCategories() {
    clearCategoriesError();
    categoriesLoadFailed = false;

    try {
        const response = await apiFetch('/categories');

        if (!Array.isArray(response?.data)) {
            throw new Error('Formato de categorías inesperado');
        }

        const categorySelect = document.getElementById('category_id');
        const selectedCategory = categorySelect?.value ?? '';
        const categoryHadFocus = document.activeElement === categorySelect;
        categories = response.data;
        categoriesById = new Map(categories.map(category => [String(category.id), category.name]));
        categoriesLoaded = true;
        document.getElementById('product-category-field').innerHTML = renderCategorySelect(selectedCategory);
        if (categoryHadFocus) document.getElementById('category_id')?.focus();
        renderProductSubmitButton();
        if (productsLoaded) renderProducts();
    } catch (error) {
        if (error.status === 401) return;

        categoriesLoaded = false;
        categoriesLoadFailed = true;
        const categorySelect = document.getElementById('category_id');
        document.getElementById('product-category-field').innerHTML = renderCategorySelect(categorySelect?.value ?? '');
        renderProductSubmitButton();
        showCategoriesError('No se pudieron cargar los nombres de las categorías. Podés reintentar sin perder la lista de productos.');
        console.error('Error al cargar las categorías de productos:', error);
    }
}

productForm.addEventListener('input', event => {
    clearProductFormError();
    clearProductFieldError(event.target);
});

productForm.addEventListener('change', event => {
    clearProductFormError();
    clearProductFieldError(event.target);
});

productForm.addEventListener('submit', saveProduct);
stockAdjustmentForm.addEventListener('input', event => {
    clearStockAdjustmentError();
    clearProductFieldError(event.target);
});
stockAdjustmentForm.addEventListener('change', event => {
    clearStockAdjustmentError();
    clearProductFieldError(event.target);
});
stockAdjustmentForm.addEventListener('submit', submitStockAdjustment);
retryProducts.addEventListener('click', () => loadProducts({ page: requestedPage }));
retryCategories.addEventListener('click', loadCategories);
includeInactive.addEventListener('change', () => loadProducts({ page: 1 }));

pagination.addEventListener('click', event => {
    const button = event.target.closest('button[data-page]');

    if (!button || button.disabled) return;

    const nextPage = button.dataset.page === 'next' ? currentPage + 1 : currentPage - 1;
    loadProducts({ page: nextPage });
});

renderProductForm();
loadCategories();
loadProducts({ page: 1 });
