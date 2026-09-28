import { AppState } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

// Keeps checking the student's location while a service session runs, also when the app is in the
// background (Android foreground service, "Allow all the time" location). Every fix goes to
// POST /timelogs/location_ping/, and the server decides: 30 s outside the site or location turned
// off ends the session. When that happens the student gets a notification.
// Needs a development/standalone build: Expo Go can't run background location, so there the pings
// only go out while the app is open.

export const TRACKING_TASK = 'osaconnect-session-tracking';
const SESSION_KEY = 'trackedSession'; // { eticketId }
export const LAST_RECEIPT_KEY = 'lastStoppedReceipt'; // shown when the app is opened again
const PING_EVERY_MS = 15000;
const WATCHDOG_EVERY_MS = 10000;

Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const STOPPED_TEXT = {
    left_area: 'You left your service area, so your service timer stopped. Open OSAConnect to see your receipt.',
    location_off: 'Your location was turned off, so your service timer stopped. Open OSAConnect to see your receipt.',
};

// Tells the student their timer stopped (a system notification when the app isn't on screen)
export const notifyTimerStopped = async (reason) => {
    if (AppState.currentState === 'active') return; // the dashboard shows the receipt instead
    try {
        await Notifications.scheduleNotificationAsync({
            content: { title: 'Service timer stopped', body: STOPPED_TEXT[reason] || 'Your service timer stopped. Open OSAConnect to see your receipt.' },
            trigger: null,
        });
    } catch {
        // Notifications not allowed; the receipt still shows when the app is opened
    }
};

const getSession = async () => {
    try {
        return JSON.parse((await AsyncStorage.getItem(SESSION_KEY)) || 'null');
    } catch {
        return null;
    }
};

export const isTrackingSession = async () => !!(await getSession());

// Sends one ping; when the server says the session ended, stops tracking and notifies
let lastPingAt = 0;
export const sendLocationPing = async (body, { force = false } = {}) => {
    const session = await getSession();
    if (!session) return null;
    if (!force && Date.now() - lastPingAt < PING_EVERY_MS - 1000) return null;
    lastPingAt = Date.now();
    const { data } = await api.post('/timelogs/location_ping/', { eticket_id: session.eticketId, ...body }, { timeout: 15000 });
    if (data?.state === 'stopped' || data?.state === 'none') {
        await stopTracking();
        if (data.state === 'stopped') {
            if (data.receipt) await AsyncStorage.setItem(LAST_RECEIPT_KEY, JSON.stringify(data.receipt));
            await notifyTimerStopped(data.reason);
        }
    }
    return data;
};

const pingFromCoords = (coords) => sendLocationPing({ lat: coords.latitude, lng: coords.longitude, accuracy_m: coords.accuracy });

// Runs for every location fix, in the foreground and in the background.
// Defined at module level (imported by app/_layout.jsx) so Android can wake it without the UI.
if (!TaskManager.isTaskDefined(TRACKING_TASK)) {
    TaskManager.defineTask(TRACKING_TASK, async ({ data, error }) => {
        if (error) {
            try {
                if (!(await Location.hasServicesEnabledAsync())) await sendLocationPing({ location_off: true }, { force: true });
            } catch { /* offline; the server stops silent sessions after 3 minutes */ }
            return;
        }
        const latest = data?.locations?.[data.locations.length - 1];
        if (latest) {
            try { await pingFromCoords(latest.coords); } catch { /* next fix retries */ }
        }
    });
}

// Location turned off stops the fixes (and so the task), so check the setting on a timer too.
// Android keeps the app's JavaScript running while the foreground service is up.
let watchdog = null;
const startWatchdog = () => {
    clearInterval(watchdog);
    watchdog = setInterval(async () => {
        try {
            if (!(await isTrackingSession())) return clearInterval(watchdog);
            if (!(await Location.hasServicesEnabledAsync())) await sendLocationPing({ location_off: true }, { force: true });
        } catch { /* offline; try again next tick */ }
    }, WATCHDOG_EVERY_MS);
};

/**
 * Starts tracking the session for `eticketId`. Returns { background } — false when background location
 * isn't allowed or available (Expo Go), in which case pings only go out while the app is open.
 */
export const startTracking = async (eticketId) => {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ eticketId }));
    startWatchdog();
    try {
        await Notifications.requestPermissionsAsync();
    } catch { /* no notification permission: tracking still works */ }
    try {
        let bg = await Location.getBackgroundPermissionsAsync();
        if (!bg.granted) bg = await Location.requestBackgroundPermissionsAsync();
        if (!bg.granted) return { background: false };
        if (!(await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK))) {
            await Location.startLocationUpdatesAsync(TRACKING_TASK, {
                accuracy: Location.Accuracy.High,
                timeInterval: PING_EVERY_MS,
                distanceInterval: 0,
                pausesUpdatesAutomatically: false,
                showsBackgroundLocationIndicator: true,
                foregroundService: {
                    notificationTitle: 'Service timer running',
                    notificationBody: 'OSAConnect is checking that you stay at your service site.',
                    notificationColor: '#1e3a8a',
                },
            });
        }
        return { background: true };
    } catch {
        return { background: false };
    }
};

export const stopTracking = async () => {
    clearInterval(watchdog);
    await AsyncStorage.removeItem(SESSION_KEY);
    try {
        if (await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK)) await Location.stopLocationUpdatesAsync(TRACKING_TASK);
    } catch { /* not running */ }
};
