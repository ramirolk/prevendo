function renderInput({ id, label, type = 'text', required = false, error = null}) {
    return `
        <div class="mb-4">
            <label for="${id}" class="block text-sm font-medium text-gray-700 mb-1">
                ${label}
            </label>
            <input
                type="${type}"
                id="${id}"
                name="${id}"
                ${required ? 'required' : ''}
                ${error ? `aria-invalid="true" aria-describedby="${id}-error"` : ''}
                class="w-full border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-500' : 'focus:ring-blue-500'}"
            >
            ${error ? `<p id="${id}-error" class="text-sm text-red-600 mt-1">${error}</p>` : ''}
        </div>  
    `;
}

export {renderInput};