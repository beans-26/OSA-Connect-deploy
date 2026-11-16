import { useEffect, useState } from 'react';
import api from '../services/api';

// The violations that can be reported, in the dropdowns of the report form (app/staff/dashboard.jsx), Light first,
// and listed in the student Help. They live in the database (the violation_types table, backend
// models.ViolationType) and are read from GET /violations/punishments/ (useViolationTypes below). This built-in copy
// is what the table starts with; the screens use it until the list arrives, or if it can't be loaded.
// Same as the website (frontend/src/lib/violationTypes.js).
export const VIOLATION_GROUPS = [
    {
        id: 'light', label: 'Light Offenses', items: [
            'Curfew Violation', 'No ID / Improper ID Sling', 'No School Uniform', 'Dress Code Violation', 'Smoking', 'Littering',
        ],
    },
    {
        id: 'less_grave', label: 'Less Grave Offenses', items: [
            'Verbal Abuse & Cyberbullying', 'Stalking', 'Coercion via Violence', 'Indecent Behavior', 'Alcohol',
            'Pornography', 'Gambling', 'ID Fraud', 'Lab Tampering', 'Exam Sabotage',
        ],
    },
];
export const EVENT_VIOLATION = 'Failure to attend mandatory campus event';
const EVENT_GROUP = { id: 'event', label: 'Mandatory Events', items: [EVENT_VIOLATION] };

// groups: Light and Less Grave (what guards and faculty report); eventGroup: the missed-event list; rules:
// {name: {category, offenses: [{offense, punishment, hours}]}} or null while only the built-in list is known
const FALLBACK = { groups: VIOLATION_GROUPS, eventGroup: EVENT_GROUP, rules: null };

const fromApi = (data) => {
    const groups = (data.categories || [])
        .map((c) => ({ id: c.id, label: c.label, items: (data.rules || []).filter((r) => r.category === c.id).map((r) => r.violation_type) }))
        .filter((g) => g.items.length);
    return {
        groups: groups.filter((g) => g.id !== 'event'),
        eventGroup: groups.find((g) => g.id === 'event') || null,
        rules: Object.fromEntries((data.rules || []).map((r) => [r.violation_type, r])),
    };
};

let loaded = null;
let loading = null;
const loadViolationTypes = () => {
    if (loaded) return Promise.resolve(loaded);
    loading = loading || api.get('/violations/punishments/')
        .then(({ data }) => { loaded = fromApi(data); return loaded; })
        .catch(() => { loading = null; return FALLBACK; });
    return loading;
};

/** { groups, eventGroup, rules }: the built-in list at once, the table's as soon as it loads. */
export function useViolationTypes() {
    const [types, setTypes] = useState(loaded || FALLBACK);
    useEffect(() => {
        let on = true;
        loadViolationTypes().then((t) => { if (on) setTypes(t); });
        return () => { on = false; };
    }, []);
    return types;
}

/** "5 hours", or "3 hours, 6 hours, then no entry" when the penalty changes with the offense number. */
// The penalty for the 1st, 2nd and 3rd offense, one per table column: "3 hours", "6 hours", "No entry"
export const offenseCells = (rule) => (rule
    ? [0, 1, 2].map((i) => { const o = rule.offenses[i] || rule.offenses[rule.offenses.length - 1]; return o.hours > 0 ? o.punishment.replace(' community service', '') : 'No entry'; })
    : ['—', '—', '—']);

export const penaltyText = (rule) => {
    if (!rule) return '';
    const p = rule.offenses.map((o) => (o.hours > 0 ? o.punishment.replace(' community service', '') : 'no entry'));
    return p.every((x) => x === p[0]) ? p[0] : `${p[0]}, ${p[1]}, then ${p[2]}`;
};
