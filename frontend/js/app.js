import { apiFetch } from './api.js';

async function loadProducts() {
    try {
        const data = await apiFetch('/products');

        console.log(data);
    } catch (error) {
        console.error('Error al obtener productos:', error);
    }
}

loadProducts();