import { Suspense, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChartPie, House, LogOut, User } from 'lucide-react';
import { loginPathFor } from '../lib/portals';

// The layout route of the guard and faculty & staff pages, in the student pages' design (StudentShell.jsx):
// a navy gradient header with the page title and the account, a white page, and the floating tab bar at the
// bottom (Analytics, Home in the middle, Profile) with a circle that slides to the open tab. Log out is in Profile.

const PAGES = {
    '/guard/home': 'Report Violation',
    '/guard/analytics': 'Analytics',
    '/guard/profile': 'Profile',
    '/faculty/home': 'Report Violation',
    '/faculty/analytics': 'Analytics',
    '/faculty/profile': 'Profile',
    '/faculty/help': 'Help & Support',
};
// Pages under a tab: the tab stays lit and the header gets a back arrow
const BACK = { '/faculty/help': '/faculty/profile' };
// Guards and faculty & staff: Analytics, Home (Report Violation) in the middle, Profile.
// (The reports / history lists were removed, 2026-11.)
const NAV = {
    guard: [
        { to: '/guard/analytics', label: 'Analytics', icon: ChartPie },
        { to: '/guard/home', label: 'Home', icon: House },
        { to: '/guard/profile', label: 'Profile', icon: User },
    ],
    staff: [
        { to: '/faculty/analytics', label: 'Analytics', icon: ChartPie },
        { to: '/faculty/home', label: 'Home', icon: House },
        { to: '/faculty/profile', label: 'Profile', icon: User },
    ],
};
const ROLE_LABEL = { guard: 'Guard', staff: 'Faculty', admin: 'OSA Admin' };

// Set inline: the global colour-transition rule in index.css would override a transition class
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const TAB_SLIDE = { transition: `left 320ms ${EASE}` };
const TAB_COLOR = { transition: `color 250ms ${EASE}` };
const TAB_ICON = { transition: `transform 280ms ${EASE}` };

export default function ReporterShell() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    // The pages under /guard/ get the guard tabs (admins can open them too); /faculty/ the faculty & staff tabs
    const area = pathname.startsWith('/faculty/') ? 'staff' : 'guard';
    const nav = NAV[area];
    const name = user.full_name || user.name || user.username || 'Account';
    const [askLogout, setAskLogout] = useState(false);
    const tabPath = BACK[pathname] || pathname;
    // Home (the report page) fits the screen: the page doesn't scroll (only a long form inside it would)
    const isHome = pathname === nav[1].to;
    const tabIndex = nav.findIndex(({ to }) => to === tabPath);

    const logout = () => {
        localStorage.removeItem('user');
        navigate(loginPathFor(user.role || area), { replace: true });
    };

    return (
        <div className={`flo-type bg-white dark:bg-slate-900 ${isHome ? 'flex h-[100dvh] flex-col overflow-hidden' : 'min-h-screen'}`}>
            {/* Blue gradient header: the page, the account, Log out (same look as the student pages) */}
            <header className="relative shrink-0 overflow-hidden rounded-b-[20px] bg-gradient-to-br from-[#0f1a4a] via-[#162a6e] to-[#1e3a8a] text-white shadow-[0_14px_34px_-16px_rgba(15,26,74,0.6)] dark:from-[#0b1338] dark:via-[#122159] dark:to-[#1a3278]">
                <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-[#ffac17]/20 blur-3xl" />
                <div className="relative mx-auto flex w-full max-w-5xl items-center gap-3 px-5 pb-3.5 pt-[calc(18px+env(safe-area-inset-top))]">
                    {BACK[pathname] && (
                        <button onClick={() => navigate(BACK[pathname])} aria-label="Back" className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10">
                            <ArrowLeft size={22} />
                        </button>
                    )}
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-[20px] font-bold leading-tight tracking-[-0.2px]">{PAGES[pathname] || ''}</h1>
                        <p className="truncate text-[13px] font-medium text-white/85">{name} · {ROLE_LABEL[user.role] || ROLE_LABEL[area]}</p>
                    </div>
                </div>
            </header>

            {/* Pages load on first visit; the header and tab bar stay on screen meanwhile */}
            <Suspense fallback={<div className="flex justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-4 border-ustp-blue border-t-transparent" /></div>}>
                <div key={pathname} className={`page-enter ${isHome ? 'min-h-0 flex-1 overflow-y-auto pb-[calc(80px+env(safe-area-inset-bottom))]' : ''}`}>
                    <Outlet context={{ area, openLogout: () => setAskLogout(true) }} />
                </div>
            </Suspense>
            {/* Room under the last thing on the page, so the tab bar never covers it */}
            {!isHome && <div className="h-[calc(96px+env(safe-area-inset-bottom))]" aria-hidden="true" />}

            {/* Bottom tab bar (icons only): a blue circle behind the open tab slides to the next one */}
            <nav aria-label="Pages" className="fixed inset-x-0 z-40 mx-auto w-[calc(100%-48px)] max-w-[300px]" style={{ bottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
                <div className="rounded-full border border-slate-100 bg-white/80 p-1.5 shadow-[0_12px_34px_-8px_rgba(16,26,75,0.25)] backdrop-blur-xl backdrop-saturate-150 dark:border-slate-700 dark:bg-slate-800/80">
                    <div className="relative flex h-12 items-center">
                        {tabIndex >= 0 && (
                            <span aria-hidden="true" className="absolute top-0 h-12 w-12 rounded-full bg-ustp-blue shadow-[0_6px_16px_rgba(30,58,138,0.35)]"
                                style={{ ...TAB_SLIDE, left: `calc(${((tabIndex + 0.5) / nav.length) * 100}% - 24px)` }} />
                        )}
                        {nav.map(({ to, label, icon: Icon }) => {
                            const active = tabPath === to;
                            return (
                                <button
                                    key={to}
                                    onClick={() => pathname !== to && navigate(to)}
                                    aria-label={label}
                                    title={label}
                                    aria-current={active ? 'page' : undefined}
                                    style={TAB_COLOR}
                                    className={`relative z-10 flex h-12 flex-1 items-center justify-center rounded-full ${active ? 'text-white' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                >
                                    <Icon size={22} strokeWidth={active ? 2.4 : 2} style={{ ...TAB_ICON, transform: active ? 'scale(1.2)' : 'none' }} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </nav>

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
