import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { homePathFor, rolesForLogin } from '../lib/portals';
import { ACTIVITY_KEY, stopActiveSession } from './studentSession';

const ROLE_NAMES = { student: 'student', guard: 'guard', staff: 'faculty & staff', admin: 'OSA admin' };
const PORTAL_NAMES = { student: 'student login', faculty: 'faculty login', guardnstaff: 'faculty login', admin: 'admin login' };

// Wraps a login page. Someone already logged in who opens their own group's login goes straight to
// their dashboard; opening another group's login (e.g. a student typing /admin) asks before logging
// them out, instead of silently switching accounts.
const LoginSwitchGuard = ({ portal, children }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
    });
    const [loggingOut, setLoggingOut] = useState(false);

    if (!user?.role) return children;
    if (rolesForLogin(portal).includes(user.role)) return <Navigate to={homePathFor(user.role)} replace />;

    const isStudent = user.role === 'student';
    const logOut = async () => {
        setLoggingOut(true);
        // Same as Log Out: a student's running timer is stopped (hours served so far are kept)
        if (isStudent) await stopActiveSession(user.username, 'logout');
        localStorage.removeItem('user');
        localStorage.removeItem(ACTIVITY_KEY);
        setUser(null);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4" role="alertdialog" aria-modal="true" aria-labelledby="switch-title">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-950/40">
                    <LogOut size={22} />
                </div>
                <h2 id="switch-title" className="text-lg font-black text-slate-900 dark:text-white">Log out?</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    You&apos;re logged in as <span className="font-bold text-slate-900 dark:text-white">{user.name || user.full_name || user.username}</span> ({ROLE_NAMES[user.role] || user.role}).
                    {' '}Opening the {PORTAL_NAMES[portal]} will log you out{isStudent ? ' and stop your running service timer' : ''}.
                </p>
                <div className="mt-6 flex gap-3">
                    <button
                        onClick={() => navigate(homePathFor(user.role) || '/', { replace: true })}
                        disabled={loggingOut}
                        className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
                    >
                        Stay Logged In
                    </button>
                    <button
                        onClick={logOut}
                        disabled={loggingOut}
                        className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-60"
                    >
                        {loggingOut ? 'Logging out…' : 'Log Out'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginSwitchGuard;
