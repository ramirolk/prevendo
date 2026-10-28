import { escapeHtml } from '../utils/escape.js';

function renderInput({id, label, type = 'text', required = false, error = null,}) {
    
    const safeId = escapeHtml(id);
    const safeLabel = escapeHtml(label);
    const safeType = escapeHtml(type);
    const safeError = escapeHtml(error);

    return `
        <div class="mb-4">
            <label
                for="${safeId}"
                class="block text-sm font-medium text-gray-700 mb-1"
            >
                ${safeLabel}
            </label>

            <input
                type="${safeType}"
                id="${safeId}"
                name="${safeId}"
                ${required ? 'required' : ''}
                ${error ? 'aria-invalid="true" aria-describedby="' + safeId + '-error"' : ''}
                class="w-full border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-500' : 'focus:ring-blue-500'}"
            >

            ${error ? `
                <p
                    id="${safeId}-error"
                    class="text-sm text-red-600 mt-1"
                >
                    ${safeError}
                </p>
            ` : ''}
        </div>
    `;
}

export { renderInput };
