// Student session helpers shared by Settings (Log Out) and StudentIdleGuard.
// Mirrors mobile/components/studentSession.js.

export const ACTIVITY_KEY = 'studentLastActivity';

// Offline or a slow server must not leave the student stuck on Log Out
const fetchWithTimeout = (url, options = {}, ms = 8000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
};

// Ends the student's running service session, if any: the same 'out' call as scanning the end QR,
// so the hours served so far are kept and the student scans the start QR again to continue.
export const stopActiveSession = async (studentId) => {
    if (!studentId) return false;
    try {
        const tickets = await fetchWithTimeout('/api/etickets/?t=' + Date.now()).then((r) => r.json());
        const running = (Array.isArray(tickets) ? tickets : []).filter((t) =>
            t.violation_details?.student_details?.student_id === studentId && t.active_time_in
        );
        for (const ticket of running) {
            await fetchWithTimeout('/api/timelogs/log_time/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eticket_id: ticket.id, action: 'out' }),
            });
        }
        return running.length > 0;
    } catch {
        return false;
    }
};

// Stops the timer, clears the saved session, and goes to the login page (with an optional notice)
export const logoutStudent = async (navigate, notice) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    await stopActiveSession(user.username);
    localStorage.removeItem('user');
    localStorage.removeItem(ACTIVITY_KEY);
    navigate('/login', { replace: true, state: notice ? { notice } : undefined });
};
