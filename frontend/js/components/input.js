import { escapeHtml } from '../utils/escape.js';

function renderInput({
    id,
    label,
    type = 'text',
    required = false,
    error = null,
    placeholder = '',
    autoComplete = null,
}) {
    
    const safeId = escapeHtml(id);
    const safeLabel = escapeHtml(label);
    const safeType = escapeHtml(type);
    const safeError = escapeHtml(error);
    const safePlaceholder = escapeHtml(placeholder);
    const safeAutoComplete = autoComplete ? escapeHtml(autoComplete) : null;

    return `
        <div class="space-y-2">
            <label
                for="${safeId}"
                class="block text-sm font-medium text-ink"
            >
                ${safeLabel}
            </label>

            <input
                type="${safeType}"
                id="${safeId}"
                name="${safeId}"
                ${safePlaceholder ? `placeholder="${safePlaceholder}"` : ''}
                ${safeAutoComplete ? `autocomplete="${safeAutoComplete}"` : ''}
                ${required ? 'required' : ''}
                ${error ? 'aria-invalid="true" aria-describedby="' + safeId + '-error"' : ''}
                class="block min-h-11 w-full rounded-lg border ${error ? 'border-danger' : 'border-line'} bg-white px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-2 ${error ? 'focus:ring-danger/20' : 'focus:ring-brand/20'}"
            >

            ${error ? `
                <p
                    id="${safeId}-error"
                    class="text-sm text-danger"
                >
                    ${safeError}
                </p>
            ` : ''}
        </div>
    `;
}

export { renderInput };
