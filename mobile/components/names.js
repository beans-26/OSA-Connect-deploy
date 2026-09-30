// The middle name is required and written out in full ("Santos", "Dela Cruz"), never an initial ("S", "S."):
// every word at least 2 letters, no periods. Students without one type "N/A". Same rule as the server
// (middle_name_error in backend core/views.py) and frontend/src/lib/names.js.
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
