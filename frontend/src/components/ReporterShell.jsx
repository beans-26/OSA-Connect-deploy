import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChartPie, CircleHelp, Gavel, History, LogOut, Menu, X } from 'lucide-react';
import { loginPathFor } from '../lib/portals';

// The layout route of the guard and faculty & staff pages, built like the student one (StudentShell.jsx):
// a top bar with the menu button and the page title, and a side menu with the account, the pages and Log out.
// It stays mounted while moving between pages, so the menu slides closed over the next page.

const PAGES = {
    '/guard/report': 'Report Violation',
    '/guard/history': 'History',
    '/guard/analytics': 'Analytics',
    '/staff/report': 'Report Violation',
    '/staff/history': 'History',
    '/staff/help': 'Help',
};
// Guards: report, history, analytics. Faculty & staff: report, history, help.
const NAV = {
    guard: [
        { to: '/guard/report', label: 'Report Violation', icon: Gavel },
        { to: '/guard/history', label: 'History', icon: History },
        { to: '/guard/analytics', label: 'Analytics', icon: ChartPie },
    ],
    staff: [
        { to: '/staff/report', label: 'Report Violation', icon: Gavel },
        { to: '/staff/history', label: 'History', icon: History },
        { to: '/staff/help', label: 'Help', icon: CircleHelp },
    ],
};
const ROLE_LABEL = { guard: 'Guard', staff: 'Faculty & Staff', admin: 'OSA Admin' };

// Set inline: the global colour-transition rule in index.css would override a transition class
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const slideStyle = { transition: `translate 320ms ${EASE}, transform 320ms ${EASE}, visibility 320ms` };
const fadeStyle = { transition: 'opacity 300ms ease-out' };

const initials = (name = '') => {
    const words = name.split(/\s+/).filter(Boolean);
    return ((words[0]?.[0] || '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase() || '?';
};

export default function ReporterShell() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    // The pages under /guard/ get the guard menu (admins can open them too); /staff/ the faculty & staff menu
    const area = pathname.startsWith('/staff/') ? 'staff' : 'guard';
    const nav = NAV[area];
    const name = user.full_name || user.name || user.username || 'Account';
    const [menuOpen, setMenuOpen] = useState(false);
    const [askLogout, setAskLogout] = useState(false);

    useEffect(() => { setMenuOpen(false); }, [pathname]);
    useEffect(() => {
        if (!menuOpen) return undefined;
        const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [menuOpen]);

    const logout = () => {
        localStorage.removeItem('user');
        navigate(loginPathFor(user.role || area), { replace: true });
    };

    return (
        <div className="flo-type min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Top bar */}
            <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
                <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-3">
                    <button onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800">
                        <Menu size={22} />
                    </button>
                    <h1 className="flex-1 truncate text-center text-base font-bold text-slate-900 dark:text-white">{PAGES[pathname] || ''}</h1>
                    <span className="h-10 w-10" aria-hidden="true" />
                </div>
            </div>

            {/* Pages load on first visit; the top bar and menu stay on screen meanwhile */}
            <Suspense fallback={<div className="flex justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-4 border-ustp-blue border-t-transparent" /></div>}>
                <div key={pathname} className="page-enter"><Outlet /></div>
            </Suspense>

            {/* Side menu */}
            <div className={`fixed inset-0 z-[70] bg-black/40 ${menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`} style={fadeStyle} onClick={() => setMenuOpen(false)} aria-hidden="true" />
            <aside
                role="dialog"
                aria-modal="true"
                aria-label="Menu"
                aria-hidden={!menuOpen}
                inert={!menuOpen ? '' : undefined}
                className={`fixed inset-y-0 left-0 z-[71] flex w-[280px] max-w-[82vw] flex-col bg-white shadow-2xl will-change-transform dark:bg-slate-900 ${menuOpen ? 'visible translate-x-0' : 'invisible -translate-x-[calc(100%+32px)]'}`}
                style={slideStyle}
            >
                <div className="flex items-center gap-3 px-4 pb-3 pt-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ustp-blue text-sm font-bold text-white">{initials(name)}</div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{name}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{ROLE_LABEL[user.role] || ROLE_LABEL[area]}</p>
                    </div>
                    <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <X size={20} />
                    </button>
                </div>
                <nav className="mt-1 flex flex-col gap-1 px-2">
                    {nav.map(({ to, label, icon: Icon }) => {
                        const active = pathname === to;
                        return (
                            <button
                                key={to}
                                onClick={() => { setMenuOpen(false); if (!active) navigate(to); }}
                                aria-current={active ? 'page' : undefined}
                                className={`flex items-center gap-3.5 rounded-xl px-3 py-3 text-left text-sm ${active ? 'bg-blue-50 font-bold text-ustp-blue dark:bg-blue-500/15 dark:text-blue-300' : 'font-medium text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                <Icon size={19} strokeWidth={active ? 2.3 : 2} />
                                <span className="flex-1">{label}</span>
                            </button>
                        );
                    })}
                </nav>
                <button onClick={() => { setMenuOpen(false); setAskLogout(true); }} className="mt-auto flex items-center gap-3.5 px-5 py-5 text-sm font-medium text-red-500 hover:opacity-80">
                    <LogOut size={18} /> Log out
                </button>
            </aside>

            {/* Same log-out question as before */}
            {askLogout && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={() => setAskLogout(false)}>
                    <div role="alertdialog" aria-modal="true" aria-labelledby="reporter-logout" className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-2xl dark:border-slate-700 dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-950/50 dark:text-red-400">
                            <LogOut size={22} />
                        </div>
                        <h3 id="reporter-logout" className="text-lg font-bold text-slate-900 dark:text-white">Log out?</h3>
                        <p className="mb-6 mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Are you sure you want to log out of your account?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setAskLogout(false)} className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">Cancel</button>
                            <button onClick={logout} className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700">Log Out</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
