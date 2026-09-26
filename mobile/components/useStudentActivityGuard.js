import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { stopActiveSession } from './studentSession';
import { showAlert } from './showAlert';

// Students only (guards and staff are never timed out):
// - Leaving the app (Home, switching apps, screen off) pauses a running service session: it ends with
//   the hours served so far kept, and the student scans the start QR again to continue.
// - 5 minutes without touching the app logs out (logout also stops a running session).
const IDLE_LIMIT_MS = 5 * 60 * 1000;
// A system dialog can background the app for a moment; don't end the session for that
const BACKGROUND_GRACE_MS = 2000;

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
            loggingOut = true;
            await logout();
            showAlert('Logged out', 'You were logged out after 5 minutes of inactivity. Any running service timer was stopped.');
        };

        let pauseTimer = null;
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                clearTimeout(pauseTimer);
                checkIdle();
            } else if (state === 'background') {
                clearTimeout(pauseTimer);
                pauseTimer = setTimeout(() => {
                    if (AppState.currentState !== 'active') stopActiveSession(studentId);
                }, BACKGROUND_GRACE_MS);
            }
        });
        const interval = setInterval(checkIdle, 15000);

        return () => {
            sub.remove();
            clearInterval(interval);
            clearTimeout(pauseTimer);
        };
        // logout is recreated every render; the effect only needs to restart for a different student
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId]);
}
