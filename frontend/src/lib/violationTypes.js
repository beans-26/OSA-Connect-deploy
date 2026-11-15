// Violation types that can be reported, in the two dropdowns of the report forms (components/ViolationPicker.jsx), Light first.
// Each value must match OSA's penalty table (PUNISHMENT_SYSTEM in backend/core/views.py). Same list as the app
// (mobile/app/staff/dashboard.jsx).
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
