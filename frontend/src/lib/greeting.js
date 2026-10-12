// Dashboard header copy for students and admins. Same wording as mobile/components/greeting.js.

/** "Good morning" (5 AM–12 PM), "Good afternoon" (12–6 PM), "Good evening" (otherwise). */
export const timeGreeting = (date = new Date()) => {
    const h = date.getHours();
    if (h >= 5 && h < 12) return 'Good morning';
    if (h >= 12 && h < 18) return 'Good afternoon';
    return 'Good evening';
};

/** e.g. "Saturday, September 26" */
export const todayLabel = (date = new Date()) =>
    date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

const formatHours = (hours) => {
    const rounded = Math.round(Math.max(0, hours) * 10) / 10;
    return `${rounded} ${rounded === 1 ? 'hour' : 'hours'}`;
};

/** One-line status under the student's greeting. With several open tickets (`tickets`), the hours of all of them:
    showing only the current ticket's hours made 4 tickets of 3 h read as "3 hours remaining". */
export const studentStatusLine = ({ sessionActive, openTicket, tickets = [] }) => {
    if (sessionActive) return 'Your service session is in progress.';
    const open = tickets.filter((t) => t.status === 'Active' || t.status === 'Ongoing');
    if (open.length > 1) {
        const total = open.reduce((sum, t) => sum + (t.remaining_hours ?? 0), 0);
        return `You have ${formatHours(total)} of community service remaining on ${open.length} e-tickets.`;
    }
    if (openTicket) return `You have ${formatHours(openTicket.remaining_hours ?? 0)} of community service remaining.`;
    return 'You have no pending community service.';
};

/** One-line status under the admin's greeting. */
export const adminStatusLine = (pendingCount) => {
    if (!pendingCount) return 'All reports have been reviewed.';
    return pendingCount === 1 ? '1 report is awaiting your review.' : `${pendingCount} reports are awaiting your review.`;
};
