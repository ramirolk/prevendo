import '../auth-guard.js';

import { apiFetch } from '../api.js';
import { mountNav } from '../layout/nav.js';

mountNav();

document.addEventListener('alpine:init', () => {
    window.Alpine.data('pos', () => ({
        query: '',
        products: [],
        cart: [],
        cartNotice: '',
        loading: false,
        hasLoaded: false,
        error: '',
        refreshNotice: '',
        successMessage: '',
        submitError: '',
        submitting: false,
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

        async loadProducts(requestId = ++this.latestRequestId, { silent = false } = {}) {
            if (!silent) {
                this.loading = true;
                this.error = '';
            }

            this.refreshNotice = '';

            const params = new URLSearchParams({ per_page: '10' });
            const search = this.query.trim();

            if (search) params.set('search', search);

            try {
                const response = await apiFetch(`/products?${params.toString()}`);

                if (requestId !== this.latestRequestId) return false;

                if (!Array.isArray(response?.data)) {
                    throw new Error('Formato de respuesta inesperado');
                }

                this.products = response.data;
                this.hasLoaded = true;
                return true;
            } catch (error) {
                if (requestId !== this.latestRequestId || error.status === 401) return false;

                this.hasLoaded = true;
                if (silent) {
                    this.refreshNotice = 'La venta se registró, pero no pudimos actualizar el stock. Recargá la página para verlo.';
                } else {
                    this.products = [];
                    this.error = 'No se pudieron cargar los productos. Revisá tu conexión e intentá nuevamente.';
                }
                console.error('Error al buscar productos para la venta:', error);
                return false;
            } finally {
                if (!silent && requestId === this.latestRequestId) this.loading = false;
            }
        },

        retryProductSearch() {
            clearTimeout(this.searchTimer);
            this.loadProducts();
        },

        get cartIsValid() {
            return this.cart.length > 0 && this.cart.every(item => {
                const quantity = Number(item.quantity);
                const stock = Number(item.product.current_stock);
                const price = this.priceInCents(item.product.sale_price);

                return item.product.active !== false
                    && Number.isSafeInteger(quantity)
                    && quantity >= 1
                    && Number.isSafeInteger(stock)
                    && stock > 0
                    && quantity <= stock
                    && price !== null;
            });
        },

        async submitSale() {
            if (this.submitting || this.cart.length === 0) return;

            this.cart.forEach(item => this.normalizeQuantity(item));
            if (!this.cartIsValid) {
                this.submitError = 'Revisá las cantidades antes de confirmar la venta.';
                this.$nextTick(() => this.$refs.submitError?.focus());
                return;
            }

            clearTimeout(this.searchTimer);
            this.latestRequestId += 1;
            this.loading = false;
            this.submitting = true;
            this.submitError = '';
            this.successMessage = '';
            this.refreshNotice = '';

            const items = this.cart.map(item => ({
                product_id: item.product.id,
                quantity: Number(item.quantity),
            }));

            try {
                const response = await apiFetch('/sales', {
                    method: 'POST',
                    body: JSON.stringify({ items }),
                });
                const sale = response?.data;

                if (!sale?.id || sale.total === undefined || sale.total === null) {
                    throw new Error('La API no devolvió el identificador y el total de la venta.');
                }

                this.cart = [];
                this.cartNotice = '';
                this.successMessage = 'Venta #' + sale.id + ' registrada por ' + this.formatCurrency(sale.total) + '.';
                await this.loadProducts(++this.latestRequestId, { silent: true });
                this.$nextTick(() => document.getElementById('pos-product-search')?.focus());
            } catch (error) {
                if (error.status === 401) return;

                if (error.status === 409) {
                    await this.handleSaleConflict(error);
                } else if (error.status === 422) {
                    this.handleSaleValidationError(error, items);
                } else if (error.status) {
                    this.submitError = 'No se pudo registrar la venta. Revisá los datos y volvé a intentar.';
                } else {
                    this.submitError = 'No pudimos confirmar la venta. Revisá el historial antes de reintentar; no vuelvas a enviarla todavía.';
                }

                console.error('Error al registrar la venta:', error);
                this.$nextTick(() => this.$refs.submitError?.focus());
            } finally {
                this.submitting = false;
            }
        },

        clearCartErrors() {
            this.cart.forEach(item => this.clearItemError(item));
            this.clearSubmitFeedback();
        },

        clearItemError(item) {
            item.quantityError = '';
            item.validationError = '';
            this.clearSubmitFeedback();
        },

        async handleSaleConflict(error) {
            const code = error.data?.code;
            const productId = error.data?.product_id;
            const item = this.cart.find(cartItem => String(cartItem.product.id) === String(productId));

            if (item && code === 'insufficient_stock') {
                item.validationError = 'El stock cambió mientras preparabas la venta. Estamos actualizando la disponibilidad.';
                this.submitError = 'No se registró la venta porque cambió el stock. Ajustá las cantidades indicadas y volvé a confirmar.';
                await this.refreshCartStock();
                return;
            }

            if (item && code === 'product_inactive') {
                item.product.active = false;
                item.validationError = 'Este producto fue desactivado y ya no se puede vender. Quitalo del carrito para continuar.';
                this.submitError = 'No se registró la venta porque uno de los productos ya no está activo.';
                await this.refreshCartStock();
                return;
            }

            this.submitError = 'No se registró la venta porque cambió la disponibilidad de un producto. Revisá el carrito y volvé a intentar.';
        },

        handleSaleValidationError(error, submittedItems) {
            const errors = error.data?.errors ?? {};
            let mappedCount = 0;

            this.clearCartErrors();

            for (const [field, messages] of Object.entries(errors)) {
                const itemMatch = field.match(/^items\.(\d+)\.(quantity|product_id)$/);
                const message = Array.isArray(messages) ? messages[0] : '';

                if (itemMatch) {
                    const submittedItem = submittedItems[Number(itemMatch[1])];
                    const cartItem = this.cart.find(item => String(item.product.id) === String(submittedItem?.product_id));

                    if (!cartItem) continue;

                    if (itemMatch[2] === 'quantity') {
                        cartItem.quantityError = 'La cantidad enviada no es válida. Ingresá un entero mayor o igual a 1.';
                    } else {
                        cartItem.validationError = message.toLowerCase().includes('already included')
                            ? 'Este producto está repetido en la venta. Dejá una sola línea y ajustá la cantidad.'
                            : 'Este producto ya no está disponible. Quitalo del carrito y actualizá el catálogo.';
                    }

                    mappedCount += 1;
                    continue;
                }

                if (field === 'items') {
                    this.submitError = 'Revisá los productos de la venta: hay un dato inválido o un producto repetido.';
                }
            }

            if (mappedCount > 0 && !this.submitError) {
                this.submitError = 'No se registró la venta. Corregí los productos marcados y volvé a confirmar.';
            } else if (!this.submitError) {
                this.submitError = 'No se registró la venta porque algunos datos no son válidos. Revisá el carrito y volvé a intentar.';
            }
        },

        async refreshCartStock() {
            const requests = this.cart.map(async item => {
                try {
                    const response = await apiFetch('/products/' + encodeURIComponent(item.product.id));
                    const product = response?.data;

                    if (!product) throw new Error('Formato de producto inesperado');

                    item.product.current_stock = Number(product.current_stock);
                    item.product.active = Boolean(product.active);
                    item.validationError = product.active
                        ? (Number(product.current_stock) < Number(item.quantity)
                            ? 'Solo quedan ' + product.current_stock + ' unidades disponibles. Ajustá la cantidad.'
                            : '')
                        : 'Este producto fue desactivado y ya no se puede vender. Quitalo del carrito para continuar.';

                    const listedProduct = this.products.find(candidate => String(candidate.id) === String(product.id));
                    if (listedProduct) {
                        listedProduct.current_stock = product.current_stock;
                        listedProduct.active = product.active;
                    }
                } catch (refreshError) {
                    if (refreshError.status === 404) {
                        item.product.current_stock = 0;
                        item.product.active = false;
                        item.validationError = 'Este producto ya no existe. Quitalo del carrito para continuar.';
                    } else if (refreshError.status !== 401) {
                        this.refreshNotice = 'No pudimos actualizar todo el stock. Revisá la disponibilidad antes de volver a confirmar.';
                        console.error('Error al actualizar stock del carrito:', refreshError);
                    }
                }
            });

            await Promise.allSettled(requests);
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
                    validationError: '',
                });
            }

            if (existingItem) {
                existingItem.quantityError = '';
                existingItem.validationError = '';
            }
            this.clearSubmitFeedback();
            this.cartNotice = product.name + ' agregado a la venta.';
        },

        removeProduct(productId) {
            const item = this.cart.find(cartItem => String(cartItem.product.id) === String(productId));

            if (!item) return;

            this.cart = this.cart.filter(cartItem => String(cartItem.product.id) !== String(productId));
            this.clearSubmitFeedback();
            this.cartNotice = item.product.name + ' quitado de la venta.';
        },

        decreaseQuantity(item) {
            const quantity = Number(item.quantity);

            if (Number.isSafeInteger(quantity) && quantity > 1) {
                item.quantity = quantity - 1;
                item.quantityError = '';
                item.validationError = '';
                this.clearSubmitFeedback();
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
            item.validationError = '';
            this.clearSubmitFeedback();
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
            item.validationError = '';
            this.clearSubmitFeedback();
        },

        clearSubmitFeedback() {
            this.submitError = '';
            this.refreshNotice = '';
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
