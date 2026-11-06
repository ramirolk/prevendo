import '../auth-guard.js';

import { apiFetch } from '../api.js';
import { mountNav } from '../layout/nav.js';

mountNav();

document.addEventListener('alpine:init', () => {
    window.Alpine.data('pos', () => ({
        query: '',
        products: [],
        cart: [],
        loading: false,
        hasLoaded: false,
        error: '',
        searchTimer: null,
        latestRequestId: 0,

        init() {
            this.loadProducts();
        },

        scheduleProductSearch() {
            const requestId = ++this.latestRequestId;

            clearTimeout(this.searchTimer);
            this.loading = true;
            this.error = '';
            this.searchTimer = setTimeout(() => this.loadProducts(requestId), 300);
        },

        async loadProducts(requestId = ++this.latestRequestId) {
            this.loading = true;
            this.error = '';

            const params = new URLSearchParams({ per_page: '10' });
            const search = this.query.trim();

            if (search) params.set('search', search);

            try {
                const response = await apiFetch(`/products?${params.toString()}`);

                if (requestId !== this.latestRequestId) return;

                if (!Array.isArray(response?.data)) {
                    throw new Error('Formato de respuesta inesperado');
                }

                this.products = response.data;
                this.hasLoaded = true;
            } catch (error) {
                if (requestId !== this.latestRequestId || error.status === 401) return;

                this.products = [];
                this.hasLoaded = true;
                this.error = 'No se pudieron cargar los productos. Revisá tu conexión e intentá nuevamente.';
                console.error('Error al buscar productos para la venta:', error);
            } finally {
                if (requestId === this.latestRequestId) this.loading = false;
            }
        },

        retryProductSearch() {
            clearTimeout(this.searchTimer);
            this.loadProducts();
        },

        addProduct(product) {
            const stock = Number(product.current_stock);

            if (!Number.isSafeInteger(stock) || stock < 1) return;

            const existingItem = this.cart.find(item => String(item.product.id) === String(product.id));

            if (existingItem) {
                const quantity = Number(existingItem.quantity);

                if (Number.isSafeInteger(quantity) && quantity >= stock) {
                    existingItem.quantityError = 'El stock disponible es ' + stock + '.';
                    this.cartNotice = 'No podés agregar más unidades de ' + product.name + '.';
                    return;
                }

                existingItem.quantity = (Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 0) + 1;
                existingItem.quantityError = '';
            } else {
                this.cart.push({
                    product,
                    quantity: 1,
                    quantityError: '',
                });
            }

            this.cartNotice = product.name + ' agregado a la venta.';
        },

        removeProduct(productId) {
            const item = this.cart.find(cartItem => String(cartItem.product.id) === String(productId));

            if (!item) return;

            this.cart = this.cart.filter(cartItem => String(cartItem.product.id) !== String(productId));
            this.cartNotice = item.product.name + ' quitado de la venta.';
        },

        decreaseQuantity(item) {
            const quantity = Number(item.quantity);

            if (Number.isSafeInteger(quantity) && quantity > 1) {
                item.quantity = quantity - 1;
                item.quantityError = '';
            }
        },

        increaseQuantity(item) {
            const quantity = Number(item.quantity);
            const stock = Number(item.product.current_stock);

            if (!Number.isSafeInteger(quantity) || !Number.isSafeInteger(stock) || quantity >= stock) {
                item.quantityError = 'El stock disponible es ' + stock + '.';
                return;
            }

            item.quantity = quantity + 1;
            item.quantityError = '';
        },

        normalizeQuantity(item) {
            const quantity = Number(item.quantity);
            const stock = Number(item.product.current_stock);

            if (item.quantity === '' || !Number.isSafeInteger(quantity) || quantity < 1) {
                item.quantity = 1;
                item.quantityError = 'La cantidad debe ser un entero mayor o igual a 1.';
                return;
            }

            if (Number.isSafeInteger(stock) && quantity > stock) {
                item.quantity = stock;
                item.quantityError = 'El stock disponible es ' + stock + '.';
                return;
            }

            item.quantityError = '';
        },

        priceInCents(value) {
            const match = String(value).trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);

            if (!match) return null;

            const whole = Number(match[1]);
            const cents = Number((match[2] ?? '').padEnd(2, '0'));
            const total = whole * 100 + cents;

            return Number.isSafeInteger(total) ? total : null;
        },

        get estimatedTotalCents() {
            let total = 0;

            for (const item of this.cart) {
                const quantity = Number(item.quantity);
                const unitPrice = this.priceInCents(item.product.sale_price);

                if (!Number.isSafeInteger(quantity) || quantity < 1 || unitPrice === null) return null;

                total += unitPrice * quantity;

                if (!Number.isSafeInteger(total)) return null;
            }

            return total;
        },

        formatCurrency(value) {
            const cents = this.priceInCents(value);

            if (cents === null) return '—';

            return this.formatCents(cents);
        },

        formatCents(cents) {
            return new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: 'ARS',
            }).format(cents / 100);
        },

        formatEstimatedTotal() {
            return this.estimatedTotalCents === null
                ? '—'
                : this.formatCents(this.estimatedTotalCents);
        },
    }));
}, { once: true });

// Inject Alpine only after registering the listener above. This keeps the
// module/CDN initialization order deterministic without a bundler.
const alpineScript = document.createElement('script');
alpineScript.src = 'https://cdn.jsdelivr.net/npm/alpinejs@3.17.4/dist/cdn.min.js';
alpineScript.crossOrigin = 'anonymous';
alpineScript.addEventListener('error', () => {
    console.error('No se pudo cargar Alpine.js desde jsDelivr.');
});
document.head.append(alpineScript);
