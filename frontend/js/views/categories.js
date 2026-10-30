import '../auth-guard.js';

import { apiFetch } from '../api.js';
import { mountNav } from '../layout/nav.js';
import { escapeHtml } from '../utils/escape.js';

const categoriesBody = document.getElementById('categories-body');
const categoriesCount = document.getElementById('categories-count');
const categoriesStatus = document.getElementById('categories-status');

mountNav();

function setStatus(message, tone = 'neutral') {
    const tones = {
        neutral: 'text-muted',
        success: 'text-brand',
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
        categoriesBody.querySelector('#retry-categories').addEventListener('click', loadCategories);
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
        setStatus('Sin categorías', 'neutral');
        renderMessage('Todavía no hay categorías.', { invite: true });
        return;
    }

    setStatus('Lista actualizada', 'success');
    categoriesBody.innerHTML = categories.map(category => `
        <tr class="transition-colors hover:bg-ground/60">
            <th scope="row" class="px-5 py-4 font-medium text-ink sm:px-6">${escapeHtml(category.name)}</th>
            <td class="px-5 py-4 text-muted sm:px-6">${escapeHtml(formatDate(category.created_at))}</td>
        </tr>
    `).join('');
}

async function loadCategories() {
    categoriesCount.textContent = '— categorías';
    categoriesStatus.className = 'text-xs font-medium text-muted';
    setStatus('Cargando categorías', 'neutral');
    renderMessage('Cargando categorías...');

    try {
        const response = await apiFetch('/categories');

        if (!Array.isArray(response?.data)) {
            throw new Error('Formato de respuesta inesperado');
        }

        renderCategories(response.data);
    } catch (error) {
        if (error.status === 401) return;

        categoriesCount.textContent = '— categorías';
        setStatus('Error al cargar', 'error');
        renderMessage('No se pudieron cargar las categorías. Revisá tu conexión e intentá nuevamente.', { error: true });
        console.error('Error al cargar las categorías:', error);
    }
}

loadCategories();
