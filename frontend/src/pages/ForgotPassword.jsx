import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Loader2, Mail, MailWarning, CheckCircle2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import campusPhoto from '../assets/ustp-campus-blur.jpg';
import osaLogo from '../assets/osaconnect-logo.png';
import { STUDENT_LOGIN } from '../lib/portals';

// Forgot password, in the same look as registration: 1) the account's email, 2) the emailed code (checked
// right away, so a wrong code shows here), 3) the new password, then a done screen.
// Server: /api/students/request_password_reset/, verify_reset_code/ and reset_password/ (code valid 5 minutes).

const OFFLINE_MESSAGE = "Can't reach the server. Check your internet connection and try again.";
const STEP_COUNT = 3;
const CODE_LENGTH = 6;
const CODE_LIFETIME_S = 300;
const RESEND_AFTER_S = 60;
const MIN_PASSWORD = 8;

const cardClass = 'bg-sky-100/55 dark:bg-blue-950/55 backdrop-blur-md border border-white/70 dark:border-sky-300/25 shadow-[0_0_0_1px_rgba(255,255,255,0.35),0_0_24px_rgba(56,189,248,0.35),0_18px_40px_-8px_rgba(30,58,138,0.55)]';
const inputClass = 'w-full min-w-0 rounded-md border border-white/80 dark:border-white/15 bg-white/75 dark:bg-slate-900/60 px-3 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400/60 dark:placeholder:text-slate-400/40 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900';
const labelClass = 'block text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white mb-1 sm:mb-1.5';
const primaryButton = 'h-11 w-full px-5 rounded-md bg-blue-900 text-white text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-blue-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

const PasswordInput = ({ id, value, onChange, placeholder, autoComplete, invalid }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input id={id} required type={show ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder}
                autoComplete={autoComplete} className={`${inputClass} pr-10 ${invalid ? '!border-red-500' : ''}`} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
        </div>
    );
};

const ForgotPassword = () => {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false); // the code email is on its way ("Sending code to …")
    const [error, setError] = useState('');
    const [codeError, setCodeError] = useState('');
    const [sentAt, setSentAt] = useState(0);
    const [now, setNow] = useState(Date.now());
    const codeBoxes = useRef([]);

    useEffect(() => {
        if (step !== 2) return undefined;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [step]);

    const secondsSinceSent = Math.floor((now - sentAt) / 1000);
    const expiresIn = Math.max(0, CODE_LIFETIME_S - secondsSinceSent);
    const resendIn = Math.max(0, RESEND_AFTER_S - secondsSinceSent);
    const expiresLabel = `${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, '0')}`;
    const codeComplete = /^\d{6}$/.test(otp);
    const mismatch = confirm.length > 0 && password !== confirm;
    const tooShort = password.length > 0 && password.length < MIN_PASSWORD;

    // The 6 code boxes: typing moves on, backspace goes back, pasting fills them all (same as registration)
    const focusBox = (i) => codeBoxes.current[Math.max(0, Math.min(CODE_LENGTH - 1, i))]?.focus();
    const typeDigit = (i, value) => {
        const digits = value.replace(/\D/g, '');
        if (!digits) return;
        const chars = otp.padEnd(CODE_LENGTH, ' ').split('');
        digits.slice(0, CODE_LENGTH - i).split('').forEach((d, k) => { chars[i + k] = d; });
        setOtp(chars.join('').trimEnd());
        setCodeError('');
        focusBox(i + digits.length);
    };
    const codeKeyDown = (i, e) => {
        if (e.key === 'Backspace') {
            e.preventDefault();
            const chars = otp.padEnd(CODE_LENGTH, ' ').split('');
            if (chars[i] !== ' ') chars[i] = ' ';
            else if (i > 0) { chars[i - 1] = ' '; focusBox(i - 1); }
            setOtp(chars.join('').trimEnd());
        } else if (e.key === 'ArrowLeft') focusBox(i - 1);
        else if (e.key === 'ArrowRight') focusBox(i + 1);
    };
    const pasteCode = (e) => {
        e.preventDefault();
        const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
        if (!digits) return;
        setOtp(digits);
        setCodeError('');
        focusBox(digits.length);
    };

    // Straight to the code step while the email is sent (that takes a few seconds); if the server says no
    // (e.g. no account with that email), back to step 1 with the reason
    const requestCode = async (e) => {
        e?.preventDefault();
        if (sending) return;
        const resending = step === 2;
        setError('');
        setOtp('');
        setCodeError('');
        setSentAt(Date.now());
        setNow(Date.now());
        setStep(2);
        setSending(true);
        setTimeout(() => focusBox(0), 0);
        try {
            const response = await fetch('/api/students/request_password_reset/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                if (!resending) setStep(1);
                setError(data.error || "Couldn't send the reset code. Try again.");
            }
        } catch {
            if (!resending) setStep(1);
            setError(OFFLINE_MESSAGE);
        } finally {
            setSending(false);
        }
    };

    // Step 2: the code is checked before the student types a new password
    const verifyCode = async (e) => {
        e.preventDefault();
        if (!codeComplete) { setCodeError('Enter the 6-digit code from the email.'); return; }
        setLoading(true);
        setError('');
        setCodeError('');
        try {
            const response = await fetch('/api/students/verify_reset_code/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), otp }),
            });
            const data = await response.json().catch(() => ({}));
            if (response.ok) {
                setStep(3);
            } else {
                setCodeError(data.error || "That code didn't work. Check it and try again.");
                setOtp('');
                setTimeout(() => focusBox(0), 0);
            }
        } catch {
            setError(OFFLINE_MESSAGE);
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async (e) => {
        e.preventDefault();
        if (password.length < MIN_PASSWORD) { setError(`Your new password needs at least ${MIN_PASSWORD} characters.`); return; }
        if (password !== confirm) { setError('The passwords do not match.'); return; }
        setLoading(true);
        setError('');
        setCodeError('');
        try {
            const response = await fetch('/api/students/reset_password/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), otp, password }),
            });
            const data = await response.json().catch(() => ({}));
            if (response.ok) {
                setStep(4);
            } else if (/code/i.test(data.error || '')) {
                // The code ran out while typing the password: back to the code step to get a new one
                setStep(2);
                setCodeError(data.error);
                setOtp('');
                setTimeout(() => focusBox(0), 0);
            } else {
                setError(data.error || "Couldn't reset the password. Try again.");
            }
        } catch {
            setError(OFFLINE_MESSAGE);
        } finally {
            setLoading(false);
        }
    };

    const titles = { 1: 'Forgot your password?', 2: 'Enter the code', 3: 'Set a new password', 4: 'Password changed' };

    return (
        <div className="relative min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4 py-6 sm:py-8">
            {/* Same background as the login and registration pages */}
            <div aria-hidden="true" className="fixed inset-0 scale-105 bg-cover bg-center" style={{ backgroundImage: `url(${campusPhoto})` }} />
            <div aria-hidden="true" className="fixed inset-0 bg-white/40 dark:bg-slate-950/60" />

            <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-4 sm:gap-5">
                <img src={osaLogo} alt="OSAConnect: Smart student violation management"
                    className="w-full max-w-[270px] sm:max-w-[340px] h-auto select-none dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.55)]" draggable="false" />

                <div className={`w-full rounded-md p-4 sm:p-7 ${cardClass}`}>
                    <span className="text-[11px] sm:text-xs font-black uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400">
                        {step > STEP_COUNT ? 'Done' : `Step ${step} of ${STEP_COUNT}`}
                    </span>
                    <div className="mt-2 grid grid-cols-3 gap-1.5" aria-hidden="true">
                        {[1, 2, 3].map((n) => <span key={n} className={`h-1.5 rounded-full ${n <= step ? 'bg-amber-500' : 'bg-white/60 dark:bg-white/15'}`} />)}
                    </div>
                    <h1 className="mt-3 sm:mt-4 text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{titles[step]}</h1>

                    {error && (
                        <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-bold text-red-700 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-300">{error}</p>
                    )}

                    {step === 1 && (
                        <form onSubmit={requestCode} className="mt-1">
                            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-4">
                                Type the email you registered with. We'll send you a 6-digit code to set a new password.
                            </p>
                            <label className={labelClass} htmlFor="fp-email">Email</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                                <input id="fp-email" required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email" className={`${inputClass} pl-9`} />
                            </div>
                            <button type="submit" disabled={sending} className={`${primaryButton} mt-5`}>
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <>Send reset code <ChevronRight size={16} /></>}
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={verifyCode} className="mt-1">
                            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-3">
                                Enter the 6-digit code we sent you. It expires in 5 minutes.
                            </p>
                            {/* Same reminder as registration: the code email often lands in Spam */}
                            <div role="note" className="mb-4 flex items-start gap-3 rounded-lg border-2 border-amber-400 bg-amber-50 px-3.5 py-3 text-amber-900 dark:border-amber-500/60 dark:bg-amber-500/15 dark:text-amber-200">
                                <MailWarning size={22} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                                <div>
                                    <p className="text-sm font-black">No email yet? Check your Spam or Junk folder.</p>
                                    <p className="mt-0.5 text-xs font-semibold text-amber-800/90 dark:text-amber-200/80">The code often lands there. Open it and mark it "Not spam" so the next one arrives in your inbox.</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5 rounded-md border border-white/80 dark:border-white/15 bg-white/60 dark:bg-slate-900/50 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200">
                                {sending
                                    ? <Loader2 size={16} className="shrink-0 animate-spin text-blue-900 dark:text-blue-300" aria-hidden="true" />
                                    : <Mail size={16} className="shrink-0 text-blue-900 dark:text-blue-300" aria-hidden="true" />}
                                <span className="min-w-0" aria-live="polite">
                                    {sending ? 'Sending code to ' : 'Code sent to '}
                                    <span className="font-bold text-slate-900 dark:text-white break-all">{email.trim()}</span>{sending ? '…' : ''}
                                </span>
                            </div>

                            <fieldset className="mt-3">
                                <legend className="sr-only">6-digit code</legend>
                                <div className="grid grid-cols-6 gap-1.5 sm:gap-2.5" onPaste={pasteCode}>
                                    {Array.from({ length: CODE_LENGTH }, (_, i) => (
                                        <input key={i} ref={(el) => { codeBoxes.current[i] = el; }} type="text" inputMode="numeric"
                                            autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={i === 0 ? CODE_LENGTH : 1} aria-label={`Digit ${i + 1}`}
                                            value={(otp[i] || '').trim()} onChange={(e) => typeDigit(i, e.target.value)} onKeyDown={(e) => codeKeyDown(i, e)}
                                            onFocus={(e) => e.target.select()}
                                            className={`w-full min-w-0 aspect-square max-h-14 rounded-md border bg-white/75 dark:bg-slate-900/60 text-center text-lg sm:text-xl font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/40 focus:bg-white dark:focus:bg-slate-900 ${codeError ? 'border-red-500' : 'border-white/80 dark:border-white/15'}`} />
                                    ))}
                                </div>
                            </fieldset>
                            {codeError && <p className="mt-1.5 text-xs font-bold text-red-600 dark:text-red-400">{codeError}</p>}
                            <p className="mt-2 text-xs text-slate-700 dark:text-slate-300">
                                {expiresIn > 0
                                    ? <>Code expires in <span className="font-bold tabular-nums text-slate-900 dark:text-white">{expiresLabel}</span></>
                                    : <span className="font-bold text-red-600 dark:text-red-400">Code expired</span>}
                                {' · '}
                                {resendIn > 0
                                    ? <span>Resend in <span className="tabular-nums">{resendIn}s</span></span>
                                    : <button type="button" onClick={requestCode} disabled={loading || sending} className="font-bold text-slate-900 dark:text-white underline underline-offset-2 disabled:opacity-60">Resend code</button>}
                            </p>

                            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3">
                                <button type="button" onClick={() => { setStep(1); setError(''); setCodeError(''); }}
                                    className="h-11 px-3 rounded-md border border-white/80 dark:border-white/15 bg-white/50 dark:bg-slate-900/40 text-sm font-bold text-slate-900 dark:text-white hover:bg-white/80 dark:hover:bg-slate-900/70">
                                    ← Change email
                                </button>
                                <button type="submit" disabled={loading || !codeComplete || expiresIn === 0} className={`${primaryButton} !px-3`}>
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : <>Enter code <ChevronRight size={16} /></>}
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={resetPassword} className="mt-1">
                            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-4">
                                Code accepted. Choose a new password for <span className="font-bold text-slate-900 dark:text-white break-all">{email.trim()}</span>.
                            </p>
                            <div className="space-y-3">
                                <div>
                                    <label className={labelClass} htmlFor="fp-password">New password</label>
                                    <PasswordInput id="fp-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" autoComplete="new-password" invalid={tooShort} />
                                    <p className={`mt-0.5 text-[11px] sm:text-xs ${tooShort ? 'font-bold text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}>At least {MIN_PASSWORD} characters.</p>
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="fp-confirm">Re-enter password</label>
                                    <PasswordInput id="fp-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" autoComplete="new-password" invalid={mismatch} />
                                    {mismatch && <p className="mt-0.5 text-xs font-bold text-red-600 dark:text-red-400">Passwords do not match.</p>}
                                </div>
                            </div>
                            <button type="submit" disabled={loading} className={`${primaryButton} mt-5`}>
                                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Save new password'}
                            </button>
                        </form>
                    )}

                    {step === 4 && (
                        <div className="mt-2">
                            <div className="flex items-start gap-3 rounded-md border border-emerald-300 bg-emerald-50 px-3.5 py-3 dark:border-emerald-500/40 dark:bg-emerald-500/15">
                                <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                                    Your password was changed. Log in with your Student ID or email and the new password.
                                </p>
                            </div>
                            <Link to={STUDENT_LOGIN} className={`${primaryButton} mt-5`}>Back to login <ChevronRight size={16} /></Link>
                        </div>
                    )}

                    {step < 4 && (
                        <p className="mt-4 text-center text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                            <Link to={STUDENT_LOGIN} className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-white underline underline-offset-2">
                                <ArrowLeft size={14} /> Back to login
                            </Link>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
