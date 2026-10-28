import {getRole, getUserName, clearToken,} from '../api.js';

import {renderButton} from '../components/button.js';
import {escapeHtml} from '../utils/escape.js';

function renderNav() {
    const role = getRole();
    const userName = getUserName() || 'Usuario';

    const safeUserName = escapeHtml(userName);
    const safeRole = role ? escapeHtml(role) : '';

    const links = [
        {
            label: 'Inicio',
            href: '/views/dashboard.html',
            roles: ['owner', 'employee'],
        },
        {
            label: 'Categorías',
            href: '/views/categories.html',
            roles: ['owner', 'employee'],
        },
        {
            label: 'Productos',
            href: '/views/products.html',
            roles: ['owner', 'employee'],
        },
        {
            label: 'Ventas',
            href: '/views/sales.html',
            roles: ['owner', 'employee'],
        },
    ];

    const visibleLinks = links.filter(link =>
        link.roles.includes(role)
    ); 

    const linksHtml = visibleLinks.map(link => `
        <a
            href="${link.href}"
            class="text-sm font-medium text-muted hover:text-brand-hover"
        >
            ${escapeHtml(link.label)}
        </a>
    `).join('');

    return `
        <nav
            class="flex flex-wrap items-center justify-between gap-4
                   border-b border-line bg-white px-6 py-4"
            aria-label="Navegación principal"
        >
            <div class="flex flex-wrap items-center gap-6">
                <span class="text-lg font-bold text-brand">
                    Prevendo
                </span>

                <div class="flex flex-wrap items-center gap-4">
                    ${linksHtml}
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
                <span class="text-sm text-muted">
                    ${safeUserName} (${safeRole})
                </span>

                ${renderButton({
                    id: 'logout-button',
                    text: 'Cerrar sesión',
                    variant: 'secondary',
                })}
            </div>
        </nav>
    `;
}

function mountNav(containerId = 'nav') {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error(
            `No se encontró el contenedor de navegación: #${containerId}`
        );
        return;
    }

    container.innerHTML = renderNav();

    const logoutButton = container.querySelector('#logout-button');

    logoutButton.addEventListener('click', () => {
        clearToken();
        window.location.replace('/views/login.html');
    });
}

export { mountNav };
