import React, { useEffect, useRef, useState } from 'react';
import { Download, ChevronRight, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Link } from 'react-router-dom';
import { DEPARTMENTS, DEPARTMENT_COURSES, yearLevelsFor } from '../lib/academics';
import campusPhoto from '../assets/ustp-campus-blur.jpg';
import osaLogo from '../assets/osaconnect-logo.png';

const OFFLINE_MESSAGE = "Can't reach the server. Check your internet connection and try again.";
const STEP_COUNT = 3;
const CODE_LENGTH = 6;
// Matches the backend: codes expire 5 minutes after sending, and a new one can be asked for after a minute
const CODE_LIFETIME_S = 300;
const RESEND_AFTER_S = 60;

// Same look as the login pages: blue glass box over the campus photo
const cardClass = 'bg-sky-100/55 dark:bg-blue-950/55 backdrop-blur-md border border-white/70 dark:border-sky-300/25 shadow-[0_0_0_1px_rgba(255,255,255,0.35),0_0_24px_rgba(56,189,248,0.35),0_18px_40px_-8px_rgba(30,58,138,0.55)]';
const inputClass = 'w-full min-w-0 rounded-md border border-white/80 dark:border-white/15 bg-white/75 dark:bg-slate-900/60 px-2.5 sm:px-3 py-2 sm:py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400/60 dark:placeholder:text-slate-400/40 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60';
const labelClass = 'block text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white mb-1 sm:mb-1.5';
const hintClass = 'mt-1 sm:mt-1.5 text-[11px] sm:text-xs text-slate-700 dark:text-slate-300';
const primaryButton = 'h-10 sm:h-11 px-4 sm:px-5 rounded-md bg-blue-900 text-white text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-blue-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

const Field = ({ id, label, optional = false, hint, className = "", children }) => (
    <div className={`min-w-0 ${className}`}>
        <label htmlFor={id} className={`${labelClass} whitespace-nowrap`}>
            {label}{optional && <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300"> (optional)</span>}
        </label>
        {children}
        {hint && <p className={hintClass}>{hint}</p>}
    </div>
);

const StudentRegistration = () => {
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [otp, setOtp] = useState('');
    // When the latest code was sent, and a clock that ticks each second on step 2
    const [codeSentAt, setCodeSentAt] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const codeBoxes = useRef([]);
    const [studentData, setStudentData] = useState({
        student_id: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        course: '',
        department: '',
        year_level: '',
        email: '',
        contact_number: '',
        password: ''
    });
    // Kept outside studentData so it isn't sent to the API
    const [confirmPassword, setConfirmPassword] = useState('');
    const passwordMismatch = confirmPassword.length > 0 && confirmPassword !== studentData.password;
    const courseOptions = DEPARTMENT_COURSES[studentData.department] || [];
    const yearOptions = yearLevelsFor(studentData.department);
    const set = (key) => (e) => setStudentData({ ...studentData, [key]: e.target.value });

    // A new department (college) clears the program and year level when they don't belong to it
    const changeDepartment = (department) => {
        setStudentData((prev) => ({
            ...prev,
            department,
            course: (DEPARTMENT_COURSES[department] || []).includes(prev.course) ? prev.course : '',
            year_level: yearLevelsFor(department).some((y) => y.value === prev.year_level) ? prev.year_level : '',
        }));
    };

    // Same format as the mobile app: "ID FIRST MIDDLE LAST COURSE"
    const formatQRData = (student) => {
        const nameParts = [student.first_name, student.middle_name, student.last_name].filter(Boolean);
        const formattedName = nameParts.join(' ').toUpperCase();
        return `${student.student_id} ${formattedName} ${student.course || ''}`.trim();
    };

    useEffect(() => {
        if (step !== 2) return undefined;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [step]);

    const secondsSinceSent = Math.floor((now - codeSentAt) / 1000);
    const expiresIn = Math.max(0, CODE_LIFETIME_S - secondsSinceSent);
    const resendIn = Math.max(0, RESEND_AFTER_S - secondsSinceSent);
    const expiresLabel = `${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, '0')}`;

    // The 6 code boxes: typing moves to the next box, backspace to the previous, pasting fills them all
    const focusBox = (i) => codeBoxes.current[Math.max(0, Math.min(CODE_LENGTH - 1, i))]?.focus();
    const typeDigit = (i, value) => {
        const digits = value.replace(/\D/g, '');
        if (!digits) return;
        const chars = otp.padEnd(CODE_LENGTH, ' ').split('');
        digits.slice(0, CODE_LENGTH - i).split('').forEach((d, k) => { chars[i + k] = d; });
        setOtp(chars.join('').trimEnd());
        focusBox(i + digits.length);
    };
    const codeKeyDown = (i, e) => {
        if (e.key === 'Backspace') {
            e.preventDefault();
            const chars = otp.padEnd(CODE_LENGTH, ' ').split('');
            if (chars[i] !== ' ') {
                chars[i] = ' ';
            } else if (i > 0) {
                chars[i - 1] = ' ';
                focusBox(i - 1);
            }
            setOtp(chars.join('').trimEnd());
        } else if (e.key === 'ArrowLeft') {
            focusBox(i - 1);
        } else if (e.key === 'ArrowRight') {
            focusBox(i + 1);
        }
    };
    const pasteCode = (e) => {
        e.preventDefault();
        const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
        if (!digits) return;
        setOtp(digits);
        focusBox(digits.length);
    };
    const codeComplete = /^\d{6}$/.test(otp);

    const requestOTP = async (e) => {
        if (e) e.preventDefault();
        if (studentData.contact_number.length !== 11) {
            alert('Contact number must be exactly 11 digits (e.g. 09123456789).');
            return;
        }
        if (studentData.password !== confirmPassword) {
            alert('Passwords do not match. Please re-enter your password.');
            return;
        }
        setSaving(true);
        try {
            const response = await fetch('/api/students/request_otp/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // ID and contact are sent so a taken ID is caught before the code is emailed
                body: JSON.stringify({
                    email: studentData.email,
                    student_id: studentData.student_id,
                    contact_number: studentData.contact_number,
                    // Only used to greet the student in the code email
                    name: studentData.first_name
                })
            });
            if (response.ok) {
                setOtp('');
                setCodeSentAt(Date.now());
                setNow(Date.now());
                setStep(2);
                setTimeout(() => focusBox(0), 0);
            } else {
                const data = await response.json().catch(() => ({}));
                alert(data.error || 'Check your email');
            }
        } catch {
            // No response at all means the backend is down or unreachable, not a bad email
            alert(OFFLINE_MESSAGE);
        } finally {
            setSaving(false);
        }
    };

    const verifyAndRegister = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const fullName = `${studentData.first_name} ${studentData.middle_name ? studentData.middle_name + ' ' : ''}${studentData.last_name}`.trim();
            const response = await fetch('/api/students/register_with_otp/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...studentData, name: fullName, otp })
            });
            if (response.ok) {
                setStep(3);
            } else {
                const data = await response.json().catch(() => ({}));
                alert(`Verification Failed\n\n${data.error || data.message || 'Check your details'}`);
            }
        } catch {
            alert(`Verification Failed\n\n${OFFLINE_MESSAGE}`);
        } finally {
            setSaving(false);
        }
    };

    const downloadQR = () => {
        const svg = document.getElementById('qr-code-svg');
        if (!svg) return;
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            canvas.width = 1024;
            canvas.height = 1024;
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, 1024, 1024);
            const downloadLink = document.createElement('a');
            downloadLink.download = `${studentData.student_id}_qr_secure.png`;
            downloadLink.href = canvas.toDataURL('image/png');
            downloadLink.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    // Shown beside the QR on the last step: "Juan S. Dela Cruz" and "BS Information Technology · 2nd Year"
    const displayName = [
        studentData.first_name,
        studentData.middle_name ? `${studentData.middle_name.trim()[0].toUpperCase()}.` : '',
        studentData.last_name,
    ].filter(Boolean).join(' ');
    const ordinal = (n) => ({ 1: '1st', 2: '2nd', 3: '3rd' }[n] || `${n}th`);
    const yearText = /^\d+$/.test(studentData.year_level) ? `${ordinal(Number(studentData.year_level))} Year` : studentData.year_level;
    const programText = [studentData.course, yearText].filter(Boolean).join(' · ');

    const titles = { 1: 'Your details', 2: 'Verify your email', 3: "You're registered" };

    return (
        <div className="relative min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4 py-6 sm:py-8">
            {/* Same background as the login pages: the USTP campus (pre-blurred image) with a light wash */}
            <div aria-hidden="true" className="fixed inset-0 scale-105 bg-cover bg-center" style={{ backgroundImage: `url(${campusPhoto})` }} />
            <div aria-hidden="true" className="fixed inset-0 bg-white/40 dark:bg-slate-950/60" />

            <div className="relative z-10 w-full max-w-xl flex flex-col items-center gap-4 sm:gap-5">
                <img
                    src={osaLogo}
                    alt="OSAConnect: Smart student violation management"
                    className="w-full max-w-[220px] sm:max-w-sm h-auto select-none dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.55)]"
                    draggable="false"
                />

                <div className={`w-full rounded-md p-4 sm:p-7 ${cardClass}`}>
                    {/* Step indicator: which of the 3 steps and a progress bar */}
                    <div className="text-[11px] sm:text-xs">
                        <span className="font-black uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400">Step {step} of {STEP_COUNT}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1.5" aria-hidden="true">
                        {[1, 2, 3].map((n) => (
                            <span key={n} className={`h-1.5 rounded-full ${n <= step ? 'bg-amber-500' : 'bg-white/60 dark:bg-white/15'}`} />
                        ))}
                    </div>

                    <h1 className="mt-3 sm:mt-4 text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{titles[step]}</h1>

                    {step === 1 && (
                        <form onSubmit={requestOTP} className="mt-1 space-y-3 sm:space-y-4">
                            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-4 sm:mb-5">Use the same details as your USTP school ID.</p>

                            <Field id="reg-id" label="Student ID number" hint="Numbers only, as printed on your school ID.">
                                <input id="reg-id" required type="text" inputMode="numeric" placeholder="Student ID number" value={studentData.student_id}
                                    onChange={(e) => setStudentData({ ...studentData, student_id: e.target.value.replace(/\D/g, '').slice(0, 12) })} className={inputClass} />
                            </Field>

                            <div className="grid grid-cols-2 sm:grid-cols-3 items-end gap-3">
                                <Field id="reg-first" label="First name" className="col-span-2 sm:col-span-1">
                                    <input id="reg-first" required type="text" autoComplete="given-name" placeholder="First name" value={studentData.first_name} onChange={set('first_name')} className={inputClass} />
                                </Field>
                                <Field id="reg-middle" label="Middle name" optional>
                                    <input id="reg-middle" type="text" autoComplete="additional-name" placeholder="Middle name" value={studentData.middle_name} onChange={set('middle_name')} className={inputClass} />
                                </Field>
                                <Field id="reg-last" label="Last name">
                                    <input id="reg-last" required type="text" autoComplete="family-name" placeholder="Last name" value={studentData.last_name} onChange={set('last_name')} className={inputClass} />
                                </Field>
                            </div>

                            {/* College first; it decides the program list and year levels (Grade 11/12 for SHS) */}
                            <Field id="reg-college" label="College">
                                <select id="reg-college" required value={studentData.department} onChange={(e) => changeDepartment(e.target.value)} className={inputClass}>
                                    <option value="" disabled>Choose your college</option>
                                    {DEPARTMENTS.map((o) => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </Field>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Field id="reg-program" label="Program">
                                    <select id="reg-program" required disabled={!studentData.department} value={studentData.course} onChange={set('course')} className={inputClass}>
                                        <option value="" disabled>{studentData.department ? 'Choose your program' : 'Choose a college first'}</option>
                                        {courseOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </Field>
                                <Field id="reg-year" label="Year level">
                                    <select id="reg-year" required disabled={!studentData.department} value={studentData.year_level} onChange={set('year_level')} className={inputClass}>
                                        <option value="" disabled>{studentData.department ? 'Choose your year' : 'Choose a college first'}</option>
                                        {yearOptions.map((y) => <option key={y.value} value={y.value}>{y.label}</option>)}
                                    </select>
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Field id="reg-contact" label="Contact number" hint="11 digits, like 09171234567.">
                                    <input id="reg-contact" required type="tel" inputMode="numeric" autoComplete="tel" maxLength={11} placeholder="Contact number" value={studentData.contact_number}
                                        onChange={(e) => setStudentData({ ...studentData, contact_number: e.target.value.replace(/\D/g, '').slice(0, 11) })} className={inputClass} />
                                </Field>
                                <Field id="reg-email" label="Email" hint="We'll send your code and OSA notices here.">
                                    <input id="reg-email" required type="email" autoComplete="email" placeholder="Email" value={studentData.email} onChange={set('email')} className={inputClass} />
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Field id="reg-password" label="Password" hint="At least 8 characters.">
                                    <input id="reg-password" required type="password" autoComplete="new-password" minLength={8} placeholder="Password" value={studentData.password} onChange={set('password')} className={inputClass} />
                                </Field>
                                <Field id="reg-password2" label="Re-enter password">
                                    <input id="reg-password2" required type="password" autoComplete="new-password" placeholder="Re-enter password" value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)} className={`${inputClass} ${passwordMismatch ? '!border-red-500' : ''}`} />
                                    {passwordMismatch && <p className="mt-1.5 text-xs font-bold text-red-600 dark:text-red-400">Passwords do not match.</p>}
                                </Field>
                            </div>

                            <div className="flex items-center justify-between gap-3 pt-2">
                                <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                                    Already registered? <Link to="/student" className="font-bold text-slate-900 dark:text-white underline underline-offset-2">Log in</Link>
                                </span>
                                <button type="submit" disabled={saving} className={primaryButton}>
                                    {saving ? <Loader2 className="animate-spin" size={18} /> : <>Send verification code <ChevronRight size={16} /></>}
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={verifyAndRegister} className="mt-1">
                            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-4">
                                Enter the 6-digit code we sent you. It expires in 5 minutes.
                            </p>

                            <div className="flex items-center gap-2.5 rounded-md border border-white/80 dark:border-white/15 bg-white/60 dark:bg-slate-900/50 px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-slate-800 dark:text-slate-200">
                                <Mail size={16} className="shrink-0 text-blue-900 dark:text-blue-300" aria-hidden="true" />
                                <span className="min-w-0">Code sent to <span className="font-bold text-slate-900 dark:text-white break-all">{studentData.email}</span></span>
                            </div>

                            <fieldset className="mt-3 sm:mt-4">
                                <legend className="sr-only">6-digit code</legend>
                                <div className="grid grid-cols-6 gap-1.5 sm:gap-2.5" onPaste={pasteCode}>
                                    {Array.from({ length: CODE_LENGTH }, (_, i) => (
                                        <input
                                            key={i}
                                            ref={(el) => { codeBoxes.current[i] = el; }}
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete={i === 0 ? 'one-time-code' : 'off'}
                                            maxLength={i === 0 ? CODE_LENGTH : 1}
                                            aria-label={`Digit ${i + 1}`}
                                            value={(otp[i] || '').trim()}
                                            onChange={(e) => typeDigit(i, e.target.value)}
                                            onKeyDown={(e) => codeKeyDown(i, e)}
                                            onFocus={(e) => e.target.select()}
                                            className="w-full min-w-0 aspect-square max-h-14 rounded-md border border-white/80 dark:border-white/15 bg-white/75 dark:bg-slate-900/60 text-center text-lg sm:text-xl font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/40 focus:bg-white dark:focus:bg-slate-900"
                                        />
                                    ))}
                                </div>
                            </fieldset>

                            <p className="mt-2.5 text-xs text-slate-700 dark:text-slate-300">
                                {expiresIn > 0
                                    ? <>Code expires in <span className="font-bold tabular-nums text-slate-900 dark:text-white">{expiresLabel}</span></>
                                    : <span className="font-bold text-red-600 dark:text-red-400">Code expired</span>}
                                {' · '}
                                {resendIn > 0 ? (
                                    <span>Resend in <span className="tabular-nums">{resendIn}s</span></span>
                                ) : (
                                    <button type="button" onClick={requestOTP} disabled={saving} className="font-bold text-slate-900 dark:text-white underline underline-offset-2 disabled:opacity-60">Resend code</button>
                                )}
                            </p>

                            <div className="mt-5 sm:mt-6 grid grid-cols-2 gap-2.5 sm:gap-3">
                                <button type="button" onClick={() => setStep(1)}
                                    className="h-10 sm:h-11 px-3 rounded-md border border-white/80 dark:border-white/15 bg-white/50 dark:bg-slate-900/40 text-sm font-bold text-slate-900 dark:text-white hover:bg-white/80 dark:hover:bg-slate-900/70">
                                    ← Edit details
                                </button>
                                <button type="submit" disabled={saving || !codeComplete || expiresIn === 0} className={`${primaryButton} !px-3`}>
                                    {saving ? <Loader2 className="animate-spin" size={18} /> : 'Verify and create account'}
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 3 && (
                        <div className="mt-1">
                            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                                This is your personal OSAConnect QR code. Guards and OSA staff scan it to find your record.
                            </p>
                            <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 size={18} aria-hidden="true" /> Account created
                            </p>

                            {/* QR on the left, the details it belongs to on the right (stacked on narrow phones) */}
                            <div className="mt-3 flex flex-col min-[400px]:flex-row items-center gap-4 sm:gap-6 rounded-md border border-white/80 dark:border-white/15 bg-white/60 dark:bg-slate-900/50 p-4 sm:p-5">
                                <div className="shrink-0 rounded-md bg-white p-3">
                                    <QRCode id="qr-code-svg" value={formatQRData(studentData)} size={148} level="H" />
                                </div>
                                <dl className="min-w-0 w-full space-y-2.5">
                                    <div>
                                        <dt className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-slate-600 dark:text-slate-400">Student ID</dt>
                                        <dd className="text-xl sm:text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white break-all">{studentData.student_id}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-slate-600 dark:text-slate-400">Name</dt>
                                        <dd className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{displayName}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-slate-600 dark:text-slate-400">Program</dt>
                                        <dd className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{programText}</dd>
                                    </div>
                                </dl>
                            </div>

                            <p className="mt-3 text-xs text-slate-700 dark:text-slate-300">
                                Save it to your phone or print it. You can also find it anytime in your Settings.
                            </p>

                            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3">
                                <button type="button" onClick={downloadQR}
                                    className="h-10 sm:h-11 px-3 rounded-md bg-amber-400 hover:bg-amber-300 text-sm font-bold text-slate-900 flex items-center justify-center gap-1.5 transition-colors">
                                    <Download size={16} aria-hidden="true" /> Download QR code
                                </button>
                                <Link to="/student" className={`${primaryButton} !px-3`}>Continue to log in <ChevronRight size={16} /></Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentRegistration;
