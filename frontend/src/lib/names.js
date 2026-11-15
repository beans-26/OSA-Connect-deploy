// Names are first and last only (no middle name or initial, since 2026-11; the server does the same).

// Words that start a last name, and suffixes (same lists as backend core/models.py)
const LAST_NAME_PARTICLES = new Set(['de', 'del', 'dela', 'delos', 'la', 'las', 'los', 'san', 'santa', 'sta', 'sta.', 'sto', 'sto.', 'santo', 'van', 'von', 'di', 'da', 'dos', 'du', 'mac', 'mc']);
const NAME_SUFFIXES = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'v']);

/** "Juan Santos Dela Cruz" -> "Juan Dela Cruz": a full name without the middle name, read the same way as the
 *  server (student_name_parts): last word plus particles = last name, the word before = the middle name (dropped). */
export const shortenFullName = (name) => {
    const words = String(name || '').trim().split(/\s+/).filter(Boolean);
    const suffix = words.length > 2 && NAME_SUFFIXES.has(words[words.length - 1].toLowerCase().replace(/,$/, '')) ? words.pop() : '';
    if (words.length < 3) return [...words, suffix].filter(Boolean).join(' ');
    let i = words.length - 1;
    while (i - 1 >= 1 && LAST_NAME_PARTICLES.has(words[i - 1].toLowerCase())) i -= 1;
    const parts = i >= 2 ? [...words.slice(0, i - 1), ...words.slice(i)] : words;
    return [...parts, suffix].filter(Boolean).join(' ');
};

/** The name pages show: "Juan Dela Cruz", first and last name (backend display_name).
 *  `s` is a student, or a report's student_details. */
export const studentName = (s) => s?.display_name || shortenFullName(s?.name);

/** The "Reported by" label of a report from its reporter_role (backend report_reporter_role):
 *  "Reported by guard", "Reported by faculty", "Reported by OSA". */
export const reportedByLabel = (role) => ({ guard: 'Reported by guard', faculty: 'Reported by faculty', admin: 'Reported by OSA' })[role] || 'Reported by';
