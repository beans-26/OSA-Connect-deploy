// Reads a student ID QR code. Same rules as the website's copy in
// frontend/src/components/studentQr.js; keep the two in sync.
//
// Accepted formats (all contain a student ID such as 2023303188):
//   - Profile Settings QR: the ID alone
//   - Registration QR: "ID FIRST MIDDLE LAST COURSE"
//   - Name before the ID ("DELA CRUZ, JUAN S. 2023303188 BSIT"), "NAME, ID, COURSE"
//   - The course written out ("BS Information Technology", or without "BS") or abbreviated ("BSIT", "BS-IT")
//   - JSON with a student_id field
// Anything else (OSA action codes, location codes, random QRs) returns null.
import { COURSES } from '../constants/Data';

const ID_PATTERN = /\b(20\d{8})\b/; // USTP IDs: 10 numbers starting with 20

// Short forms of the courses (compared without spaces, dots and dashes: "BS-IT", "B.S. IT" -> "BSIT")
const COURSE_ABBREVIATIONS = {
    'BS Information Technology': ['BSIT'],
    'BS Computer Science': ['BSCS'],
    'BS Data Science': ['BSDS'],
    'BS Technology Communication Management': ['BSTCM'],
    'BS Civil Engineering': ['BSCE'],
    'BS Electronics Engineering': ['BSECE', 'BSELECE'],
    'BS Electrical Engineering': ['BSEE'],
    'BS Mechanical Engineering': ['BSME'],
    'BS Computer Engineering': ['BSCPE', 'BSCOE'],
    'BS Geodetic Engineering': ['BSGE'],
    'BS Applied Physics': ['BSAP'],
    'BS Applied Mathematics': ['BSAM', 'BSAMATH'],
    'BS Chemistry': ['BSCHEM'],
    'BS Environmental Science': ['BSES', 'BSENVISCI'],
    'BS Food Technology': ['BSFT'],
    'BS AutoTronics': ['BSAT'],
    'BS Electro-Mechanical Technology': ['BSEMT'],
    'BS Electronics Technology': ['BSET'],
    'BS Energy Systems and Management': ['BSESM'],
    'BS Manufacturing Engineering Technology': ['BSMET'],
    STEM: ['STEM'],
};
const squash = (text) => text.toUpperCase().replace(/[\s.-]/g, '');
const ABBREVIATION_TO_COURSE = Object.fromEntries(
    Object.entries(COURSE_ABBREVIATIONS).flatMap(([course, short]) => short.map((s) => [s, course])),
);

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

    const match = data.match(ID_PATTERN);
    if (!match) return null;
    const at = data.indexOf(match[1]);
    const before = cleanPart(data.slice(0, at));
    const after = cleanPart(data.slice(at + match[1].length));

    // The course: at the end of what follows the ID, else of what comes before it
    let course = courseAtEnd(after);
    let afterRest = course ? after.slice(0, after.length - course.length).trim() : after;
    let beforeRest = before;
    if (!course) {
        course = courseAtEnd(before);
        if (course) beforeRest = before.slice(0, before.length - course.length).trim();
    }
    // The name: the words before the ID when there are any, else the ones after it
    const nameText = cleanPart(/\p{L}/u.test(beforeRest) ? beforeRest : afterRest);
    return {
        studentId: match[1],
        ...(nameText && { name: readName(nameText) }),
        ...(course && { course: course.name }),
    };
};

// Without the separators around a part of the code (commas, slashes, pipes)
const cleanPart = (text) => text.replace(/^[\s,;|/]+|[\s,;|/]+$/g, '').trim();

// The course `text` ends with: { name, length } (its length in `text`), or null. Full names first (also
// without "BS", as the admin's Students page writes them), then short forms in the last one or two words.
const courseAtEnd = (text) => {
    const lower = text.toLowerCase();
    for (const name of [...COURSES].sort((a, b) => b.length - a.length)) {
        for (const form of [name, name.replace(/^BS\s+/i, '')]) {
            const end = form.toLowerCase();
            if (lower === end || lower.endsWith(` ${end}`)) return { name, length: form.length };
        }
    }
    const words = text.split(/\s+/).filter(Boolean);
    for (const count of [2, 1]) {
        if (words.length < count) continue;
        const tail = words.slice(-count).join(' ');
        const course = ABBREVIATION_TO_COURSE[squash(tail)];
        if (course) return { name: course, length: tail.length };
    }
    return null;
};

// "DELA CRUZ, JUAN S." -> "Juan S. Dela Cruz"; "JUAN SANTOS DELA CRUZ" -> "Juan Santos Dela Cruz"
const readName = (text) => {
    const [last, rest] = text.split(',').map((p) => p.trim());
    const ordered = rest ? `${rest} ${last}` : text;
    return ordered.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
        .replace(/(^|[\s'-])(\p{L})/gu, (m, sep, letter) => sep + letter.toUpperCase());
};

export const NOT_A_STUDENT_QR = 'Not a student ID QR code. Only student ID codes can be scanned here.';
