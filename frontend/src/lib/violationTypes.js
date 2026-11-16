import { useEffect, useState } from 'react';

// The violations that can be reported, in the dropdowns of the report forms (components/ViolationPicker.jsx), Light
// first. They live in the database (the violation_types table, backend models.ViolationType) and are read from
// GET /api/violations/punishments/ (useViolationTypes below). This built-in copy is what the table starts with; the
// pages use it until the list arrives, or if it can't be loaded. Same as the app (mobile/components/violationTypes.js).
export const VIOLATION_GROUPS = [
    {
        id: 'light',
        label: 'Light Offenses',
        items: [
            'Curfew Violation',
            'No ID / Improper ID Sling',
            'No School Uniform',
            'Dress Code Violation',
            'Smoking',
            'Littering',
        ],
    },
    {
        id: 'less-grave',
        label: 'Less Grave Offenses',
        items: [
            'Verbal Abuse & Cyberbullying',
            'Stalking',
            'Coercion via Violence',
            'Indecent Behavior',
            'Alcohol',
            'Pornography',
            'Gambling',
            'ID Fraud',
            'Lab Tampering',
            'Exam Sabotage',
        ],
    },
];

// [value, label] for every violation, in dropdown order
export const VIOLATIONS = VIOLATION_GROUPS.flatMap((g) => g.items.map((v) => [v, v]));

// The handbook's escalating ones; every other violation is 5 hours each time
const ESCALATING = ['Curfew Violation', 'No ID / Improper ID Sling', 'No School Uniform', 'Dress Code Violation'];

// The admin's "Report Violation" (Students page) also lists a missed mandatory event: always EVENT_HOURS
// (EVENT_HOURS in backend core/views.py)
export const EVENT_VIOLATION = 'Failure to attend mandatory campus event';
export const EVENT_HOURS = 10;

// Short hours note shown next to each violation
export const hoursNote = (v) => (v === EVENT_VIOLATION ? `${EVENT_HOURS} h`
    : ESCALATING.includes(v) ? '3 h · 6 h · no entry' : '5 h');

// --- The list from the server's table ---
const EVENT_GROUP = { id: 'event', label: 'Mandatory Events', items: [EVENT_VIOLATION] };
// groups: Light and Less Grave (guards, faculty); eventGroup: the admin's extra dropdown; rules: {name: {category,
// offenses: [{offense, punishment, hours}]}} or null while only the built-in list is known; categories: [{id, label}]
const FALLBACK = { groups: VIOLATION_GROUPS, eventGroup: EVENT_GROUP, rules: null, categories: null };

const fromApi = (data) => {
    const categories = data.categories || [];
    const groups = categories
        .map((c) => ({ id: c.id, label: c.label, items: (data.rules || []).filter((r) => r.category === c.id).map((r) => r.violation_type) }))
        .filter((g) => g.items.length);
    return {
        groups: groups.filter((g) => g.id !== 'event'),
        eventGroup: groups.find((g) => g.id === 'event') || null,
        rules: Object.fromEntries((data.rules || []).map((r) => [r.violation_type, r])),
        categories,
    };
};

let loaded = null;
let loading = null;
export const loadViolationTypes = () => {
    if (loaded) return Promise.resolve(loaded);
    loading = loading || fetch('/api/violations/punishments/')
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('server'))))
        .then((data) => { loaded = fromApi(data); return loaded; })
        .catch(() => { loading = null; return FALLBACK; });
    return loading;
};

/** { groups, eventGroup, rules, categories }: the built-in list at once, the table's as soon as it loads. */
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
