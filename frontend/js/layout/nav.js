import { getRole, getUserName, clearToken } from '../api.js';
import { renderButton } from '../components/button.js';
import { escapeHtml } from '../utils/escape.js';

const links = [
    {
        label: 'Inicio',
        href: '/views/dashboard.html',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" />',
    },
    {
        label: 'Productos',
        href: '/views/products.html',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />',
    },
    {
        label: 'Categorías',
        href: '/views/categories.html',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M4 5h16M4 12h16M4 19h16M7 5v.01M7 12v.01M7 19v.01" />',
    },
    {
        label: 'Nueva venta',
        href: '/views/sales.html',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 4h2l2.2 10.3a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 8H6M10 20h.01M17 20h.01" />',
    },
];

function renderNav() {
    const role = getRole();
    const userName = escapeHtml(getUserName() || 'Usuario');
    const roleLabel = role === 'owner' ? 'Propietario' : role === 'employee' ? 'Empleado' : '';
    const currentPath = window.location.pathname.toLowerCase();

    const linksHtml = links
        .map(link => {
            const isCurrent = currentPath.endsWith(link.href.split('/').pop());

            return `
                <a
                    href="${link.href}"
                    ${isCurrent ? 'aria-current="page"' : ''}
                    class="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isCurrent ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-ground hover:text-brand'} md:w-full"
                >
                    <svg class="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
                        ${link.icon}
                    </svg>
                    <span>${escapeHtml(link.label)}</span>
                </a>
            `;
        }).join('');

    return `
        <aside class="flex min-h-0 flex-col border-b border-line bg-white px-3 py-3 md:h-full md:border-b-0 md:border-r md:px-4 md:py-5">
            <div class="flex items-center justify-between gap-3 px-2">
                <a href="/views/dashboard.html" class="inline-flex items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2" aria-label="Prevendo, inicio">
                    <span class="flex size-9 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white" aria-hidden="true">P</span>
                    <span class="text-lg font-semibold tracking-tight text-ink">Prevendo</span>
                </a>
            </div>

            <nav class="mt-7 flex gap-1 overflow-x-auto md:flex-col" aria-label="Principal">
                ${linksHtml}
            </nav>

            <div class="mt-2 flex items-center justify-between gap-3 border-t border-line px-2 pt-3 md:mt-auto md:pt-4">
                <div class="flex min-w-0 items-center gap-2.5">
                    <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand" aria-hidden="true">${escapeHtml((getUserName() || 'U').trim().slice(0, 1).toUpperCase())}</span>
                    <div class="min-w-0">
                        <p class="max-w-36 truncate text-xs font-semibold text-ink">${userName}</p>
                        <p class="text-xs text-muted">${escapeHtml(roleLabel)}</p>
                    </div>
                </div>
                ${renderButton({
                    id: 'logout-button',
                    text: 'Salir',
                    variant: 'secondary',
                    className: 'shrink-0 px-3 py-2',
                })}
            </div>
        </aside>
    `;
}

function mountNav(containerId = 'nav') {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`No se encontró el contenedor de navegación: #${containerId}`);
        return;
    }

    container.innerHTML = renderNav();

    container.querySelector('#logout-button').addEventListener('click', () => {
        clearToken();
        window.location.replace('/views/login.html');
    });
}

export { mountNav };
