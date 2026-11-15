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
