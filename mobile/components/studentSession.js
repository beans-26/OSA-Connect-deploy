import api from '../services/api';
import { stopTracking } from './backgroundTracking';

// Mirrors frontend/src/components/studentSession.js.
// Ends the student's running service session, if any: the same 'out' call as scanning the end QR,
// so the hours served so far are kept and the student scans the start QR again to continue.
// The session lives on the server, so this stops the timer on the website too (its dashboard polls).
// reason is saved as how the session ended, for the time-out receipt ('logout', 'idle')
export const stopActiveSession = async (studentId, reason = 'logout') => {
    if (!studentId) return false;
    try {
        // Short timeouts: offline must not leave the student stuck on Log Out
        const { data } = await api.get('/etickets/', { params: { student_id: studentId }, timeout: 8000 });
        const running = (Array.isArray(data) ? data : []).filter((t) =>
            t.violation_details?.student_details?.student_id === studentId && t.active_time_in
        );
        for (const ticket of running) {
            await api.post('/timelogs/log_time/', { eticket_id: ticket.id, action: 'out', end_reason: reason }, { timeout: 8000 });
        }
        return running.length > 0;
    } catch {
        return false;
    } finally {
        // Logged out: stop checking location in the background (offline, the server ends it after 3 minutes)
        await stopTracking();
    }
};
