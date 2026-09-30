// Violation types that can be reported: [value, label]. The value must match OSA's penalty table
// (PUNISHMENT_SYSTEM in backend/core/views.py). Same list as the app (mobile/constants/Data.js).
export const VIOLATIONS = [
    ['Curfew Violation', 'Curfew Violation'],
    ['No ID / Improper ID Sling', 'No ID / Improper ID Sling'],
    ['No School Uniform', 'No School Uniform'],
    ['Dress Code Violation', 'Dress Code Violation'],
];

// The admin's "Report Violation" (Students page) is only for students who missed a mandatory event;
// the admin sets the hours
export const EVENT_VIOLATION = 'Failure to attend mandatory campus event';
