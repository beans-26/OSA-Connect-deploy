import { Suspense, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, BookOpen, House, LogOut, Settings as SettingsIcon, Ticket, User } from 'lucide-react';
import StudentGuide from './StudentGuide';
import TicketDetails from './TicketDetails';
import { useStudentTheme } from './useStudentTheme';
import logoIcon from '../assets/osaconnect-icon.png';
import logoIconDark from '../assets/osaconnect-icon-dark.png';
import { logoutStudent } from './studentSession';
import { timeGreeting } from '../lib/greeting';
import { buildNotifications, markSeen, readReminders, readSeen, saveReminders, readDataSaver, saveDataSaver, IDLE_REFRESH_MS, SAVER_REFRESH_MS } from '../lib/studentNotifications';
import usePolling from '../lib/usePolling';

// The layout route of every student page (mirrors mobile/components/StudentShell.jsx): a top bar with the
// page title (and a back arrow on sub-pages), the bell on Home (opens Notifications) and the Settings button on Profile,
// and the floating tab bar at the bottom (E-Tickets, Home in the middle, Profile; Log out is in Settings). It
// stays mounted while the student moves between pages. Pages read the shared theme, profile, tickets and notifications with useStudentShell().
const ShellContext = createContext(null);
export const useStudentShell = () => useContext(ShellContext);

// The bottom tab bar: icons only, Home in the middle. A blue circle sits behind the open tab and slides to the next one.
// `also`: the pages under a tab (it stays lit there)
const NAV = [
    { to: '/student/etickets', label: 'E-Tickets', icon: Ticket },
    { to: '/student/home', label: 'Home', icon: House, also: ['/student/notifications'] },
    { to: '/student/personal-info', label: 'Profile', icon: User, also: ['/student/settings', '/student/settings/password', '/student/help'] },
];
const HOME = '/student/home';

// Top bar title per page; back: a back arrow (to that page) on the left
const PAGES = {
    '/student/home': { title: 'Home' },
    '/student/etickets': { title: 'E-Tickets' },
    '/student/personal-info': { title: 'Personal Info' },
    '/student/notifications': { title: 'Notifications', back: '/student/home' },
    '/student/settings': { title: 'Settings', back: '/student/personal-info' },
    '/student/settings/password': { title: 'Change password', back: '/student/settings' },
    '/student/help': { title: 'Help & Support', back: '/student/settings' },
};

// Set inline: the global colour-transition rule in index.css would override a transition class
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
// The circle slides between tabs; the icons change colour as it arrives
const TAB_SLIDE = { transition: `left 320ms ${EASE}, opacity 200ms ease-out` };
const TAB_COLOR = { transition: `color 250ms ${EASE}` };
const TAB_ICON = { transition: `transform 280ms ${EASE}` };


export default function StudentShell() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { title = '', back } = PAGES[pathname] || {};
    const theme = useStudentTheme();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    // The bell's panel: the latest notifications in place (the full list is on the Notifications page).
    // The ones that were new when it opened keep their highlight while it's open.
    const [profile, setProfile] = useState(null);
    const [records, setRecords] = useState({ violations: [], tickets: [] });
    const [recordsLoaded, setRecordsLoaded] = useState(false); // false until the first lists arrive
    const [reminders, setRemindersState] = useState(readReminders);
    const [dataSaver, setDataSaverState] = useState(readDataSaver);
    const [seen, setSeen] = useState(() => readSeen(user.username));
    const [logoutAsk, setLogoutAsk] = useState(null); // null | { timerRunning }
    const [loggingOut, setLoggingOut] = useState(false);

    // The dashboard loads the same lists and hands them over (setRecords): no second download within 25 s
    const recordsAt = useRef(0);
    const takeRecords = useCallback((next) => { recordsAt.current = Date.now(); setRecords(next); setRecordsLoaded(true); }, []);
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


    // The confirmation opens right away; whether a service timer is running is checked meanwhile (a slow
    // server used to leave the Log out tap doing nothing until it answered)
    const openLogout = async () => {
        const runningNow = records.tickets.some((t) => t.status === 'Ongoing');
        setLogoutAsk({ timerRunning: runningNow });
        try {
            const r = await fetch(`/api/etickets/?student_id=${encodeURIComponent(user.username)}`);
            if (r.ok) {
                const running = (await r.json()).some((t) => t.status === 'Ongoing');
                setLogoutAsk((ask) => (ask ? { timerRunning: running } : ask));
            }
        } catch { /* offline: keep what the page already knew */ }
    };
    const logout = async () => {
        setLoggingOut(true);
        await logoutStudent(navigate);
    };

    // Home's header: "Good evening, Maria!" and a short line on how things stand
    const firstName = profile?.first_name || (profile?.name || user.full_name || user.name || '').split(' ')[0];
    const hasService = records.tickets.some((t) => t.status === 'Active' || t.status === 'Ongoing');
    const homeLine = hasService ? "Let's get those hours done." : "You're all caught up.";
    // The three tabs (Home, E-Tickets, Profile) have the blue gradient header; the pages under them the top bar
    const tabHeader = {
        [HOME]: { title: `${timeGreeting()}${firstName ? `, ${firstName}` : ''}!`, line: homeLine, action: 'bell' },
        '/student/etickets': { title: 'E-Tickets', line: 'Tap a ticket to see its service log and forms', action: hasService ? 'guide' : null },
        '/student/personal-info': { title: 'Profile', line: user.username ? `Student ID ${user.username}` : '', action: 'settings' },
        // The pages under the tabs: the same header, with a back arrow
        '/student/notifications': { title: 'Notifications', line: 'Updates on your violations and service hours', back: HOME },
        '/student/settings': { title: 'Settings', line: 'Appearance, reminders and your account', back: '/student/personal-info' },
        '/student/settings/password': { title: 'Change password', line: 'Keep your account secure', back: '/student/settings' },
        '/student/help': { title: 'Help & Support', line: 'Answers, penalties and how to reach OSA', back: '/student/settings' },
    }[pathname];
    const [guideAsk, setGuideAsk] = useState(0);
    // Home's step-by-step button (left of the bell, when there's a ticket to serve): "How to serve your hours"
    // for the open ticket; its forms step opens the e-ticket
    const [stepsOpen, setStepsOpen] = useState(false);
    const [stepsTicket, setStepsTicket] = useState(null);
    const value = {
        guideAsk, stepsOpen,
        ...theme, user, profile, setProfile, records, recordsLoaded, setRecords: takeRecords, reload: load,
        notifications, unread, seen, markAllRead, reminders, setReminders, dataSaver, setDataSaver, openLogout,
    };

    return (
        <ShellContext.Provider value={value}>
            {/* student-backdrop: the soft glows behind the pages (index.css), same as the admin side */}
            <div className="student-ui student-backdrop" data-theme={theme.isDarkMode ? 'dark' : 'light'}>
                {tabHeader ? (
                    // Every student page: a blue gradient header (Home: the hello and the bell; Profile: Settings; the pages
                    // under them: a back arrow)
                    <header className="relative overflow-hidden rounded-b-[20px] bg-gradient-to-br from-[#0f1a4a] via-[#162a6e] to-[#1e3a8a] text-white shadow-[0_14px_34px_-16px_rgba(15,26,74,0.6)] dark:from-[#0b1338] dark:via-[#122159] dark:to-[#1a3278]">
                        {/* Soft light spots, like the reference */}
                        <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
                        <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-[#ffac17]/20 blur-3xl" />
                        <div className="relative mx-auto flex w-full max-w-xl items-center gap-3 px-5 pb-3.5 pt-[calc(18px+env(safe-area-inset-top))]">
                            {tabHeader.back && (
                                <button onClick={() => navigate(tabHeader.back)} aria-label="Back" className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10">
                                    <ArrowLeft size={22} />
                                </button>
                            )}
                            <div className="min-w-0 flex-1">
                                <h1 className="truncate text-[20px] font-bold leading-tight tracking-[-0.2px]">{tabHeader.title}</h1>
                                {tabHeader.line && <p className="truncate text-[13px] font-medium text-white/85">{tabHeader.line}</p>}
                            </div>
                            {tabHeader.action === 'guide' && (
                                <button onClick={() => setGuideAsk((n) => n + 1)} aria-label="How to serve your hours" title="How to serve your hours" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10">
                                    <BookOpen size={21} />
                                </button>
                            )}
                            {tabHeader.action === 'settings' && (
                                <button onClick={() => navigate('/student/settings')} aria-label="Settings" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10">
                                    <SettingsIcon size={21} />
                                </button>
                            )}
                            {tabHeader.action === 'bell' && hasService && (
                                <button onClick={() => setStepsOpen(true)} aria-label="How to serve your hours" title="How to serve your hours" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10">
                                    <BookOpen size={21} />
                                </button>
                            )}
                            {tabHeader.action === 'bell' && (
                            <button onClick={() => navigate('/student/notifications')} aria-label={`Notifications${unread ? `, ${unread} new` : ''}`} className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10">
                                <Bell size={21} />
                                {unread > 0 && (
                                    <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#162a6e]">
                                        {unread > 9 ? '9+' : unread}
                                    </span>
                                )}
                            </button>
                            )}
                        </div>
                    </header>
                ) : (
                /* Top bar */
                <div className="sticky top-0 z-30 bg-[var(--s-card)]/65 shadow-[0_8px_24px_-14px_rgba(16,26,75,0.35)] ring-1 ring-white/50 backdrop-blur-xl backdrop-saturate-150 dark:ring-white/5">
                    <div className="mx-auto flex h-14 w-full max-w-xl items-center justify-between px-3">
                        {back ? (
                            <button onClick={() => navigate(back)} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--s-text)] hover:bg-[var(--s-bg)]">
                                <ArrowLeft size={22} />
                            </button>
                        ) : (
                            // The OSAConnect mark where the back arrow would be (the admin pages' header has the logo too)
                            <span className="flex h-10 w-10 items-center justify-center">
                                <img src={theme.isDarkMode ? logoIconDark : logoIcon} alt="OSAConnect" className="h-8 w-8 select-none" draggable="false" />
                            </span>
                        )}
                        <h1 className="truncate px-2 text-lg font-black tracking-[-0.2px] text-[var(--s-text)]">{title}</h1>
                        <span className="h-10 w-10" aria-hidden="true" />
                    </div>
                </div>
                )}

                {/* Pages load on first visit; the top bar and tab bar stay on screen meanwhile */}
                <Suspense fallback={<div className="flex justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--s-accent)] border-t-transparent" /></div>}>
                    <div key={pathname} className="page-enter"><Outlet /></div>
                </Suspense>
                {/* Room under the last thing on the page, so the tab bar never covers it */}
                <div className="h-[calc(96px+env(safe-area-inset-bottom))]" aria-hidden="true" />

                {/* Bottom tab bar */}
                <nav aria-label="Student pages" className="fixed inset-x-0 z-40 mx-auto w-[calc(100%-48px)] max-w-[300px]" style={{ bottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
                    <div className="rounded-full border border-[var(--s-card-edge)] bg-[var(--s-card)]/75 p-1.5 shadow-[0_12px_34px_-8px_rgba(16,26,75,0.25)] backdrop-blur-xl backdrop-saturate-150">
                        <div className="relative flex h-12 items-center">
                            {/* The sliding circle, centred on the open tab's slot */}
                            {(() => {
                                const i = NAV.findIndex(({ to, also = [] }) => pathname === to || also.includes(pathname));
                                return (
                                    <span aria-hidden="true" className="absolute top-0 h-12 w-12 rounded-full bg-[var(--s-primary)] shadow-[0_6px_16px_rgba(30,58,138,0.35)]"
                                        style={{ ...TAB_SLIDE, left: `calc(${((Math.max(i, 0) + 0.5) / NAV.length) * 100}% - 24px)`, opacity: i < 0 ? 0 : 1 }} />
                                );
                            })()}
                            {NAV.map(({ to, label, icon: Icon, also = [] }) => {
                                const active = pathname === to || also.includes(pathname);
                                return (
                                    <button
                                        key={to}
                                        onClick={() => pathname !== to && navigate(to)}
                                        aria-label={label}
                                        aria-current={active ? 'page' : undefined}
                                        style={TAB_COLOR}
                                        className={`relative z-10 flex h-12 flex-1 items-center justify-center rounded-full ${active ? 'text-white' : 'text-[var(--s-muted)] hover:text-[var(--s-text)]'}`}
                                    >
                                        {/* The open tab's icon grows a little */}
                                        <Icon size={22} strokeWidth={active ? 2.4 : 2} style={{ ...TAB_ICON, transform: active ? 'scale(1.2)' : 'none' }} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </nav>

                {/* "How to serve your hours" from Home's book button, and the e-ticket its forms step opens */}
                {stepsOpen && (
                    <StudentGuide
                        ticket={records.tickets.find((t) => t.status === 'Ongoing') || records.tickets.find((t) => t.status === 'Active')}
                        onClose={() => setStepsOpen(false)}
                        onOpenTicket={(t) => { setStepsOpen(false); setStepsTicket(t); }}
                    />
                )}
                <TicketDetails ticket={stepsTicket} onClose={() => setStepsTicket(null)} />

                {/* Same log-out question as the guard and faculty pages (components/ReporterShell.jsx) */}
                {logoutAsk && (
                    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={() => setLogoutAsk(null)}>
                        <div role="alertdialog" aria-modal="true" aria-labelledby="logout-title" className="w-full max-w-sm rounded-3xl border border-[var(--s-border)] bg-[var(--s-card)] p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-950/50 dark:text-red-400">
                                <LogOut size={22} />
                            </div>
                            <h3 id="logout-title" className="text-lg font-bold text-[var(--s-text)]">Log out?</h3>
                            <p className="mb-6 mt-1 text-sm font-medium text-[var(--s-muted)]">{logoutAsk.timerRunning ? 'Your running service timer will stop.' : 'Are you sure you want to log out of your account?'}</p>
                            <div className="flex gap-3">
                                <button onClick={() => setLogoutAsk(null)} className="flex-1 rounded-xl bg-[var(--s-bg)] py-3 text-sm font-bold text-[var(--s-muted)] hover:brightness-95">Cancel</button>
                                <button onClick={logout} disabled={loggingOut} className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">{loggingOut ? 'Logging out…' : 'Log Out'}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ShellContext.Provider>
    );
}
