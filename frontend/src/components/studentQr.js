// Reads a student ID QR code. Same rules as the mobile app's copy in
// mobile/components/studentQr.js; keep the two in sync.
//
// Accepted formats (all contain a student ID such as 2023303188):
//   - Profile Settings QR: the ID alone
//   - Registration QR: "ID NAME COURSE"
//   - "NAME, ID, COURSE"
//   - JSON with a student_id field
// Anything else (OSA action codes, location codes, random QRs) returns null.
const ID_PATTERN = /\b(20\d{7,})\b/;

export const parseStudentQr = (raw) => {
    const data = String(raw || '').trim();
    if (!data) return null;

    // JSON objects only: a bare ID like 2023303188 also parses as JSON (a number)
    if (data.startsWith('{')) {
        try {
            const parsed = JSON.parse(data);
            const match = String(parsed?.student_id ?? '').match(ID_PATTERN);
            return match ? { studentId: match[1] } : null;
        } catch {
            // Not valid JSON; fall through to the text formats
        }
    }

    const parts = data.split(',').map((p) => p.trim());
    if (parts.length >= 2) {
        const match = parts[1].match(ID_PATTERN);
        if (match) return { studentId: match[1], name: parts[0], course: parts[2] || '' };
    }

    const match = data.match(ID_PATTERN);
    return match ? { studentId: match[1] } : null;
};

export const NOT_A_STUDENT_QR = 'Not a student ID QR code. Only student ID codes can be scanned here.';
