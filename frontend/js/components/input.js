import { escapeHtml } from '../utils/escape.js';

function renderInput({
    id,
    name = id,
    label,
    type = 'text',
    required = false,
    error = null,
    value = '',
    maxLength = null,
    min = null,
    step = null,
    placeholder = '',
    autoComplete = null,
}) {
    
    const safeId = escapeHtml(id);
    const safeName = escapeHtml(name);
    const safeLabel = escapeHtml(label);
    const safeType = escapeHtml(type);
    const safeError = escapeHtml(error);
    const safeValue = escapeHtml(value);
    const safeMaxLength = Number.isInteger(maxLength) && maxLength > 0
        ? escapeHtml(maxLength)
        : null;
    const safeMin = Number.isFinite(min) ? escapeHtml(min) : null;
    const safeStep = typeof step === 'number' && Number.isFinite(step)
        ? escapeHtml(step)
        : null;
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
                name="${safeName}"
                value="${safeValue}"
                ${safeMaxLength ? `maxlength="${safeMaxLength}"` : ''}
                ${safeMin !== null ? `min="${safeMin}"` : ''}
                ${safeStep !== null ? `step="${safeStep}"` : ''}
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
