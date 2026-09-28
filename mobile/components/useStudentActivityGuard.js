import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { showAlert } from './showAlert';
import { isTrackingSession } from './backgroundTracking';

// Students only (guards and staff are never timed out):
// - Leaving the app (Home, switching apps, screen off) does NOT stop a running service session: its
//   location keeps being checked in the background (backgroundTracking.js), and only leaving the site
//   or turning location off stops it.
// - 5 minutes without touching the app logs out, except while a session runs (the phone sits in a
//   pocket while serving). Logout stops a running session.
const IDLE_LIMIT_MS = 5 * 60 * 1000;

let lastActivity = Date.now();
// Called from the root view on every touch
export const markActivity = () => {
    lastActivity = Date.now();
};

export function useStudentActivityGuard() {
    const { user, logout } = useAuth();
    const studentId = user?.role === 'student' ? user.username : null;

    useEffect(() => {
        if (!studentId) return;
        markActivity();

        let loggingOut = false;
        const checkIdle = async () => {
            if (loggingOut || Date.now() - lastActivity < IDLE_LIMIT_MS) return;
            if (await isTrackingSession()) {
                markActivity(); // serving: start the idle clock over once the session ends
                return;
            }
            loggingOut = true;
            await logout('idle');
            showAlert('Logged out', 'You were logged out after 5 minutes of inactivity.');
        };

        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') checkIdle();
        });
        const interval = setInterval(checkIdle, 15000);

        return () => {
            sub.remove();
            clearInterval(interval);
        };
        // logout is recreated every render; the effect only needs to restart for a different student
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId]);
}
