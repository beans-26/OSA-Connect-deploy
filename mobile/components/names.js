// A middle name is written out in full ("Santos", "Dela Cruz"), never an initial ("S", "S."): every word at
// least 2 letters, no periods. Same rule as the server (middle_name_error in backend core/views.py) and
// frontend/src/lib/names.js.
const LETTER = "A-Za-zÀ-ÖØ-öø-ÿ";
const MIDDLE_NAME_WORD = new RegExp(`^[${LETTER}]+(?:['-][${LETTER}]+)*$`);
const isNameWord = (word) => MIDDLE_NAME_WORD.test(word) && word.replace(/['-]/g, '').length >= 2;

export const MIDDLE_NAME_ERROR = 'Type your full middle name (for example Santos), not just the initial.';

/** The error for an entered middle name that's only an initial; null when it's fine or empty (optional). */
export const middleNameError = (value) => {
    const name = String(value || '').trim();
    if (!name) return null;
    return name.includes('.') || !name.split(/\s+/).every(isNameWord) ? MIDDLE_NAME_ERROR : null;
};
