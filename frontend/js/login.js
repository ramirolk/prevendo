import { apiFetch, setToken } from "./api.js";
import { renderInput } from './components/input.js';
import { renderButton } from './components/button.js';

const formFields = document.getElementById('form-fields');
const submitButtonContainer = document.getElementById('submit-button');
const form = document.getElementById('login-form');
const errorMessage = document.getElementById('login-error');

let isSubmitting = false;

function renderSubmitButton({ loading = false } = {}) {
    submitButtonContainer.innerHTML = renderButton({
        text: 'Iniciar sesión',
        type: 'submit',
        loading,
        loadingText: 'Ingresando...',
        className: 'w-full',
    });
}

function renderForm() {
    formFields.innerHTML = `
        ${renderInput({ id: 'email', label: 'Email', type: 'email', required: true })}
        ${renderInput({ id: 'password', label: 'Contraseña', type: 'password', required: true })}
    `;

    renderSubmitButton();
}

renderForm();

form.addEventListener('submit', async (event) => {
    
    event.preventDefault();

    if (isSubmitting) return;

    isSubmitting = true;

    errorMessage.hidden = true;
    errorMessage.textContent = '';

    renderSubmitButton({ loading: true });

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const data = await apiFetch('/login', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password,
            }),
        });

        setToken(data.token, data.user.role);

        window.location.href = '/dashboard.html';

    } catch (error) {

        errorMessage.hidden = false;

        if (error.status === 401) {
            errorMessage.textContent = error.data?.message || 'Invalid credentials.';
        } else {
            errorMessage.textContent = 'Error al iniciar sesión, intenta nuevamente';
        }
    } finally {
        isSubmitting = false;

        renderSubmitButton({ loading: false });
    }
});