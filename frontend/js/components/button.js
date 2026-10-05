
function renderButton({ id = null, text, type = 'button', variant = 'primary', loading = false, disabled = false, loadingText = 'Cargando...', className = '',}) {
    
    const isDisabled = disabled || loading;

    const variants = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };

    const buttonClasses = variants[variant] ?? variants.primary;

    return `
        <button
            ${id ? `id="${id}"` : ''}
            type="${type}"
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
                ${className}
            "
        >
            ${loading ? loadingText : text}
        </button>
    `;
}

export { renderButton };