import '../auth-guard.js';

import { apiFetch } from '../api.js';
import { renderButton } from '../components/button.js';
import { renderInput } from '../components/input.js';
import { mountNav } from '../layout/nav.js';
import { escapeHtml } from '../utils/escape.js';

const categoriesBody = document.getElementById('categories-body');
const categoriesCount = document.getElementById('categories-count');
const categoriesStatus = document.getElementById('categories-status');
const categoryForm = document.getElementById('category-form');
const categoryFormHeading = document.getElementById('category-form-heading');
const categoryFields = document.getElementById('category-fields');
const categoryFormError = document.getElementById('category-form-error');
const categoryActions = document.getElementById('category-actions');

let isSubmitting = false;
let editingCategory = null;
let categories = [];

mountNav();

function setStatus(message, tone = 'neutral') {
    const tones = {
        neutral: 'text-muted',
        error: 'text-danger',
    };

    categoriesStatus.className = `text-xs font-medium ${tones[tone]}`;
    categoriesStatus.textContent = message;
}

function renderMessage(message, { error = false, invite = false } = {}) {
    categoriesBody.innerHTML = `
        <tr>
            <td colspan="3" class="px-5 py-12 text-center sm:px-6">
                <p class="text-sm ${error ? 'text-danger' : 'text-muted'}">${escapeHtml(message)}</p>
                ${invite ? '<p class="mt-1 text-sm text-muted">Creá la primera para empezar a organizar los productos de tu comercio.</p>' : ''}
                ${error ? '<button id="retry-categories" type="button" class="mt-3 rounded-lg px-3 py-2 text-sm font-semibold text-brand hover:bg-brand/10 focus:outline-none focus:ring-2 focus:ring-brand">Volver a intentar</button>' : ''}
            </td>
        </tr>
    `;

    if (error) {
        categoriesBody.querySelector('#retry-categories').addEventListener('click', () => loadCategories());
    }
}

function formatDate(value) {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '—';

    return new Intl.DateTimeFormat('es-AR', {
        dateStyle: 'medium',
    }).format(date);
}

function renderCategories(categoryList) {
    categories = categoryList;
    const count = categories.length;
    categoriesCount.textContent = `${count.toLocaleString('es-AR')} ${count === 1 ? 'categoría' : 'categorías'}`;

    if (count === 0) {
        setStatus('', 'neutral');
        renderMessage('Todavía no hay categorías.', { invite: true });
        return;
    }

    setStatus('', 'neutral');
    categoriesBody.innerHTML = categories.map(category => `
        <tr class="transition-colors hover:bg-ground/60">
            <th scope="row" class="px-5 py-4 font-medium text-ink sm:px-6">${escapeHtml(category.name)}</th>
            <td class="px-5 py-4 text-muted sm:px-6">${escapeHtml(formatDate(category.created_at))}</td>
            <td class="px-5 py-4 sm:px-6">
                <button type="button" data-action="edit" data-id="${escapeHtml(category.id)}" aria-label="Editar ${escapeHtml(category.name)}" class="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium text-brand hover:bg-brand/10 focus:outline-none focus:ring-2 focus:ring-brand">
                    Editar
                </button>
            </td>
        </tr>
    `).join('');
}

categoriesBody.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');

    if (!button || !categoriesBody.contains(button)) return;

    if (button.dataset.action === 'edit') {
        const category = categories.find(item => String(item.id) === button.dataset.id);

        if (category) startEditing(category);
    }
});

function renderCategorySubmitButton({ loading = false, loadingText = null } = {}) {
    const isEditing = Boolean(editingCategory);
    const submitButton = renderButton({
        id: 'category-submit-button',
        text: isEditing ? 'Guardar cambios' : 'Crear categoría',
        type: 'submit',
        loading,
        loadingText: loadingText ?? (isEditing ? 'Guardando...' : 'Creando...'),
        className: 'w-full min-h-11 rounded-lg py-3',
    });

    const cancelButton = isEditing
        ? renderButton({
            id: 'category-cancel-button',
            text: 'Cancelar',
            variant: 'secondary',
            disabled: loading,
            className: 'w-full min-h-11 rounded-lg py-3',
        })
        : '';

    categoryActions.innerHTML = `${submitButton}${cancelButton}`;
    categoryActions.querySelector('#category-cancel-button')?.addEventListener('click', cancelEditing);
}

function renderCategoryForm(options = {}) {
    const { value = '', error = null, loading = false } = options;
    const isEditing = Boolean(editingCategory);
    const inputValue = Object.prototype.hasOwnProperty.call(options, 'value')
        ? value
        : editingCategory?.name ?? '';

    categoryFormHeading.textContent = isEditing ? 'Editar categoría' : 'Nueva categoría';
    categoryFields.innerHTML = renderInput({
        id: 'category-name',
        label: 'Nombre',
        required: true,
        error,
        value: inputValue,
        maxLength: 255,
        placeholder: 'Ej. Ferretería',
        autoComplete: 'off',
    });

    renderCategorySubmitButton({ loading });
}

function startEditing(category) {
    editingCategory = category;
    clearCategoryFormError();
    clearCategoryFieldError();
    renderCategoryForm();
    focusCategoryName();
}

function cancelEditing() {
    editingCategory = null;
    clearCategoryFormError();
    renderCategoryForm();
    focusCategoryName();
}

function focusCategoryName() {
    const input = document.getElementById('category-name');

    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
}

function showCategoryFormError(message) {
    categoryFormError.textContent = message;
    categoryFormError.hidden = false;
}

function clearCategoryFormError() {
    categoryFormError.textContent = '';
    categoryFormError.hidden = true;
}

function clearCategoryFieldError() {
    const input = document.getElementById('category-name');

    if (!input) return;

    const errorId = input.getAttribute('aria-describedby');

    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
    input.classList.remove('border-danger', 'focus:ring-danger/20');
    input.classList.add('border-line', 'focus:ring-brand/20');
    if (errorId) document.getElementById(errorId)?.remove();
}

async function loadCategories({ silent = false } = {}) {
    if (!silent) {
        categoriesCount.textContent = '— categorías';
        setStatus('Cargando', 'neutral');
        renderMessage('Cargando categorías...');
    }

    try {
        const response = await apiFetch('/categories');

        if (!Array.isArray(response?.data)) {
            throw new Error('Formato de respuesta inesperado');
        }

        renderCategories(response.data);
        return true;
    } catch (error) {
        if (error.status === 401) return false;

        setStatus('Error al cargar', 'error');
        if (!silent) {
            categoriesCount.textContent = '— categorías';
            renderMessage('No se pudieron cargar las categorías. Revisá tu conexión e intentá nuevamente.', { error: true });
        }
        console.error('Error al cargar las categorías:', error);
        return false;
    }
}

categoryForm.addEventListener('input', () => {
    clearCategoryFormError();
    clearCategoryFieldError();
});

categoryForm.addEventListener('submit', async event => {
    event.preventDefault();

    if (isSubmitting) return;

    const rawName = document.getElementById('category-name').value;
    const name = rawName.trim();
    const targetCategory = editingCategory;
    const isEditing = Boolean(targetCategory);

    clearCategoryFormError();
    clearCategoryFieldError();
    setStatus('', 'neutral');

    if (!name) {
        renderCategoryForm({ value: rawName, error: 'El nombre es obligatorio.' });
        focusCategoryName();
        return;
    }

    isSubmitting = true;
    renderCategorySubmitButton({ loading: true });

    try {
        await apiFetch(isEditing ? `/categories/${encodeURIComponent(targetCategory.id)}` : '/categories', {
            method: isEditing ? 'PUT' : 'POST',
            body: JSON.stringify({ name }),
        });

        editingCategory = null;
        categoryFormHeading.textContent = 'Nueva categoría';
        document.getElementById('category-name').value = '';
        renderCategorySubmitButton({ loading: true, loadingText: 'Actualizando...' });
        const refreshed = await loadCategories({ silent: true });
        // El cambio se guardó aunque la lista no haya podido actualizarse.
        setStatus(isEditing ? 'Cambios guardados' : 'Categoría creada', 'neutral');

        if (!refreshed) {
            const action = isEditing ? 'Los cambios se guardaron' : 'La categoría se creó';
            showCategoryFormError(`${action}, pero no se pudo actualizar la lista. Recargá la página para verla.`);
        }

        focusCategoryName();
    } catch (error) {
        if (error.status === 401) return;

        if (error.status === 404 && targetCategory) {
            editingCategory = null;
            categoryFormHeading.textContent = 'Nueva categoría';
            renderCategorySubmitButton({ loading: true, loadingText: 'Actualizando lista...' });
            const refreshed = await loadCategories({ silent: true });
            showCategoryFormError(refreshed
                ? 'Esa categoría ya no existe.'
                : 'Esa categoría ya no existe. No se pudo actualizar la lista; recargá la página.');
            focusCategoryName();
            return;
        }

        const nameError = error.status === 422 ? error.data?.errors?.name?.[0] : null;

        if (nameError) {
            const currentValue = document.getElementById('category-name').value;
            renderCategoryForm({ value: currentValue, error: nameError });
            focusCategoryName();
        } else {
            showCategoryFormError(isEditing
                ? 'No se pudieron guardar los cambios. Revisá los datos e intentá nuevamente.'
                : 'No se pudo crear la categoría. Revisá los datos e intentá nuevamente.');
            focusCategoryName();
            console.error(isEditing ? 'Error al actualizar la categoría:' : 'Error al crear la categoría:', error);
        }
    } finally {
        isSubmitting = false;
        renderCategorySubmitButton();
    }
});

renderCategoryForm();
loadCategories();
