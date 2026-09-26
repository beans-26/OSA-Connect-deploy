import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useStudentTheme } from './useStudentTheme';
import { ACTIVITY_KEY, logoutStudent } from './studentSession';

// Students only (guards, staff, and admins are never timed out): after 1 hour without any activity,
// "Still there?" appears with a 60-second countdown. No response stops a running service timer and logs out.
// The last activity time lives in localStorage so every open tab shares it, and it's checked by
// timestamp, so a phone that locked or slept past the deadline logs out as soon as the page is back.
const IDLE_LIMIT_MS = 60 * 60 * 1000;
const WARNING_MS = 60 * 1000;
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel', 'mousemove'];

const isStudent = () => {
    try {
        return JSON.parse(localStorage.getItem('user') || '{}').role === 'student';
    } catch {
        return false;
    }
};

const lastActivity = () => {
    const saved = Number(localStorage.getItem(ACTIVITY_KEY));
    if (saved) return saved;
    // First check after login (or an older session): start counting from now
    const now = Date.now();
    localStorage.setItem(ACTIVITY_KEY, String(now));
    return now;
};

const markActive = () => localStorage.setItem(ACTIVITY_KEY, String(Date.now()));

const StudentIdleGuard = () => {
    const navigate = useNavigate();
    const { isDarkMode } = useStudentTheme();
    const [secondsLeft, setSecondsLeft] = useState(null); // null: no warning showing
    const warningRef = useRef(false);
    const endingRef = useRef(false);

    useEffect(() => {
        let lastWrite = 0;
        const onActivity = () => {
            // Only the "I'm still here" button answers the warning
            if (warningRef.current || !isStudent()) return;
            const now = Date.now();
            if (now - lastWrite < 5000) return; // mousemove fires constantly
            lastWrite = now;
            markActive();
        };

        const check = async () => {
            if (endingRef.current) return;
            if (!isStudent()) {
                warningRef.current = false;
                setSecondsLeft(null);
                return;
            }
            const idle = Date.now() - lastActivity();
            if (idle >= IDLE_LIMIT_MS + WARNING_MS) {
                endingRef.current = true;
                warningRef.current = false;
                setSecondsLeft(null);
                await logoutStudent(navigate, 'You were logged out after 1 hour of inactivity. Any running service timer was stopped.');
                endingRef.current = false;
            } else if (idle >= IDLE_LIMIT_MS) {
                warningRef.current = true;
                setSecondsLeft(Math.ceil((IDLE_LIMIT_MS + WARNING_MS - idle) / 1000));
            } else if (warningRef.current) {
                // Answered in another tab
                warningRef.current = false;
                setSecondsLeft(null);
            }
        };

        ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
        document.addEventListener('visibilitychange', check);
        const interval = setInterval(check, 1000);
        check();
        return () => {
            ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
            document.removeEventListener('visibilitychange', check);
            clearInterval(interval);
        };
    }, [navigate]);

    const stillHere = () => {
        markActive();
        warningRef.current = false;
        setSecondsLeft(null);
    };

    if (secondsLeft === null) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-5" role="alertdialog" aria-labelledby="idle-title">
            {/* Inline background/height: .student-ui sets both and would win over utility classes */}
            <div
                className="student-ui w-full max-w-[400px] rounded-3xl p-6 text-center"
                data-theme={isDarkMode ? 'dark' : 'light'}
                style={{ backgroundColor: 'var(--s-card)', minHeight: 0 }}
            >
                <Clock size={36} className="mx-auto mb-3 text-[var(--s-primary)]" />
                <h3 id="idle-title" className="text-lg font-black text-[var(--s-text)]">Still there?</h3>
                <p className="mt-2 text-sm leading-5 text-[var(--s-muted)]">
                    {"You haven't used OSAConnect for an hour. You'll be logged out and any running service timer will stop in"}
                </p>
                <p className="my-4 text-5xl font-black tabular-nums text-[var(--s-danger)]">{secondsLeft}</p>
                <button onClick={stillHere} className="w-full rounded-xl bg-[var(--s-primary)] p-3.5 text-sm font-bold uppercase tracking-[1px] text-white">
                    {"I'm still here"}
                </button>
            </div>
        </div>
    );
};

export default StudentIdleGuard;
