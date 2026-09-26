import api from '../services/api';

// Mirrors frontend/src/components/studentSession.js.
// Ends the student's running service session, if any: the same 'out' call as scanning the end QR,
// so the hours served so far are kept and the student scans the start QR again to continue.
// The session lives on the server, so this stops the timer on the website too (its dashboard polls).
export const stopActiveSession = async (studentId) => {
    if (!studentId) return false;
    try {
        // Short timeouts: offline must not leave the student stuck on Log Out
        const { data } = await api.get('/etickets/', { timeout: 8000 });
        const running = (Array.isArray(data) ? data : []).filter((t) =>
            t.violation_details?.student_details?.student_id === studentId && t.active_time_in
        );
        for (const ticket of running) {
            await api.post('/timelogs/log_time/', { eticket_id: ticket.id, action: 'out' }, { timeout: 8000 });
        }
        return running.length > 0;
    } catch {
        return false;
    }
};
