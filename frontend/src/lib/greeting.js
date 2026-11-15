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

/** One-line status under the admin's greeting. */
export const adminStatusLine = (pendingCount) => {
    if (!pendingCount) return 'All reports have been reviewed.';
    return pendingCount === 1 ? '1 report is awaiting your review.' : `${pendingCount} reports are awaiting your review.`;
};
