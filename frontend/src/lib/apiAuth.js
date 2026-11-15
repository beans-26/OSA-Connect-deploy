import { loginPathFor } from './portals';

// Every request to our API carries the login token from /api/login/ (saved on localStorage.user),
// so the server knows who is asking and what they may do (backend/core/auth.py). When the server says
// the login is no longer valid (expired, password changed, account disabled), the saved login is
// cleared and the person goes back to their login page.

const readUser = () => {
    try {
        return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
        return null;
    }
};

let redirecting = false;
const GET_TIMEOUT_MS = 20000;

export const installApiAuth = () => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
        const url = typeof input === 'string' ? input : input?.url || '';
        const isApi = url.startsWith('/api/') || url.startsWith(`${window.location.origin}/api/`);
        if (!isApi || url.includes('/api/login')) return originalFetch(input, init);

        const user = readUser();
        // A slow connection: a refresh (GET) that hangs is given up after GET_TIMEOUT_MS instead of waiting
        // forever (the next poll tries again). Saves and uploads are never cut off.
        const method = (init.method || (typeof input === 'string' ? 'GET' : input.method) || 'GET').toUpperCase();
        if (method === 'GET' && !init.signal && typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
            init = { ...init, signal: AbortSignal.timeout(GET_TIMEOUT_MS) };
        }
        if (user?.token) {
            const headers = new Headers(init.headers || (typeof input === 'string' ? undefined : input.headers));
            if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${user.token}`);
            init = { ...init, headers };
        }
        return originalFetch(input, init).then((response) => {
            // Logged in (or thought so) but the server refused the login: start over
            if (response.status === 401 && user && !redirecting) {
                redirecting = true;
                localStorage.removeItem('user');
                window.location.href = loginPathFor(user.role);
            }
            return response;
        });
    };
};
