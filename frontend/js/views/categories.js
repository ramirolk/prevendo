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
const categorySubmit = document.getElementById('category-submit');

let isSubmitting = false;
let currentEditingCategory = null;

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
            <td colspan="2" class="px-5 py-12 text-center sm:px-6">
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

function renderCategories(categories) {
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
        </tr>
    `).join('');
}

function renderCategorySubmitButton({ editing = null, loading = false } = {}) {
    const isEditing = Boolean(editing);

    categorySubmit.innerHTML = renderButton({
        id: 'category-submit-button',
        text: isEditing ? 'Guardar cambios' : 'Crear categoría',
        type: 'submit',
        loading,
        loadingText: isEditing ? 'Guardando...' : 'Creando...',
        className: 'w-full min-h-11 rounded-lg py-3',
    });
}

function renderCategoryForm(options = {}) {
    const { editing = null, value = '', error = null, loading = false } = options;
    const isEditing = Boolean(editing);
    currentEditingCategory = editing;
    const inputValue = Object.prototype.hasOwnProperty.call(options, 'value')
        ? value
        : editing?.name ?? '';

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

    renderCategorySubmitButton({ editing, loading });
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
        await apiFetch('/categories', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });

        document.getElementById('category-name').value = '';
        const refreshed = await loadCategories({ silent: true });
        // El alta fue exitosa aunque la lista no haya podido actualizarse.
        setStatus('Categoría creada', 'neutral');

        if (!refreshed) {
            showCategoryFormError('La categoría se creó, pero no se pudo actualizar la lista. Recargá la página para verla.');
        }

        focusCategoryName();
    } catch (error) {
        if (error.status === 401) return;

        const nameError = error.status === 422 ? error.data?.errors?.name?.[0] : null;

        if (nameError) {
            const currentValue = document.getElementById('category-name').value;
            renderCategoryForm({ value: currentValue, error: nameError });
            focusCategoryName();
        } else {
            showCategoryFormError('No se pudo crear la categoría. Revisá los datos e intentá nuevamente.');
            focusCategoryName();
            console.error('Error al crear la categoría:', error);
        }
    } finally {
        isSubmitting = false;
        renderCategorySubmitButton({ editing: currentEditingCategory });
    }
});

renderCategoryForm();
loadCategories();
