import { apiFetch, setToken } from "./api.js";

const form = document.getElementById('login-form');
const errorMessage = document.getElementById('login-error');

form.addEventListener('submit', async (event) => {
    
    event.preventDefault();

    errorMessage.hidden = true;
    errorMessage.textContent = '';

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
    }
});