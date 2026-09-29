// What the e-ticket statuses are called on screen (the database keeps Active / Ongoing / Completed / Cleared):
// Not started / In progress, Serving now, For clearance, Cleared.
// Same wording as mobile/components/ticketStatus.js.
export const ticketStatusLabel = (ticket) => {
    if (!ticket) return '';
    if (ticket.status === 'Ongoing') return 'Serving now';
    if (ticket.status === 'Active') {
        // Active also means "stopped partway": only call it not started when no time has been served
        const served = (ticket.total_hours_required || 0) - (ticket.base_remaining_hours ?? ticket.remaining_hours ?? 0);
        return served > 0.001 ? 'In progress' : 'Not started';
    }
    // Hours served, but OSA hasn't approved the ISO form and reflection paper yet
    if (ticket.status === 'Completed') return 'For clearance';
    return ticket.status || 'Pending';
};

const hoursText = (h) => `${h} hour${h === 1 ? '' : 's'}`;

/**
 * The 3-day deadline of an open ticket for the student (backend core/deadlines.py): null when there's none,
 * else { overdue, title, message }. Sundays don't count, and each missed day after it adds 1 hour.
 */
export const deadlineNotice = (ticket, now = Date.now()) => {
    if (!ticket?.deadline || !['Active', 'Ongoing'].includes(ticket.status)) return null;
    const end = Date.parse(ticket.deadline);
    // The deadline is midnight after the last day: name that last day
    const day = new Date(end - 1).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' });
    const added = Math.round(ticket.added_hours || 0);
    if (now < end) {
        return {
            overdue: false,
            title: `Finish your hours by ${day}`,
            message: `You have ${ticket.days_to_finish || 3} days (Sundays not counted). After the deadline, 1 hour is added for every day you don't serve.`,
        };
    }
    return {
        overdue: true,
        title: `Deadline passed (${day})`,
        message: added
            ? `${hoursText(added)} added for missed days. Serve at least a few minutes every day (except Sunday) so no more hours are added.`
            : 'Serve at least a few minutes today. Every day you miss (except Sunday) adds 1 hour.',
    };
};

const fmtHours = (hours) => {
    const minutes = Math.max(0, Math.round((hours || 0) * 60));
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
};
const fmtDate = (iso, withTime = false) => (iso
    ? new Date(iso).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}) })
    : '—');

/**
 * The e-ticket as a short receipt for the student (like the admin's completion receipt): a header, the
 * violation, the required action, and every building it was assigned to. `sessions` are the ticket's
 * time-out receipts, newest first (null while loading). Lines are [label, value, tone?] with tone
 * 'red' (the violation), 'good' or 'bad'.
 */
export const ticketReceipt = (ticket, sessions, { forAdmin = false } = {}) => {
    const v = ticket.violation_details || {};
    const required = ticket.total_hours_required || 0;
    const remaining = ticket.base_remaining_hours ?? ticket.remaining_hours ?? 0;
    const added = ticket.added_hours || 0;
    const finished = ['Completed', 'Cleared'].includes(ticket.status);
    const lastSession = sessions?.length ? sessions[0].time_out || sessions[0].time_in : null;

    const lines = [
        ['Sanction', v.punishment || '—'],
        ['Hours required', `${fmtHours(required)}${added ? ` (+${added}h missed days)` : ''}`],
        ['Hours served', fmtHours(required - remaining), 'good'],
    ];
    if (!finished) lines.push(['Remaining', fmtHours(remaining)]);
    lines.push(['Sessions', sessions ? String(sessions.length) : '…']);
    if (ticket.deadline) {
        const end = Date.parse(ticket.deadline);
        const met = finished && lastSession ? Date.parse(lastSession) < end : null;
        const passed = !finished && Date.now() >= end;
        const note = met === true ? ' · met' : met === false ? ' · missed' : passed ? ' · passed' : '';
        lines.push(['Deadline', `${fmtDate(new Date(end - 1).toISOString())}${note}`, met === false || passed ? 'bad' : undefined]);
    }

    const header = ticket.status === 'Cleared'
        ? { tone: 'done', title: 'Violation cleared', subtitle: `OSA approved ${forAdmin ? 'the' : 'your'} ISO form and reflection paper.` }
        : ticket.status === 'Completed'
            ? { tone: 'clearance', title: 'Hours completed · For clearance', subtitle: 'Bring your signed ISO form and reflection paper to the OSA office.' }
            : { tone: 'active', title: ticketStatusLabel(ticket), subtitle: `${fmtHours(remaining)} left to serve` };

    // Every building the admin assigned, oldest first (older violations only know the current one)
    const buildings = v.building_history?.length
        ? v.building_history.map((b) => ({ name: b.name, date: b.at ? fmtDate(b.at) : 'First' }))
        : [{ name: v.assigned_building || ticket.assigned_site?.name || ticket.assigned_location, date: '' }].filter((b) => b.name);

    return {
        header,
        sections: [
            { title: 'Violation', lines: [['Violation', v.violation_type || '—', 'red'], ['Offense', `#${v.offense_count || 1}`], ['Date caught', fmtDate(v.created_at, true)], ['Reported by', v.reporting_guard || '—']] },
            { title: 'Required Action', lines },
        ],
        buildings,
    };
};
