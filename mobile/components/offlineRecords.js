import AsyncStorage from '@react-native-async-storage/async-storage';

// The student's last-loaded violations and e-tickets, kept on the phone so the e-tickets (and the digital
// e-ticket shown to a guard) still open with no data. Saved by the shell (components/StudentShell.jsx) every
// time fresh lists arrive, read when the app starts, and deleted at logout (phones can be shared).
const PREFIX = 'osaconnect:records:';

export async function saveOfflineRecords(username, records) {
    if (!username) return;
    try {
        await AsyncStorage.setItem(PREFIX + username, JSON.stringify({ savedAt: Date.now(), ...records }));
    } catch { /* storage full or unavailable: the app works without it */ }
}

// { violations, tickets, savedAt } or null
export async function readOfflineRecords(username) {
    if (!username) return null;
    try {
        const raw = await AsyncStorage.getItem(PREFIX + username);
        const saved = raw ? JSON.parse(raw) : null;
        return saved && Array.isArray(saved.tickets) ? saved : null;
    } catch {
        return null;
    }
}

export async function clearOfflineRecords() {
    try {
        const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
        if (keys.length) await AsyncStorage.multiRemove(keys);
    } catch { /* nothing saved */ }
}
