const BASE_URL = 'http://localhost/api';


function getToken() {
    return sessionStorage.getItem('auth_token');
}

function getRole() {
    return sessionStorage.getItem('user_role');
}

function getUserName() {
    return sessionStorage.getItem('user_name');
}

function setToken(token, role, userName) {
    sessionStorage.setItem('auth_token', token);
    sessionStorage.setItem('user_role', role);
    sessionStorage.setItem('user_name', userName);
}

function clearToken() {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('user_role');
    sessionStorage.removeItem('user_name');
}

async function apiFetch(endpoint, options = {}) {
    const token = getToken();

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    const data = response.status === 204
        ? null
        : await response.json();

    if (!response.ok) {
        const error = new Error(
            data?.message || 'Error en la solicitud'
        );

        error.status = response.status;
        error.data = data;

        if (
            response.status === 401 &&
            endpoint !== '/login' &&
            token
        ) {
            clearToken();
            window.location.replace ('/views/login.html');
        }

        throw error;
    }

    return data;
}

export {
    getToken,
    getRole,
    getUserName,
    apiFetch,
    setToken,
    clearToken,
};




