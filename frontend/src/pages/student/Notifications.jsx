import { useEffect, useRef } from 'react';
import { BellOff } from 'lucide-react';
import NotificationItem from '../../components/NotificationItem';
import { useStudentShell } from '../../components/StudentShell';

// Mirrors mobile/app/student/notifications.jsx. Opening the page marks everything read (the new ones keep
// their dot until the student leaves).
const NotificationList = () => {
    const { notifications, seen, markAllRead } = useStudentShell();
    const newIds = useRef(null);
    if (newIds.current === null && notifications.length) newIds.current = new Set(notifications.filter((n) => !seen.has(n.id)).map((n) => n.id));
    useEffect(() => { markAllRead(); }, [markAllRead]);

    return (
        <main className="mx-auto w-full max-w-xl px-4 pb-10 pt-4">
            {notifications.length === 0 ? (
                <div className="mt-16 flex flex-col items-center text-center">
                    <BellOff size={34} className="text-[var(--s-muted)]" />
                    <p className="mt-3 text-sm font-semibold text-[var(--s-text)]">No notifications</p>
                    <p className="mt-1 text-xs text-[var(--s-muted)]">Updates about your violations and service hours show up here.</p>
                </div>
            ) : (
                <ul className="overflow-hidden rounded-[20px] bg-[var(--s-card)] shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                    {notifications.map((n) => <NotificationItem key={n.id} n={n} fresh={newIds.current?.has(n.id)} />)}
                </ul>
            )}
        </main>
    );
};

export default NotificationList;
