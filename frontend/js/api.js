const BASE_URL = 'http://localhost/api';

function getToken(params) {
    return '6|TOfZ3AW7ABVz7mtMyrzAeDQYxx4YN56hfLs3knID422f3cfe';
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

export {apiFetch};



