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
        label: 'Nueva venta',
        href: '/views/sales.html',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 4h2l2.2 10.3a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 8H6M10 20h.01M17 20h.01" />',
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
        label: 'Ventas',
        href: '/views/sales-history.html',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />',
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
        <aside id="app-sidebar" role="dialog" aria-modal="true" aria-label="Menú principal" aria-hidden="true" inert class="fixed inset-y-0 left-0 z-50 flex h-dvh w-72 max-w-[85vw] -translate-x-full flex-col border-r border-line bg-white px-4 py-5 shadow-xl transition-transform duration-200 motion-reduce:transition-none">
            <div class="flex items-center justify-between gap-3 px-2">
                <a href="/views/dashboard.html" class="inline-flex items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2" aria-label="Prevendo, inicio">
                    <span class="flex size-9 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white" aria-hidden="true">P</span>
                    <span class="text-lg font-semibold tracking-tight text-ink">Prevendo</span>
                </a>
                <button id="nav-close-button" type="button" class="inline-flex size-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ground hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand" aria-label="Cerrar menú principal">
                    <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m6 6 12 12M18 6 6 18" />
                    </svg>
                </button>
            </div>

            <nav class="mt-7 flex flex-col gap-1" aria-label="Principal">
                ${linksHtml}
            </nav>

            <div class="mt-auto flex items-center justify-between gap-3 border-t border-line px-2 pt-4">
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
        <button id="nav-overlay" type="button" class="fixed inset-0 z-40 bg-ink/45 backdrop-blur-[1px]" aria-label="Cerrar menú principal" hidden></button>
    `;
}

function mountNav(containerId = 'nav') {
    const container = document.getElementById(containerId);
    const triggerContainer = document.getElementById('nav-toggle');
    const pageContent = document.querySelector('[data-nav-content]');
    const toolbarContent = document.querySelector('[data-nav-toolbar-content]');

    if (!container) {
        console.error(`No se encontró el contenedor de navegación: #${containerId}`);
        return;
    }

    if (!triggerContainer || !pageContent || !toolbarContent) {
        console.error('Falta el botón del menú o el contenedor del contenido principal.');
        return;
    }

    container.innerHTML = renderNav();
    triggerContainer.innerHTML = `
        <button id="nav-toggle-button" type="button" class="inline-flex size-11 items-center justify-center rounded-lg border border-line bg-white text-ink transition-colors hover:bg-ground focus:outline-none focus:ring-2 focus:ring-brand" aria-label="Abrir menú principal" aria-controls="app-sidebar" aria-expanded="false">
            <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
        </button>
    `;

    const sidebar = container.querySelector('#app-sidebar');
    const overlay = container.querySelector('#nav-overlay');
    const toggleButton = triggerContainer.querySelector('#nav-toggle-button');
    const closeButton = sidebar.querySelector('#nav-close-button');
    let isOpen = false;
    let previousBodyOverflow = '';

    function getSidebarFocusableElements() {
        return [...sidebar.querySelectorAll('a[href], button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])')]
            .filter(element => !element.hidden);
    }

    function openSidebar() {
        if (isOpen) return;

        isOpen = true;
        sidebar.inert = false;
        sidebar.setAttribute('aria-hidden', 'false');
        overlay.hidden = false;
        pageContent.inert = true;
        toolbarContent.inert = true;
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        toggleButton.setAttribute('aria-label', 'Cerrar menú principal');
        toggleButton.setAttribute('aria-expanded', 'true');

        closeButton.replaceWith(toggleButton);
        toggleButton.innerHTML = '<svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m6 6 12 12M18 6 6 18" /></svg>';
        sidebar.classList.remove('-translate-x-full');
        toggleButton.focus();
    }

    function closeSidebar({ restoreFocus = true } = {}) {
        if (!isOpen) return;

        isOpen = false;
        sidebar.classList.add('-translate-x-full');
        sidebar.inert = true;
        sidebar.setAttribute('aria-hidden', 'true');
        overlay.hidden = true;
        pageContent.inert = false;
        toolbarContent.inert = false;
        document.body.style.overflow = previousBodyOverflow;
        toggleButton.setAttribute('aria-label', 'Abrir menú principal');
        toggleButton.setAttribute('aria-expanded', 'false');

        toggleButton.replaceWith(closeButton);
        triggerContainer.append(toggleButton);
        toggleButton.innerHTML = '<svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16" /></svg>';


        if (restoreFocus) toggleButton.focus();
    }

    toggleButton.addEventListener('click', () => {
        if (isOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    closeButton.addEventListener('click', () => closeSidebar());
    overlay.addEventListener('click', () => closeSidebar());
    sidebar.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', () => closeSidebar({ restoreFocus: false }));
    });

    document.addEventListener('keydown', event => {
        if (!isOpen) return;

        if (event.key === 'Escape') {
            event.preventDefault();
            closeSidebar();
            return;
        }

        if (event.key !== 'Tab') return;

        const focusableElements = getSidebarFocusableElements();
        if (focusableElements.length === 0) {
            event.preventDefault();
            return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && (document.activeElement === firstElement || !sidebar.contains(document.activeElement))) {
            event.preventDefault();
            lastElement.focus();
        } else if (!event.shiftKey && (document.activeElement === lastElement || !sidebar.contains(document.activeElement))) {
            event.preventDefault();
            firstElement.focus();
        }
    });

    container.querySelector('#logout-button').addEventListener('click', () => {
        clearToken();
        window.location.replace('/views/login.html');
    });
}

export { mountNav };
