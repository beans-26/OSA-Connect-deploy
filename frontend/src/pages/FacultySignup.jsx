import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Clock, Eye, EyeOff, Loader2, Lock, Mail, MailCheck, User } from 'lucide-react';
import { homePathFor } from '../lib/portals';
import campusPhoto from '../assets/ustp-campus-blur.jpg';
import osaLogo from '../assets/osaconnect-logo.png';

// Faculty make their own account (/faculty/signup, from the /faculty login): first and last name, @ustp.edu.ph
// email and password, then the 6-digit code from the email. The account waits for OSA to confirm them before it
// can log in (backend faculty_signup). Opened from OSA's invite email (?invite=..., after a report filed without
// an account): the email is filled in, and the account is active as soon as it's made.

// Only the shape here: the server checks it's a USTP address (or a test address in backend/.env)
const USTP_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

// Same blue glass box as the login pages (Login.jsx)
const cardClass = 'bg-sky-100/55 dark:bg-blue-950/55 backdrop-blur-md border-white/70 dark:border-sky-300/25 shadow-[0_0_0_1px_rgba(255,255,255,0.35),0_0_24px_rgba(56,189,248,0.35),0_18px_40px_-8px_rgba(30,58,138,0.55)]';
const fieldClass = 'relative border rounded-md focus-within:border-blue-600 bg-white/75 dark:bg-slate-900/60 border-white/80 dark:border-white/15 focus-within:bg-white dark:focus-within:bg-slate-900';
const inputClass = 'w-full bg-transparent py-2 sm:py-2.5 pl-10 pr-3 outline-none font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 text-sm';
const iconClass = 'absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400';
const buttonClass = 'w-full h-10 bg-blue-900 text-white rounded-md font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed';

export default function FacultySignup() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', confirm: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState('details'); // 'details' -> 'code'
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [waiting, setWaiting] = useState(''); // made, but waiting for OSA: the message to show
    const invite = useSearchParams()[0].get('invite') || '';
    const [inviteState, setInviteState] = useState(invite ? 'loading' : 'none'); // loading | ready | bad | none
    const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
    const details = () => ({
        first_name: form.first_name.trim(), last_name: form.last_name.trim(),
        ...(inviteState === 'ready' ? { invite } : { faculty_email: form.email }),
    });

    // Invite link: the email OSA confirmed (and the name read from it) fill in the form
    useEffect(() => {
        if (!invite) return;
        fetch(`/api/faculty/invite/?token=${encodeURIComponent(invite)}`)
            .then(async (r) => {
                const data = await r.json().catch(() => ({}));
                if (!r.ok) { setInviteState('bad'); setError(data.error || 'This link expired or was already used.'); return; }
                setForm((prev) => ({ ...prev, email: data.email, first_name: data.first_name || '', last_name: data.last_name || '' }));
                setInviteState('ready');
            })
            .catch(() => { setInviteState('bad'); setError("Can't reach the server. Check your connection and try again."); });
    }, [invite]);

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
        const email = form.email.trim().toLowerCase();
        if (!form.first_name.trim() || !form.last_name.trim()) return setError('Type your first name and last name.');
        if (!USTP_EMAIL.test(email)) return setError('Use your USTP email, ending in @ustp.edu.ph.');
        if (form.password.length < MIN_PASSWORD) return setError(`Your password needs at least ${MIN_PASSWORD} characters.`);
        if (form.password !== form.confirm) return setError("The passwords don't match.");
        const data = await post('/api/faculty/signup/request/', inviteState === 'ready' ? details() : { ...details(), faculty_email: email });
        if (data) {
            setForm((prev) => ({ ...prev, email }));
            setCode('');
            setStep('code');
        }
        return null;
    };

    const createAccount = async (e) => {
        e.preventDefault();
        if (code.length !== 6) return setError('Type the 6-digit code from the email.');
        const data = await post('/api/faculty/signup/', { ...details(), password: form.password, otp: code });
        if (data?.active) {
            localStorage.setItem('user', JSON.stringify({ token: data.token, username: data.username, full_name: data.full_name, role: data.role }));
            navigate(homePathFor(data.role), { replace: true });
        } else if (data) {
            setWaiting(data.message);
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
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white text-center">{inviteState === 'ready' ? 'Finish Your Faculty Account' : 'Create a Faculty Account'}</h1>
                    <p className="mt-1 mb-4 text-center text-xs text-slate-700 dark:text-slate-300">
                        {waiting ? 'Account created.'
                            : step === 'code' ? `Enter the 6-digit code we sent to ${form.email}. It expires in 5 minutes.`
                            : inviteState === 'ready' ? 'OSA confirmed you as USTP faculty. Add your details and confirm one last code.'
                            : 'For USTP faculty & staff who report student violations. OSA confirms new accounts before they can log in.'}
                    </p>

                    {error && (
                        <div role="alert" className="mb-3 p-3 bg-red-50 border border-red-100 rounded-md text-center">
                            <p className="text-red-600 font-bold text-xs">{error}</p>
                        </div>
                    )}

                    {waiting ? (
                        <div className="space-y-4 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700"><Clock size={24} /></div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{waiting}</p>
                            <Link to="/faculty" className={buttonClass}>Back to login</Link>
                        </div>
                    ) : inviteState === 'loading' ? (
                        <div className="py-8 text-center"><Loader2 className="mx-auto animate-spin text-blue-900" size={28} /></div>
                    ) : step === 'details' ? (
                        <form onSubmit={sendCode} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className={fieldClass}>
                                    <label htmlFor="fs-first" className="sr-only">First name</label>
                                    <User size={16} className={iconClass} aria-hidden="true" />
                                    <input id="fs-first" value={form.first_name} onChange={set('first_name')} maxLength={50} autoComplete="given-name" placeholder="First name" className={inputClass} disabled={busy} />
                                </div>
                                <div className={fieldClass}>
                                    <label htmlFor="fs-last" className="sr-only">Last name</label>
                                    <input id="fs-last" value={form.last_name} onChange={set('last_name')} maxLength={50} autoComplete="family-name" placeholder="Last name" className={`${inputClass} !pl-3`} disabled={busy} />
                                </div>
                            </div>
                            <div className={fieldClass}>
                                <label htmlFor="fs-email" className="sr-only">USTP email</label>
                                <Mail size={16} className={iconClass} aria-hidden="true" />
                                <input id="fs-email" type="email" value={form.email} onChange={set('email')} maxLength={254} autoComplete="email" placeholder="yourname@ustp.edu.ph" className={inputClass} disabled={busy || inviteState === 'ready'} readOnly={inviteState === 'ready'} />
                            </div>
                            <div className={fieldClass}>
                                <label htmlFor="fs-password" className="sr-only">Password</label>
                                <Lock size={16} className={iconClass} aria-hidden="true" />
                                <input id="fs-password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')} autoComplete="new-password" placeholder={`Password (at least ${MIN_PASSWORD} characters)`} className={`${inputClass} !pr-10`} disabled={busy} />
                                <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:text-slate-400">
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div className={fieldClass}>
                                <label htmlFor="fs-confirm" className="sr-only">Confirm password</label>
                                <Lock size={16} className={iconClass} aria-hidden="true" />
                                <input id="fs-confirm" type={showPassword ? 'text' : 'password'} value={form.confirm} onChange={set('confirm')} autoComplete="new-password" placeholder="Confirm password" className={inputClass} disabled={busy} />
                            </div>
                            <button type="submit" disabled={busy} className={buttonClass}>
                                {busy ? <Loader2 className="animate-spin" size={16} /> : 'Send code'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={createAccount} className="space-y-3">
                            <div className={fieldClass}>
                                <label htmlFor="fs-code" className="sr-only">Verification code</label>
                                <MailCheck size={16} className={iconClass} aria-hidden="true" />
                                <input id="fs-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" autoFocus className={`${inputClass} font-mono tracking-[0.4em]`} disabled={busy} />
                            </div>
                            <button type="submit" disabled={busy} className={buttonClass}>
                                {busy ? <Loader2 className="animate-spin" size={16} /> : 'Create account'}
                            </button>
                            <div className="flex justify-between text-xs font-bold">
                                <button type="button" onClick={() => { setStep('details'); setError(''); }} className="text-slate-700 hover:underline dark:text-slate-300">Change details</button>
                                <button type="button" onClick={sendCode} disabled={busy} className="text-blue-800 hover:underline disabled:opacity-60 dark:text-blue-300">Send a new code</button>
                            </div>
                        </form>
                    )}

                    <Link to="/faculty" className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-blue-800 hover:underline dark:text-blue-300">
                        <ChevronLeft size={14} /> Back to login
                    </Link>
                </div>
            </div>
        </div>
    );
}
