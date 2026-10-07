import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ACTIVITY_KEY } from '../components/studentSession';
import { homePathFor } from '../lib/portals';
import campusPhoto from '../assets/ustp-campus-blur.jpg';
import osaLogo from '../assets/osaconnect-logo.png';
import { 
    User, 
    Eye, 
    EyeOff, 
    Lock, 
    ChevronRight,
    Loader2
} from 'lucide-react';

// Text and allowed roles for each login page. All three share this screen and its design.
const PORTALS = {
    student: {
        roles: ['student'],
        title: 'Student Login',
        idLabel: 'Student ID',
        wrongPortal: 'This is the student login. Faculty members log in at /faculty.',
    },
    // Guards and faculty with an account; faculty without one report from here too (/faculty/report)
    faculty: {
        roles: ['guard', 'staff'],
        title: 'Faculty Login',
        idLabel: 'Username',
        wrongPortal: 'This login is for faculty members. Students log in at /student.',
    },
    guardnstaff: {
        roles: ['guard', 'staff'],
        title: 'Faculty Login',
        idLabel: 'Username',
        wrongPortal: 'This login is for faculty members. Students log in at /student.',
    },
    admin: {
        roles: ['admin'],
        title: 'Admin Login',
        idLabel: 'Admin ID',
        // Other accounts get no hint about where they belong from the admin page
        wrongPortal: 'Invalid credentials',
    },
};

const Login = ({ portal = 'student' }) => {
    const config = PORTALS[portal];
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    // Set by StudentIdleGuard after an inactivity logout
    const notice = useLocation().state?.notice;

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (response.ok) {
                // Admins don't get a hint on the other pages; their login page stays unadvertised
                if (data.role === 'admin' && portal !== 'admin') {
                    setError('Invalid credentials');
                    return;
                }
                if (!config.roles.includes(data.role)) {
                    setError(config.wrongPortal);
                    return;
                }

                const userData = {
                    // Sent with every API request (lib/apiAuth.js)
                    token: data.token,
                    username: data.username,
                    full_name: data.full_name,
                    role: data.role,
                    student_id: data.student_id,
                    name: data.name
                };
                localStorage.setItem('user', JSON.stringify(userData));
                // StudentIdleGuard counts inactivity from a student's login
                if (data.role === 'student') localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
                
                navigate(homePathFor(data.role));
            } else {
                setError(data.error || 'Invalid credentials');
            }
        } catch {
            setError('System connection failure');
        } finally {
            setLoading(false);
        }
    };

    // Registering and resetting a password are for students only
    const isStudent = portal === 'student';
    // Same look on every login: blue glass box over the campus photo
    const cardClass = 'bg-sky-100/55 dark:bg-blue-950/55 backdrop-blur-md border-white/70 dark:border-sky-300/25 shadow-[0_0_0_1px_rgba(255,255,255,0.35),0_0_24px_rgba(56,189,248,0.35),0_18px_40px_-8px_rgba(30,58,138,0.55)]';
    const fieldClass = 'bg-white/75 dark:bg-slate-900/60 border-white/80 dark:border-white/15 focus-within:bg-white dark:focus-within:bg-slate-900';
    const inputClass = 'w-full bg-transparent py-2 sm:py-2.5 pl-10 outline-none font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 text-sm';

    return (
        <div className="relative min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
            {/* The USTP campus behind the form (pre-blurred image), with a light wash */}
            <div aria-hidden="true" className="fixed inset-0 scale-105 bg-cover bg-center" style={{ backgroundImage: `url(${campusPhoto})` }} />
            <div aria-hidden="true" className="fixed inset-0 bg-white/40 dark:bg-slate-950/60" />

            {/* Layout: logo above a narrow box; heading inside the box; fields; a row with the small
                link on the left and the Login button on the right; a divided section for registering */}
            <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-4 sm:gap-5">
                {/* The logo image includes the "Smart student violation management" tagline */}
                <img
                    src={osaLogo}
                    alt="OSAConnect: Smart student violation management"
                    className="w-full max-w-[220px] sm:max-w-full h-auto select-none dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.55)]"
                    draggable="false"
                />

                <div className={`w-full p-5 sm:p-7 rounded-md border ${cardClass}`}>
                    <h1 className={isStudent ? "text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 sm:mb-5 text-left" : "text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-4 sm:mb-5 text-center"}>
                        {isStudent ? 'Login' : config.title}
                    </h1>

                    {notice && !error && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-center">
                            <p className="text-amber-800 font-semibold text-xs leading-relaxed">{notice}</p>
                        </div>
                    )}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-md text-center">
                            <p className="text-red-600 font-bold text-xs">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-3">
                        <div className={`relative border rounded-md focus-within:border-blue-600 transition-none ${fieldClass}`}>
                            <label htmlFor="login-id" className="sr-only">{config.idLabel}</label>
                            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                            <input
                                id="login-id"
                                type="text"
                                autoComplete="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder={config.idLabel}
                                className={`${inputClass} pr-3`}
                                required
                            />
                        </div>

                        <div className={`relative border rounded-md focus-within:border-blue-600 transition-none ${fieldClass}`}>
                            <label htmlFor="login-password" className="sr-only">Password</label>
                            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                            <input
                                id="login-password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                className={`${inputClass} pr-10`}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        {isStudent ? (
                            <div className="flex items-center justify-between gap-3 pt-2">
                                <Link to="/forgot-password" className="text-xs sm:text-sm font-bold text-blue-800 dark:text-blue-300 hover:underline underline-offset-2">
                                    Forgot password?
                                </Link>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 sm:px-5 py-2 sm:py-2.5 bg-blue-900 dark:bg-blue-800 text-white rounded-md font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={16} /> : <>Login <ChevronRight size={16} /></>}
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-9 sm:h-10 px-4 sm:px-5 bg-blue-900 text-white rounded-md font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-blue-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={16} /> : <>Login <ChevronRight size={16} /></>}
                                </button>
                                {/* Faculty accounts made with a USTP email can reset it themselves (guards ask OSA) */}
                                {portal === 'faculty' && (
                                    <Link to="/faculty/forgot-password" className="text-xs sm:text-sm font-bold text-blue-800 dark:text-blue-300 hover:underline underline-offset-2">
                                        Forgot password?
                                    </Link>
                                )}
                            </div>
                        )}
                    </form>

                    {isStudent && (
                        <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-dashed border-slate-400/60 dark:border-slate-500/60 text-left">
                            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">New student?</h2>
                            <p className="mt-1 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                                If you don&apos;t have an account yet, <Link to="/register" className="font-bold text-blue-800 dark:text-blue-300 underline underline-offset-2">register here</Link> to get your QR ID and follow your service hours.
                            </p>
                        </div>
                    )}
                    {portal === 'faculty' && (
                        <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-dashed border-slate-400/60 dark:border-slate-500/60 text-left">
                            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">No account?</h2>
                            <p className="mt-1 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                                Faculty and staff can <Link to="/faculty/signup" className="font-bold text-blue-800 dark:text-blue-300 underline underline-offset-2">create an account</Link> with their @ustp.edu.ph email, or report a violation without one by confirming their email with a code.
                            </p>
                            <Link to="/faculty/report" className="mt-3 w-full h-9 sm:h-10 px-4 border-2 border-blue-900 dark:border-blue-300 text-blue-900 dark:text-blue-200 rounded-md font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-white/60 dark:hover:bg-white/10 transition-colors">
                                Report without an account <ChevronRight size={16} />
                            </Link>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Login;
