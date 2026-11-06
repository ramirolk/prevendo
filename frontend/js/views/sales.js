import '../auth-guard.js';

import { mountNav } from '../layout/nav.js';

mountNav();

document.addEventListener('alpine:init', () => {
    window.Alpine.data('pos', () => ({
        cart: [],

        formatEstimatedTotal() {
            return new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: 'ARS',
            }).format(0);
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
