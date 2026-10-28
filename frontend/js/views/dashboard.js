import '../auth-guard.js';

import {apiFetch} from '../api.js';
import {mountNav} from '../layout/nav.js';
import {escapeHtml} from '../utils/escape.js';

const lowStockBody = document.getElementById('low-stock-body');

mountNav();

function renderMessage(message) {
    lowStockBody.innerHTML = `
        <tr>
            <td colspan="3" class="px-4 py-6 text-center text-gray-600">
                ${escapeHtml(message)}
            </td>
        </tr>
    `;
}

function renderProducts(products) {
    if (products.length === 0) {
        renderMessage('No hay productos con stock bajo.');
        return;
    }

    lowStockBody.innerHTML = products.map(product => `
        <tr class="border-b last:border-b-0 hover:bg-gray-50">
            <td class="px-4 py-3 font-medium text-gray-900">
                ${escapeHtml(product.name)}
            </td>

            <td class="px-4 py-3">
                ${escapeHtml(product.current_stock)}
            </td>

            <td class="px-4 py-3">
                ${escapeHtml(product.minimum_stock)}
            </td>
        </tr>
    `).join('');
}

async function loadLowStock() {
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

        renderMessage(
            'No se pudo cargar el reporte de stock bajo. Intenta nuevamente.'
        );

        console.error('Error al cargar el reporte de stock bajo:', error);
    }
}

loadLowStock();
