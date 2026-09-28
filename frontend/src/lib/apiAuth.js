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

export const installApiAuth = () => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
        const url = typeof input === 'string' ? input : input?.url || '';
        const isApi = url.startsWith('/api/') || url.startsWith(`${window.location.origin}/api/`);
        if (!isApi || url.includes('/api/login')) return originalFetch(input, init);

        const user = readUser();
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
