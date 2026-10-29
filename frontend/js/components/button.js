import { escapeHtml } from '../utils/escape.js';

function renderButton({
    id = null,
    text,
    type = 'button',
    variant = 'primary',
    loading = false,
    disabled = false,
    loadingText = 'Cargando...',
    className = '',
}) {
    const isDisabled = disabled || loading;

    const variants = {
        primary: 'bg-brand text-white hover:bg-brand-hover focus:ring-brand',
        secondary: 'bg-ground text-muted hover:bg-ground focus:ring-gray-400',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };

    const buttonClasses = variants[variant] ?? variants.primary;

    const safeId = id !== null ? escapeHtml(id) : '';
    const safeType = escapeHtml(type);
    const safeClassName = escapeHtml(className);
    const safeText = escapeHtml(text);
    const safeLoadingText = escapeHtml(loadingText);

    return `
        <button
            ${id !== null ? `id="${safeId}"` : ''}
            type="${safeType}"
            ${isDisabled ? 'disabled' : ''}
            aria-busy="${loading}"
            class="
                inline-flex items-center justify-center gap-2
                rounded-md px-4 py-2
                text-sm font-medium
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-offset-2
                disabled:cursor-not-allowed disabled:opacity-50
                ${buttonClasses}
                ${safeClassName}
            "
        >
            ${loading ? safeLoadingText : safeText}
        </button>
    `;
}

export { renderButton };
