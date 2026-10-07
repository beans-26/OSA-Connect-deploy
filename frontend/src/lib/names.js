// The middle name is required and written out in full ("Santos", "Dela Cruz"), never an initial ("S", "S."):
// every word at least 2 letters, no periods. Students without one type "N/A". Same rule as the server
// (middle_name_error in backend core/views.py) and mobile/components/names.js.
const LETTER = "A-Za-zÀ-ÖØ-öø-ÿ";
const MIDDLE_NAME_WORD = new RegExp(`^[${LETTER}]+(?:['-][${LETTER}]+)*$`);
const isNameWord = (word) => MIDDLE_NAME_WORD.test(word) && word.replace(/['-]/g, '').length >= 2;

export const MIDDLE_NAME_HINT = 'Type N/A if none';

/** True when the student typed N/A (no middle name). */
export const isNoMiddleName = (value) => /^n\s*\/?\s*a$/i.test(String(value || '').trim());

/** The middle name to put in the full name and QR code: '' for N/A. */
export const middleNameText = (value) => (isNoMiddleName(value) ? '' : String(value || '').trim());

/** The error for the middle name field, or null when it's a full middle name or N/A. */
export const middleNameError = (value) => {
    const name = String(value || '').trim();
    if (!name) return "Type your middle name, or N/A if you don't have one.";
    if (isNoMiddleName(name)) return null;
    return name.includes('.') || !name.split(/\s+/).every(isNameWord)
        ? "Type your full middle name (for example Santos), not just the initial. Type N/A if you don't have one."
        : null;
};

// Words that start a last name, and suffixes (same lists as backend core/models.py)
const LAST_NAME_PARTICLES = new Set(['de', 'del', 'dela', 'delos', 'la', 'las', 'los', 'san', 'santa', 'sta', 'sta.', 'sto', 'sto.', 'santo', 'van', 'von', 'di', 'da', 'dos', 'du', 'mac', 'mc']);
const NAME_SUFFIXES = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'v']);

/** "Juan Santos Dela Cruz" -> "Juan S. Dela Cruz": a full name with the middle name as an initial, read the
 *  same way as the server (student_name_parts): last word plus particles = last name, the word before = middle. */
export const shortenFullName = (name) => {
    const words = String(name || '').trim().split(/\s+/).filter(Boolean);
    const suffix = words.length > 2 && NAME_SUFFIXES.has(words[words.length - 1].toLowerCase().replace(/,$/, '')) ? words.pop() : '';
    if (words.length < 3) return [...words, suffix].filter(Boolean).join(' ');
    let i = words.length - 1;
    while (i - 1 >= 1 && LAST_NAME_PARTICLES.has(words[i - 1].toLowerCase())) i -= 1;
    const parts = i >= 2
        ? [...words.slice(0, i - 1), `${words[i - 1][0].toUpperCase()}.`, ...words.slice(i)]
        : words;
    return [...parts, suffix].filter(Boolean).join(' ');
};

/** The name pages show: "Juan D. Dela Cruz", the middle name as an initial (backend display_name).
 *  `s` is a student, or a report's student_details. */
export const studentName = (s) => s?.display_name || shortenFullName(s?.name);

/** The "Reported by" label of a report from its reporter_role (backend report_reporter_role):
 *  "Reported by guard", "Reported by faculty", "Reported by OSA". */
export const reportedByLabel = (role) => ({ guard: 'Reported by guard', faculty: 'Reported by faculty', admin: 'Reported by OSA' })[role] || 'Reported by';
