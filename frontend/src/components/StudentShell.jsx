import { Suspense, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, BellOff, House, Menu, SlidersHorizontal, User, X } from 'lucide-react';
import NotificationItem from './NotificationItem';
import { useStudentTheme } from './useStudentTheme';
import { logoutStudent } from './studentSession';
import { buildNotifications, hoursLabel, markSeen, readReminders, readSeen, remainingHours, saveReminders, readDataSaver, saveDataSaver, IDLE_REFRESH_MS, SAVER_REFRESH_MS } from '../lib/studentNotifications';
import usePolling from '../lib/usePolling';

// The layout route of every student page (mirrors mobile/components/StudentShell.jsx): a top bar with the menu,
// the page title and the notification bell, and the side menu (Home, Personal Info, Notifications,
// Settings, Log out). It stays mounted while the student moves between pages, so the menu slides
// closed over the next page. Pages read the shared theme, profile, tickets and notifications with useStudentShell().
const ShellContext = createContext(null);
export const useStudentShell = () => useContext(ShellContext);

const NAV = [
    { to: '/student/dashboard', label: 'Home', icon: House },
    { to: '/student/personal-info', label: 'Personal Info', icon: User },
    { to: '/student/notifications', label: 'Notifications', icon: Bell, badge: true },
    { to: '/student/settings', label: 'Settings', icon: SlidersHorizontal },
];

// Top bar title per page; back: a back arrow (to that page) instead of the menu button
const PAGES = {
    '/student/dashboard': { title: 'Home' },
    '/student/personal-info': { title: 'Personal Info' },
    '/student/notifications': { title: 'Notifications' },
    '/student/settings': { title: 'Settings' },
    '/student/settings/password': { title: 'Change password', back: '/student/settings' },
    '/student/help': { title: 'Help & Support', back: '/student/settings' },
};

// Set inline: the global colour-transition rule in index.css would override a transition class
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const slideStyle = { transition: `translate 320ms ${EASE}, transform 320ms ${EASE}, visibility 320ms` };
const fadeStyle = { transition: 'opacity 300ms ease-out' };

const BELL_MOTION = { transformOrigin: 'top right', transition: `opacity 180ms ease-out, transform 220ms ${EASE}, visibility 220ms` };
const BELL_OPEN = { ...BELL_MOTION, opacity: 1, transform: 'none', visibility: 'visible' };
const BELL_CLOSED = { ...BELL_MOTION, opacity: 0, transform: 'translateY(-6px) scale(0.97)', visibility: 'hidden' };

const initials = (name = '') => {
    const words = name.split(/\s+/).filter(Boolean);
    return ((words[0]?.[0] || '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase() || '?';
};

export default function StudentShell() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { title = '', back } = PAGES[pathname] || {};
    const theme = useStudentTheme();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [menuOpen, setMenuOpen] = useState(false);
    // The bell's panel: the latest notifications in place (the full list is on the Notifications page).
    // The ones that were new when it opened keep their highlight while it's open.
    const [bellOpen, setBellOpen] = useState(false);
    const [bellNew, setBellNew] = useState(() => new Set()); // the ids that were new when it opened
    const bellRef = useRef(null);
    const [profile, setProfile] = useState(null);
    const [records, setRecords] = useState({ violations: [], tickets: [] });
    const [reminders, setRemindersState] = useState(readReminders);
    const [dataSaver, setDataSaverState] = useState(readDataSaver);
    const [seen, setSeen] = useState(() => readSeen(user.username));
    const [logoutAsk, setLogoutAsk] = useState(null); // null | { timerRunning }
    const [loggingOut, setLoggingOut] = useState(false);

    // The dashboard loads the same lists and hands them over (setRecords): no second download within 25 s
    const recordsAt = useRef(0);
    const takeRecords = useCallback((next) => { recordsAt.current = Date.now(); setRecords(next); }, []);
    const load = useCallback(async () => {
        if (!user.username || Date.now() - recordsAt.current < 25000) return;
        const id = encodeURIComponent(user.username);
        try {
            const [v, t] = await Promise.all([
                fetch(`/api/violations/?student_id=${id}`).then((r) => (r.ok ? r.json() : [])),
                fetch(`/api/etickets/?student_id=${id}&t=${Date.now()}`).then((r) => (r.ok ? r.json() : [])),
            ]);
            takeRecords({
                violations: v.filter((x) => x.student_details?.student_id === user.username),
                tickets: t.filter((x) => x.violation_details?.student_details?.student_id === user.username),
            });
        } catch { /* offline: keep the last lists */ }
    }, [user.username]);

    useEffect(() => {
        if (!user.username) return;
        fetch(`/api/students/${encodeURIComponent(user.username)}/`).then((r) => (r.ok ? r.json() : null)).then((p) => p && setProfile(p)).catch(() => {});
    }, [user.username]);
    usePolling(load, dataSaver ? SAVER_REFRESH_MS : IDLE_REFRESH_MS);

    useEffect(() => { setMenuOpen(false); setBellOpen(false); }, [pathname]);
    useEffect(() => {
        if (!bellOpen) return undefined;
        const away = (e) => { if (!bellRef.current?.contains(e.target)) setBellOpen(false); };
        const onKey = (e) => e.key === 'Escape' && setBellOpen(false);
        document.addEventListener('pointerdown', away);
        window.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('pointerdown', away); window.removeEventListener('keydown', onKey); };
    }, [bellOpen]);
    useEffect(() => {
        if (!menuOpen) return undefined;
        const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [menuOpen]);

    const notifications = buildNotifications(records.violations, records.tickets, { reminders });
    const unread = notifications.filter((n) => !seen.has(n.id)).length;
    const markAllRead = useCallback(() => {
        const ids = notifications.map((n) => n.id);
        if (ids.every((id) => seen.has(id))) return;
        markSeen(user.username, ids);
        setSeen(readSeen(user.username));
    }, [notifications, seen, user.username]);
    const setReminders = (on) => { saveReminders(on); setRemindersState(on); };
    const setDataSaver = (on) => { saveDataSaver(on); setDataSaverState(on); };

    const toggleBell = () => {
        if (bellOpen) return setBellOpen(false);
        setBellNew(new Set(notifications.filter((n) => !seen.has(n.id)).map((n) => n.id)));
        setBellOpen(true);
        markAllRead();
    };

    const openLogout = async () => {
        setMenuOpen(false);
        let running = true; // can't check (offline): keep the warning
        try {
            const r = await fetch(`/api/etickets/?student_id=${encodeURIComponent(user.username)}`);
            if (r.ok) running = (await r.json()).some((t) => t.status === 'Ongoing');
        } catch { /* keep the warning */ }
        setLogoutAsk({ timerRunning: running });
    };
    const logout = async () => {
        setLoggingOut(true);
        await logoutStudent(navigate);
    };

    const left = remainingHours(records.tickets);
    const name = profile?.name || user.full_name || user.name || 'Student';
    const value = {
        ...theme, user, profile, setProfile, records, setRecords: takeRecords, reload: load,
        notifications, unread, seen, markAllRead, reminders, setReminders, dataSaver, setDataSaver, openLogout,
    };

    return (
        <ShellContext.Provider value={value}>
            <div className="student-ui" data-theme={theme.isDarkMode ? 'dark' : 'light'}>
                {/* Top bar */}
                <div className="sticky top-0 z-30 bg-[var(--s-bg)]/90 backdrop-blur">
                    <div className="mx-auto flex h-14 w-full max-w-xl items-center justify-between px-3">
                        {back ? (
                            <button onClick={() => navigate(back)} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--s-text)] hover:bg-[var(--s-bg)]">
                                <ArrowLeft size={24} />
                            </button>
                        ) : (
                            <button onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen} className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--s-text)] hover:bg-[var(--s-bg)]">
                                <Menu size={24} />
                            </button>
                        )}
                        <h1 className="truncate px-2 text-[17px] font-semibold text-[var(--s-text)]">{title}</h1>
                        {/* No bell on the Notifications page itself */}
                        {pathname === '/student/notifications' ? <span className="h-10 w-10" aria-hidden="true" /> : (
                            <div ref={bellRef} className="relative">
                                <button onClick={toggleBell} aria-label={`Notifications${unread ? `, ${unread} new` : ''}`} aria-expanded={bellOpen} aria-haspopup="dialog" className={`relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--s-text)] hover:bg-[var(--s-bg)] ${bellOpen ? 'bg-[var(--s-bg)]' : ''}`}>
                                    <Bell size={23} />
                                    {unread > 0 && (
                                        <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--s-danger)] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[var(--s-card)]">
                                            {unread > 9 ? '9+' : unread}
                                        </span>
                                    )}
                                </button>
                                {/* Stays mounted so it can fade and drop in / out (inline: the global colour-transition rule would override a class) */}
                                {(
                                    <div role="dialog" aria-label="Notifications" aria-hidden={!bellOpen} inert={!bellOpen ? '' : undefined} style={bellOpen ? BELL_OPEN : BELL_CLOSED} className="absolute right-0 top-12 z-40 w-[min(22rem,calc(100vw-24px))] overflow-hidden rounded-[20px] bg-[var(--s-card)] text-left shadow-[0_8px_30px_rgba(15,23,42,0.12)]">
                                        <p className="px-4 pb-2 pt-4 text-[17px] font-semibold text-[var(--s-text)]">Notifications</p>
                                        {notifications.length === 0 ? (
                                            <div className="flex flex-col items-center px-4 py-8 text-center">
                                                <BellOff size={26} className="text-[var(--s-muted)]" />
                                                <p className="mt-2 text-[15px] text-[var(--s-muted)]">No notifications yet.</p>
                                            </div>
                                        ) : (
                                            <ul className="max-h-[60vh] overflow-y-auto">
                                                {notifications.slice(0, 5).map((n) => <NotificationItem key={n.id} n={n} fresh={bellNew.has(n.id)} compact />)}
                                            </ul>
                                        )}
                                        {notifications.length > 0 && (
                                            <button onClick={() => navigate('/student/notifications')} className="w-full border-t border-[var(--s-border)] px-4 py-3.5 text-center text-[15px] font-medium text-[var(--s-accent)] hover:bg-[var(--s-bg)]">
                                                See all notifications{notifications.length > 5 ? ` (${notifications.length})` : ''}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Pages load on first visit; the top bar and menu stay on screen meanwhile */}
                <Suspense fallback={<div className="flex justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--s-accent)] border-t-transparent" /></div>}>
                    <div key={pathname} className="page-enter"><Outlet /></div>
                </Suspense>

                {/* Side menu */}
                <div className={`fixed inset-0 z-[70] bg-black/40 motion-reduce:!transition-none ${menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={() => setMenuOpen(false)} style={fadeStyle} aria-hidden="true" />
                <aside
                    role="dialog"
                    aria-modal="true"
                    aria-label="Menu"
                    aria-hidden={!menuOpen}
                    inert={!menuOpen ? '' : undefined}
                    className={`fixed inset-y-0 left-0 z-[71] flex w-[280px] max-w-[82vw] flex-col bg-[var(--s-card)] shadow-2xl will-change-transform motion-reduce:!transition-none ${menuOpen ? 'visible translate-x-0' : 'invisible -translate-x-[calc(100%+32px)]'}`}
                    style={slideStyle}
                >
                    <div className="flex items-center gap-3 px-4 pb-3 pt-5">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--s-accent)] text-[15px] font-semibold text-white">{initials(name)}</div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[17px] font-semibold text-[var(--s-text)]">{name}</p>
                            <p className="truncate text-[13px] text-[var(--s-muted)]">{user.username}</p>
                        </div>
                        <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--s-muted)] hover:bg-[var(--s-bg)]">
                            <X size={24} />
                        </button>
                    </div>
                    {left > 0.001 && (
                        <p className="mx-4 mb-2 rounded-[14px] bg-[var(--s-warn-bg)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--s-warn-text)]">{hoursLabel(left)} of service remaining</p>
                    )}
                    <nav className="mx-3 mt-2 overflow-hidden rounded-[20px] bg-[var(--s-bg)]">
                        {NAV.map(({ to, label, icon: Icon, badge }) => {
                            const active = pathname === to || (to === '/student/settings' && pathname.startsWith('/student/settings'));
                            return (
                                <button
                                    key={to}
                                    onClick={() => { setMenuOpen(false); if (!active) navigate(to); }}
                                    aria-current={active ? 'page' : undefined}
                                    className={`s-row flex w-full items-center pl-4 text-left transition-colors ${active ? 'text-[var(--s-accent)]' : 'text-[var(--s-text)] hover:bg-[var(--s-card)]'}`}
                                >
                                    <Icon size={24} className="mr-4 shrink-0" />
                                    <span className="s-row-body flex min-w-0 flex-1 items-center gap-3 py-4 pr-4">
                                        <span className={`flex-1 text-[17px] ${active ? 'font-semibold' : 'font-normal'}`}>{label}</span>
                                        {badge && unread > 0 && <span className="rounded-full bg-[var(--s-danger)] px-2 py-0.5 text-[12px] font-semibold text-white">{unread}</span>}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {logoutAsk && (
                    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]" onClick={() => setLogoutAsk(null)}>
                        <div role="alertdialog" aria-modal="true" aria-labelledby="logout-title" className="w-full max-w-[300px] rounded-[20px] bg-[var(--s-card)] p-5 text-center shadow-[0_8px_30px_rgba(15,23,42,0.12)]" onClick={(e) => e.stopPropagation()}>
                            <p id="logout-title" className="text-[17px] font-semibold text-[var(--s-text)]">Log out?</p>
                            <p className="mt-1 text-[15px] leading-snug text-[var(--s-muted)]">{logoutAsk.timerRunning ? 'Your running service timer will stop.' : 'Are you sure you want to log out of your account?'}</p>
                            <div className="mt-4 flex gap-2">
                                <button onClick={() => setLogoutAsk(null)} className="flex-1 rounded-full bg-[var(--s-bg)] py-2.5 text-[15px] font-medium text-[var(--s-text)] hover:brightness-95">Cancel</button>
                                <button onClick={logout} disabled={loggingOut} className="flex-1 rounded-full bg-rose-600 py-2.5 text-[15px] font-medium text-white hover:bg-rose-700 disabled:opacity-60">{loggingOut ? 'Logging out…' : 'Log Out'}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ShellContext.Provider>
    );
}
