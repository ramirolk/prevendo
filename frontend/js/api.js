const BASE_URL = 'http://localhost/api';


function getToken() {
    return sessionStorage.getItem('auth_token');
}

function getRole() {
    return sessionStorage.getItem('user_role');
}

function setToken(token, role) {
    sessionStorage.setItem('auth_token', token);
    sessionStorage.setItem('user_role', role);
}

function clearToken() {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('user_role');
}

async function apiFetch(endpoint, options = {}) {
   const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            'Accept':  'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
            ...options.headers,
        },
   });
   
   const data = response.status === 204 ? null : await response.json();

   if (!response.ok) {
        const error = new Error(
            data.message || 'Error en la solicitud'
        );

        error.status = response.status;
        error.data = data;

        throw error;
   }

   return data;

}

export { getRole, apiFetch, setToken, clearToken};



