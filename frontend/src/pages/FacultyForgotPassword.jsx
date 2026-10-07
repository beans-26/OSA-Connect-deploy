import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, Eye, EyeOff, Loader2, Lock, Mail, MailCheck } from 'lucide-react';
import campusPhoto from '../assets/ustp-campus-blur.jpg';
import osaLogo from '../assets/osaconnect-logo.png';

// Faculty "Forgot password?" (/faculty/forgot-password, from the /faculty login): the account's USTP email,
// the 6-digit code sent to it, and a new password (backend faculty_reset_request / faculty_reset_password).
// Guard accounts are shared and have no email; OSA resets those.

const MIN_PASSWORD = 8;

// Same blue glass box as the login pages (Login.jsx)
const cardClass = 'bg-sky-100/55 dark:bg-blue-950/55 backdrop-blur-md border-white/70 dark:border-sky-300/25 shadow-[0_0_0_1px_rgba(255,255,255,0.35),0_0_24px_rgba(56,189,248,0.35),0_18px_40px_-8px_rgba(30,58,138,0.55)]';
const fieldClass = 'relative border rounded-md focus-within:border-blue-600 bg-white/75 dark:bg-slate-900/60 border-white/80 dark:border-white/15 focus-within:bg-white dark:focus-within:bg-slate-900';
const inputClass = 'w-full bg-transparent py-2 sm:py-2.5 pl-10 pr-3 outline-none font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 text-sm';
const iconClass = 'absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400';
const buttonClass = 'w-full h-10 bg-blue-900 text-white rounded-md font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed';

export default function FacultyForgotPassword() {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState('email'); // email -> reset -> done
    const [doneMessage, setDoneMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const post = async (url, body) => {
        setBusy(true);
        setError('');
        try {
            const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await r.json().catch(() => ({}));
            if (!r.ok) { setError(data.error || 'Something went wrong. Try again.'); return null; }
            return data;
        } catch {
            setError("Can't reach the server. Check your connection and try again.");
            return null;
        } finally {
            setBusy(false);
        }
    };

    const sendCode = async (e) => {
        e?.preventDefault();
        const clean = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return setError('Type the USTP email of your faculty account.');
        if (await post('/api/faculty/password-reset/request/', { faculty_email: clean })) {
            setEmail(clean);
            setCode('');
            setStep('reset');
        }
        return null;
    };

    const reset = async (e) => {
        e.preventDefault();
        if (code.length !== 6) return setError('Type the 6-digit code from the email.');
        if (password.length < MIN_PASSWORD) return setError(`Your new password needs at least ${MIN_PASSWORD} characters.`);
        if (password !== confirm) return setError("The passwords don't match.");
        const data = await post('/api/faculty/password-reset/', { faculty_email: email, otp: code, password });
        if (data) {
            setDoneMessage(data.message);
            setStep('done');
        }
        return null;
    };

    return (
        <div className="relative min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
            <div aria-hidden="true" className="fixed inset-0 scale-105 bg-cover bg-center" style={{ backgroundImage: `url(${campusPhoto})` }} />
            <div aria-hidden="true" className="fixed inset-0 bg-white/40 dark:bg-slate-950/60" />

            <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-4 sm:gap-5">
                <img src={osaLogo} alt="OSAConnect: Smart student violation management" className="w-full max-w-[220px] sm:max-w-full h-auto select-none" draggable="false" />

                <div className={`w-full p-5 sm:p-7 rounded-md border ${cardClass}`}>
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white text-center">Forgot Password</h1>
                    <p className="mt-1 mb-4 text-center text-xs text-slate-700 dark:text-slate-300">
                        {step === 'email' ? 'For faculty accounts made with a USTP email. Guards: ask OSA to reset your password.'
                            : step === 'reset' ? `Enter the 6-digit code we sent to ${email} and choose a new password.`
                            : 'All set.'}
                    </p>

                    {error && (
                        <div role="alert" className="mb-3 p-3 bg-red-50 border border-red-100 rounded-md text-center">
                            <p className="text-red-600 font-bold text-xs">{error}</p>
                        </div>
                    )}

                    {step === 'email' && (
                        <form onSubmit={sendCode} className="space-y-3">
                            <div className={fieldClass}>
                                <label htmlFor="ff-email" className="sr-only">USTP email</label>
                                <Mail size={16} className={iconClass} aria-hidden="true" />
                                <input id="ff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" placeholder="yourname@ustp.edu.ph" className={inputClass} disabled={busy} />
                            </div>
                            <button type="submit" disabled={busy} className={buttonClass}>
                                {busy ? <Loader2 className="animate-spin" size={16} /> : 'Send code'}
                            </button>
                        </form>
                    )}

                    {step === 'reset' && (
                        <form onSubmit={reset} className="space-y-3">
                            <div className={fieldClass}>
                                <label htmlFor="ff-code" className="sr-only">Code</label>
                                <MailCheck size={16} className={iconClass} aria-hidden="true" />
                                <input id="ff-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" autoFocus className={`${inputClass} font-mono tracking-[0.4em]`} disabled={busy} />
                            </div>
                            <div className={fieldClass}>
                                <label htmlFor="ff-password" className="sr-only">New password</label>
                                <Lock size={16} className={iconClass} aria-hidden="true" />
                                <input id="ff-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder={`New password (at least ${MIN_PASSWORD} characters)`} className={`${inputClass} !pr-10`} disabled={busy} />
                                <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:text-slate-400">
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div className={fieldClass}>
                                <label htmlFor="ff-confirm" className="sr-only">Confirm new password</label>
                                <Lock size={16} className={iconClass} aria-hidden="true" />
                                <input id="ff-confirm" type={showPassword ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" placeholder="Confirm new password" className={inputClass} disabled={busy} />
                            </div>
                            <button type="submit" disabled={busy} className={buttonClass}>
                                {busy ? <Loader2 className="animate-spin" size={16} /> : 'Change password'}
                            </button>
                            <button type="button" onClick={sendCode} disabled={busy} className="block w-full text-center text-xs font-bold text-blue-800 hover:underline disabled:opacity-60 dark:text-blue-300">Send a new code</button>
                        </form>
                    )}

                    {step === 'done' && (
                        <div className="space-y-4 text-center">
                            <CheckCircle2 className="mx-auto text-emerald-600" size={40} />
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{doneMessage}</p>
                            <Link to="/faculty" className={buttonClass}>Go to login</Link>
                        </div>
                    )}

                    {step !== 'done' && (
                        <Link to="/faculty" className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-blue-800 hover:underline dark:text-blue-300">
                            <ChevronLeft size={14} /> Back to login
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
