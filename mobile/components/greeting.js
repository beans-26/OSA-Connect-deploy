// Dashboard header copy for students. Same wording as frontend/src/lib/greeting.js.

/** "Good morning" (5 AMâ€“12 PM), "Good afternoon" (12â€“6 PM), "Good evening" (otherwise). */
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

/** One-line status under the student's greeting. */
export const studentStatusLine = ({ sessionActive, openTicket }) => {
    if (sessionActive) return 'Your service session is in progress.';
    if (openTicket) return `You have ${formatHours(openTicket.remaining_hours ?? 0)} of community service remaining.`;
    return 'You have no pending community service.';
};
