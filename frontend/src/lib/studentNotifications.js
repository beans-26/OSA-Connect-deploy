// The student's notifications, built from their own reports and e-tickets (nothing extra is stored on
// the server). Which ones were read is kept on this device. Same rules as
// mobile/components/studentNotifications.js.
import { deadlineNotice } from './ticketStatus';

export const REMINDERS_KEY = 'osa-deadline-reminders';
// Data saver (Settings, on unless turned off): the map loads on tap and idle refreshes are every few minutes
export const DATA_SAVER_KEY = 'osa-data-saver';
export const IDLE_REFRESH_MS = 30000;
export const SAVER_REFRESH_MS = 180000;
export const readDataSaver = () => {
    try { return localStorage.getItem(DATA_SAVER_KEY) !== 'off'; } catch { return true; }
};
export const saveDataSaver = (on) => {
    try { localStorage.setItem(DATA_SAVER_KEY, on ? 'on' : 'off'); } catch { /* not kept */ }
};
const seenKey = (username) => `osa-notifications-seen:${username}`;
const phToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
// The "You haven't served today" reminder starts at 6:00 AM Philippine time (hidden before then) and is
// dated 6:00 AM, so every device shows the same "3 hr ago"
const REMINDER_HOUR = 6;
const reminderStart = () => {
    const start = new Date(`${phToday()}T${String(REMINDER_HOUR).padStart(2, '0')}:00:00+08:00`);
    return Date.now() >= start.getTime() ? start.toISOString() : null;
};
const isSundayPH = () => new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'short' }) === 'Sun';
const hrs = (h) => {
    const n = Math.round((h || 0) * 10) / 10;
    return `${n} hr${n === 1 ? '' : 's'}`;
};

/** { id, tone: 'info' | 'warn' | 'good' | 'bad', title, body, at } newest first. */
export function buildNotifications(violations = [], tickets = [], { reminders = true } = {}) {
    const list = [];
    const ticketFor = new Set(tickets.map((t) => t.violation));
    violations.forEach((v) => {
        if (v.status === 'Pending OSA Review') {
            list.push({ id: `report-${v.id}`, tone: 'info', title: 'Violation reported', body: `${v.violation_type} was reported. OSA will review it and assign your community service.`, at: v.created_at });
        } else if (v.status === 'Dismissed') {
            list.push({ id: `dismissed-${v.id}`, tone: 'good', title: 'Report dismissed', body: `OSA dismissed the ${v.violation_type} report. Nothing to serve.`, at: v.created_at });
        } else if (!ticketFor.has(v.id) && v.status === 'Cleared') {
            list.push({ id: `cleared-${v.id}`, tone: 'good', title: 'Clearance approved', body: `${v.violation_type} is cleared.`, at: v.cleared_at || v.created_at });
        }
    });
    tickets.forEach((t) => {
        const type = t.violation_details?.violation_type || 'Your violation';
        list.push({ id: `ticket-${t.id}`, tone: 'info', title: 'Community service assigned', body: `${type}: ${hrs(t.total_hours_required)} at ${t.assigned_location || 'your service site'}.`, at: t.created_at });
        // The student finished the hours (stays in the list after clearance), then OSA approved the documents
        if (t.status === 'Completed' || t.status === 'Cleared') {
            list.push({ id: `completed-${t.id}`, tone: 'good', title: 'Community service completed', body: `You finished your ${hrs(t.total_hours_required)} for ${type}. Bring your signed ISO form and reflection paper to the OSA office to be cleared.`, at: t.completed_at || t.violation_details?.cleared_at || t.created_at });
        }
        if (t.status === 'Cleared') {
            list.push({ id: `cleared-${t.id}`, tone: 'good', title: 'Clearance approved', body: `OSA approved your ISO form and reflection paper. ${type} is cleared. You're all done.`, at: t.violation_details?.cleared_at || t.completed_at || t.created_at });
        }
        const notice = deadlineNotice(t);
        if (notice?.overdue) {
            list.push({ id: `overdue-${t.id}-${Math.round(t.added_hours || 0)}`, tone: 'bad', title: notice.title, body: notice.message, at: t.deadline });
        }
        // "Remind me if I haven't served": an open ticket with no time served today (Sundays don't count)
        const since = reminderStart();
        if (reminders && since && t.status === 'Active' && t.served_today === false && !isSundayPH()) {
            list.push({ id: `reminder-${t.id}-${phToday()}`, tone: 'warn', title: "You haven't served today", body: `${hrs(t.base_remaining_hours ?? t.remaining_hours)} left for ${type}. Serve at least a few minutes today.`, at: since });
        }
    });
    // Newest first, by when each one happened (a reminder from 11 min ago sits below a newer notice)
    return list.sort((a, b) => Date.parse(b.at || 0) - Date.parse(a.at || 0));
}

export const readSeen = (username) => {
    try { return new Set(JSON.parse(localStorage.getItem(seenKey(username)) || '[]')); } catch { return new Set(); }
};
export const markSeen = (username, ids) => {
    try { localStorage.setItem(seenKey(username), JSON.stringify([...new Set([...readSeen(username), ...ids])].slice(-300))); } catch { /* shown as new again */ }
};
export const readReminders = () => {
    try { return localStorage.getItem(REMINDERS_KEY) !== 'off'; } catch { return true; }
};
export const saveReminders = (on) => {
    try { localStorage.setItem(REMINDERS_KEY, on ? 'on' : 'off'); } catch { /* not kept */ }
};

/** Hours still to serve across the open tickets (for "2.5 hrs of service remaining"). */
export const remainingHours = (tickets = []) => tickets
    .filter((t) => t.status === 'Active' || t.status === 'Ongoing')
    .reduce((sum, t) => sum + (t.remaining_hours ?? t.base_remaining_hours ?? 0), 0);

export const hoursLabel = hrs;
