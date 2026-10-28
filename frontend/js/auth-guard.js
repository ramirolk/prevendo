import {getToken, getRole, clearToken} from './api.js';

if (!getToken() || !getRole()) {
    clearToken();
    window.location.replace('/views/login.html');
}