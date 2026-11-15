import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Scan, CheckCircle2, X, UserRound, UserCheck, Keyboard, ArrowLeft, ArrowRight, Loader2, IdCard, Building2, GraduationCap, Users, Phone, Mail, CalendarDays, Clock, BadgeCheck, MailCheck } from 'lucide-react';

import QrScannerModal from '../../components/QrScannerModal';
import scanMark from '../../assets/osaconnect-icon.png';
import { parseStudentQr, NOT_A_STUDENT_QR } from '../../components/studentQr';
import { DEPARTMENTS, GENDERS, departmentForCourse, courseOptionsFor } from '../../lib/academics';
// Violation types a guard or faculty & staff can report (shared with the admin's Report Violation)
import { VIOLATIONS } from '../../lib/violationTypes';
import ViolationPicker from '../../components/ViolationPicker';
import { studentName as displayStudentName } from '../../lib/names';

// Phones get shorter boxes (py-2) so the whole form fits with less scrolling, like registration
const inputClass = "w-full min-w-0 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 font-semibold text-sm text-slate-800 dark:text-slate-200 focus:border-ustp-blue outline-none transition-colors placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60";
// Dropdowns: the browser's own look adds inner padding and bigger text, so they're drawn like the text
// boxes with a small chevron; `empty` makes "Choose" faint like a placeholder (same as StudentRegistration)
const selectClass = (empty) => `${inputClass} appearance-none truncate bg-[length:14px] bg-[right_0.6rem_center] bg-no-repeat pr-8 ${empty ? '!text-slate-400 !font-medium' : ''}`;
const selectArrow = { backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" };
const labelClass = "rv-label mb-1 ml-1 block text-xs font-bold text-[#1e2a6b] dark:text-blue-200";

// A field label with its icon
// Text only (no icon), for a minimal form; `icon` is still accepted and ignored
// rv-label: tightened on short screens; `text` (a text box's label) can hide there, its placeholder names the field
const Label = ({ htmlFor, children, text = false }) => (
    <label htmlFor={htmlFor} className={`rv-label ${text ? 'rv-label-text' : ''} mb-1 ml-1 block text-xs font-bold text-[#1e2a6b] dark:text-blue-200`}>
        {children}
    </label>
);


const emptyForm = () => ({
    student_id: '', gender: '', course: '', department: '', contact: '',
    // Typed in for a student who isn't registered yet; a registered student's name comes from their record
    first_name: '', last_name: '', record_name: '', record_display: '', record_registered: false, record_year: '',
    email: '', violations: [], // one or more; each becomes its own report
    incident_date: new Date().toISOString().split('T')[0],
    incident_time: new Date().toTimeString().slice(0, 5),
});

// Faculty (no account, /faculty/report): the confirmed email, kept for this browser tab until it expires
const FACULTY_KEY = 'osa-faculty-email';
const readFacultyEmail = () => {
    try {
        const saved = JSON.parse(sessionStorage.getItem(FACULTY_KEY) || 'null');
        return saved?.token && saved.expiresAt > Date.now() ? saved : null;
    } catch { return null; }
};
// Only the shape here: the server checks it's a USTP address (or a test address in backend/.env)
const USTP_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Guards and faculty & staff report a violation: find the student (scan their QR or type the ID), pick
// the violation, check, send. OSA reviews it on the admin side. publicFaculty: the faculty report page,
// open without an account; the faculty member confirms their USTP email with a code before sending.
const ReportViolation = ({ publicFaculty = false }) => {
    const user = publicFaculty ? {} : JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = publicFaculty ? 'faculty' : (user.role || 'guard');
    const userName = user.full_name || 'Personnel';
    // Guards share accounts, so a guard account types the name of the guard on duty (kept on this device for
    // the next report). It's the "Reported by" OSA sees. Faculty & staff report as themselves.
    const isGuard = userRole === 'guard';
    // Guards and logged-in faculty & staff report the same way: the scan / enter manually choice first, then the
    // form in two steps. (Faculty without an account confirm their email on a single form instead.)
    const kiosk = isGuard || (userRole === 'staff' && !publicFaculty);
    // First and last name, kept on this device as "First|Last" (an older full name: its first word is the first name)
    const isFaculty = publicFaculty || userRole === 'staff';

    // Faculty email confirmation: type the email -> "Confirm email address" sends a code -> type it -> the
    // report can be submitted (backend faculty_verify_request / faculty_verify_confirm / faculty_report)
    const [facultyEmail, setFacultyEmail] = useState('');
    const [verified, setVerified] = useState(() => (publicFaculty ? readFacultyEmail() : null));
    const [codeSentTo, setCodeSentTo] = useState('');
    const [code, setCode] = useState('');
    const [emailBusy, setEmailBusy] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [emailHasAccount, setEmailHasAccount] = useState(false); // the email already has a faculty account
    const verifiedName = verified ? [verified.first_name, verified.last_name].filter(Boolean).join(' ') : '';
    // Guards: the guard account's name (the server names the report after it too)
    const reporterName = publicFaculty ? (verifiedName || '—') : userName;

    const postJson = async (url, body) => {
        setEmailBusy(true);
        setEmailError('');
        try {
            const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await r.json().catch(() => ({}));
            if (!r.ok) { setEmailError(data.error || 'Something went wrong. Try again.'); setEmailHasAccount(Boolean(data.has_account)); return null; }
            setEmailHasAccount(false);
            return data;
        } catch {
            setEmailError("Can't reach the server. Check your connection and try again.");
            return null;
        } finally {
            setEmailBusy(false);
        }
    };
    const sendCode = async () => {
        const email = facultyEmail.trim().toLowerCase();
        if (!USTP_EMAIL.test(email)) {
            setEmailError('Use your USTP email, ending in @ustp.edu.ph.');
            document.getElementById('rv-faculty-email')?.focus();
            return;
        }
        if (await postJson('/api/faculty/verify/request/', { faculty_email: email })) {
            setFacultyEmail(email);
            setCodeSentTo(email);
            setCode('');
        }
    };
    const checkCode = async () => {
        if (code.length !== 6) { setEmailError('Type the 6-digit code from the email.'); return; }
        const data = await postJson('/api/faculty/verify/confirm/', { faculty_email: codeSentTo, otp: code });
        if (data) {
            const saved = { ...data, expiresAt: Date.now() + data.expires_in * 1000 };
            try { sessionStorage.setItem(FACULTY_KEY, JSON.stringify(saved)); } catch { /* private mode */ }
            setVerified(saved);
            setCodeSentTo('');
        }
    };
    const changeEmail = () => {
        try { sessionStorage.removeItem(FACULTY_KEY); } catch { /* private mode */ }
        setVerified(null);
        setCodeSentTo('');
        setEmailError('');
    };

    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [form, setForm] = useState(emptyForm);
    // Guards start on a kiosk-style screen: scan the student's ID, or enter the details by hand. The form shows
    // once they choose (after a successful scan, or "Enter manually"); cancelling the camera keeps the start screen.
    const [started, setStarted] = useState(!kiosk);
    // "Enter manually": typing only. The kiosk forms (guards, faculty & staff) never show a scan button on the ID
    // box: scanning is the start screen's "Scan Student ID"
    const [manual, setManual] = useState(false);
    // Guards fill in the report in two steps: 1. the student, then (Next) 2. the violation, date and time
    const [step, setStep] = useState(1);
    const studentRef = useRef(null);
    const nextStep = () => {
        // The browser's own checks on the student fields (required, 10-number ID...), one at a time
        const fields = studentRef.current ? [...studentRef.current.querySelectorAll('input, select, textarea')] : [];
        if (fields.some((el) => !el.reportValidity())) return;
        setStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const guardStep1 = kiosk && step === 1;
    const guardStep2 = kiosk && step === 2;
    const [focusId, setFocusId] = useState(false);
    useEffect(() => {
        if (!focusId) return;
        document.getElementById('rv-id')?.focus();
        setFocusId(false);
    }, [focusId]);

    // The scanner only hands over codes that parseStudentQr accepts (see validate below)
    const handleScanResult = (decodedText) => {
        setIsScanning(false);
        const student = parseStudentQr(decodedText);
        if (!student) return;
        setStarted(true);
        // The QR's name (in full, as registered) and course; the department follows from the course
        setForm(prev => ({
            ...prev,
            student_id: student.studentId,
            record_name: student.name || prev.record_name,
            // The full name as registered ("Vincent Macahilos Dagaraga"), not shortened to an initial
            record_display: student.name || prev.record_display,
            course: student.course || prev.course,
            department: departmentForCourse(student.course) || prev.department,
        }));
        fetchStudentData(student.studentId);
    };

    // A registered student's details fill in the form. A record made from an earlier report (no account yet)
    // only fills in what it knows: its "Unregistered Student" / "Unknown" don't replace what the QR said.
    const fetchStudentData = async (id) => {
        // The faculty page (no account) looks students up too (backend faculty_student_lookup)
        const url = publicFaculty ? `/api/faculty/student/${id}/` : `/api/students/${id}/`;
        try {
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                const known = (value) => value && value !== 'Unknown';
                setForm(prev => {
                    if (prev.student_id !== id) return prev; // the ID changed while this was loading
                    const useName = data.has_account || (!prev.record_name && data.name && data.name !== 'Unregistered Student');
                    return {
                        ...prev, student_id: id,
                        record_registered: Boolean(data.has_account),
                        record_year: data.year_level || '',
                        // The full name as registered, not "First M. Last"
                        ...(useName && { record_name: data.name, record_display: data.name || displayStudentName(data) }),
                        course: known(data.course) ? data.course : prev.course,
                        department: known(data.department) ? data.department : prev.department,
                        contact: data.contact_number || prev.contact, email: data.email || prev.email,
                        gender: data.gender || prev.gender,
                    };
                });
            }
        } catch { /* not registered yet: typed in by hand */ }
    };

    // Student IDs are 10 numbers: only digits, and the student is looked up once all 10 are typed
    const handleIdChange = (e) => {
        const id = e.target.value.replace(/\D/g, '').slice(0, 10);
        // A different ID: the name found for the old one no longer applies
        setForm(prev => (id === prev.student_id ? prev : { ...prev, student_id: id, record_name: '', record_display: '', record_registered: false, record_year: '' }));
        if (id.length === 10) fetchStudentData(id);
    };

    // The name sent (in full) and shown ("Juan D. Cruz"): from the student's record or QR, else the typed fields
    // First and last name only (no middle initial)
    const typedName = [form.first_name.trim(), form.last_name.trim()].filter(Boolean).join(' ');
    const sentName = form.record_name || typedName;
    const studentName = form.record_display || form.record_name || typedName;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (guardStep1) { nextStep(); return; } // Enter on step 1 goes to step 2, it doesn't send
        if (!form.violations.length) {
            alert('Choose at least one violation.');
            return;
        }
        // Faculty: the button says "Confirm email address" until the email is confirmed with its code
        if (publicFaculty && !verified) {
            if (!codeSentTo) sendCode();
            else document.getElementById('rv-faculty-code')?.focus();
            document.getElementById('rv-faculty')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        setShowConfirmModal(true);
    };

    // Ticks or unticks a violation; the list keeps the order of VIOLATIONS
    const toggleViolation = (value) => setForm((prev) => ({
        ...prev,
        violations: prev.violations.includes(value)
            ? prev.violations.filter((v) => v !== value)
            : VIOLATIONS.map(([v]) => v).filter((v) => v === value || prev.violations.includes(v)),
    }));

    const confirmSubmission = async () => {
        setShowConfirmModal(false);
        setLoading(true);
        try {
            const response = await fetch(publicFaculty ? '/api/faculty/report/' : '/api/violations/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form, name: sentName, violation_types: form.violations, reporting_guard: userName,
                    token: publicFaculty ? verified?.token : undefined,
                }),
            });
            if (response.ok) setSent(true);
            else {
                const err = await response.json().catch(() => ({}));
                if (err.needs_verification) {
                    // The confirmation expired: confirm the email again, the form stays filled in
                    changeEmail();
                    setEmailError(err.error);
                    return;
                }
                alert(`Couldn't send the report. ${err.error || 'Check the details and try again.'}`);
            }
        } catch {
            alert("Can't reach the server. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setSent(false);
        setForm(emptyForm());
        setStarted(!kiosk); // back to the scan / enter manually screen
        setManual(false);
        setStep(1);
    };

    const violationLabels = form.violations.map((v) => VIOLATIONS.find(([value]) => value === v)?.[1] || v);
    // For the receipt: "CITC", initials, and "Wed, Sep 30, 2026 · 8:46 PM"
    const deptShort = (form.department.match(/\(([^)]+)\)\s*$/) || [])[1] || form.department;
    const initials = studentName.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
    const incidentWhen = (() => {
        const d = new Date(`${form.incident_date}T${form.incident_time || '00:00'}`);
        if (Number.isNaN(d.getTime())) return `${form.incident_date} · ${form.incident_time}`;
        return `${d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · ${d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}`;
    })();

    // Inside the guard / faculty & staff layout (components/ReporterShell.jsx): top bar, menu and Log out live there
    return (
        <>
            {isScanning && (
                <QrScannerModal
                    title="Scan Student QR"
                    subtitle="Scan the student's ID or OSAConnect QR code"
                    // Live camera only (no uploading a photo): the reporter scans the ID in front of them.
                    // Only student ID codes; OSA action/location codes and other QRs are rejected on the spot
                    validate={(text) => (parseStudentQr(text) ? null : NOT_A_STUDENT_QR)}
                    onClose={() => setIsScanning(false)}
                    onResult={handleScanResult}
                />
            )}

            {/* Check before sending */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
                    {/* The report as a slip: who, what, when, then Edit / Send */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
                        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Violation report</p>
                                <h2 id="confirm-title" className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Check before sending</h2>
                            </div>
                            <button onClick={() => setShowConfirmModal(false)} aria-label="Close" className="w-9 h-9 shrink-0 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 flex items-center justify-center">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mx-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                            {/* Student */}
                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 px-4 py-3.5">
                                <div className="w-11 h-11 shrink-0 rounded-full bg-blue-100 text-ustp-blue dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center text-sm font-bold">{initials}</div>
                                <div className="min-w-0">
                                    <p className="truncate text-base font-bold text-slate-900 dark:text-white">{studentName || '—'}</p>
                                    <p className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">{form.student_id}</p>
                                    <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                                        {[form.course, deptShort, form.gender].filter(Boolean).join(' · ')}
                                    </p>
                                </div>
                            </div>

                            {/* Violations */}
                            <div className="border-t border-dashed border-slate-200 dark:border-slate-700 px-4 py-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{violationLabels.length > 1 ? 'Violations' : 'Violation'}</p>
                                    {violationLabels.length > 1 && (
                                        <span className="rounded-full bg-red-100 dark:bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-300">{violationLabels.length} reports</span>
                                    )}
                                </div>
                                <ul className="space-y-1.5">
                                    {violationLabels.map((v) => (
                                        <li key={v} className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm font-bold text-red-700 dark:text-red-300">
                                            {v}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* When and who */}
                            <dl className="border-t border-dashed border-slate-200 dark:border-slate-700 px-4 py-3 space-y-1.5 text-sm">
                                <div className="flex items-baseline justify-between gap-4">
                                    <dt className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">When</dt>
                                    <dd className="min-w-0 text-right font-bold text-slate-800 dark:text-slate-200">{incidentWhen}</dd>
                                </div>
                                <div className="flex items-baseline justify-between gap-4">
                                    <dt className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">Reported by</dt>
                                    <dd className="min-w-0 truncate text-right font-bold text-slate-800 dark:text-slate-200">{reporterName}</dd>
                                </div>
                            </dl>
                        </div>

                        <p className="mx-5 mt-3 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                            OSA reviews {violationLabels.length > 1 ? 'each report' : 'the report'} before any penalty is given. The student gets an email about it{isFaculty ? ', and the guards see it so they can return the student\'s ID' : ''}.
                        </p>

                        <div className="grid grid-cols-2 gap-3 p-5">
                            <button onClick={() => setShowConfirmModal(false)} className="py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700">Edit</button>
                            <button onClick={confirmSubmission} disabled={loading} className="py-3 rounded-xl bg-ustp-blue text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-800 disabled:opacity-60">
                                {violationLabels.length > 1 ? `Send ${violationLabels.length} reports` : 'Send report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation modal before logging out */}
            <main className={`w-full px-3 py-4 md:px-6 md:py-6 ${kiosk ? 'report-compact' : ''} ${!sent && !started ? 'h-full' : ''}`}>
                <div className={`max-w-4xl mx-auto w-full ${!sent && !started ? 'h-full' : 'pb-10'}`}>
                    {!sent && !started ? (
                        // The guard's start screen (kiosk style): two boxes to choose from, scan the student's ID or type the details
                        <div className="flex h-full flex-col items-center justify-center px-1 py-2">
                            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[2px] text-slate-500 sm:text-sm dark:text-slate-400">How do you want to report?</p>
                            <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                                <button type="button" onClick={() => setIsScanning(true)}
                                    className="group flex flex-col items-center gap-2 rounded-3xl border-2 border-slate-200 bg-white p-4 text-center sm:gap-3 sm:p-6 shadow-[0_10px_30px_-12px_rgba(16,26,75,0.2)] transition-all hover:border-[#1e2a6b] hover:shadow-[0_14px_34px_-12px_rgba(16,26,75,0.3)] active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-400">
                                    <img src={scanMark} alt="" className="h-20 w-20 select-none transition-transform group-hover:scale-105 sm:h-32 sm:w-32" draggable="false" />
                                    <span className="text-lg font-black uppercase tracking-[0.5px] text-[#1e2a6b] sm:text-xl dark:text-white">Scan Student ID</span>
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Point the camera at the student's ID or QR code</span>
                                </button>
                                <button type="button" onClick={() => { setStarted(true); setManual(true); setFocusId(true); }}
                                    className="group flex flex-col items-center gap-2 rounded-3xl border-2 border-slate-200 bg-white p-4 text-center sm:gap-3 sm:p-6 shadow-[0_10px_30px_-12px_rgba(16,26,75,0.2)] transition-all hover:border-[#1e2a6b] hover:shadow-[0_14px_34px_-12px_rgba(16,26,75,0.3)] active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-400">
                                    <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#1e2a6b]/5 text-[#1e2a6b] transition-transform group-hover:scale-105 sm:h-32 sm:w-32 dark:bg-white/5 dark:text-white">
                                        <Keyboard size={48} strokeWidth={1.6} />
                                    </span>
                                    <span className="text-lg font-black uppercase tracking-[0.5px] text-[#1e2a6b] sm:text-xl dark:text-white">Enter Manually</span>
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tap here to input student info manually</span>
                                </button>
                            </div>
                        </div>
                    ) : !sent ? (
                        <>
                        {/* Guards: back to the scan / enter manually choice (in case of a wrong tap); clears the form */}
                        {kiosk && (
                            // Back and the step on one row
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <button type="button" onClick={() => (step === 2 ? setStep(1) : (setForm(emptyForm()), setStarted(false), setManual(false)))}
                                    className="-ml-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-bold text-ustp-blue hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-white/5">
                                    <ArrowLeft size={17} /> Back
                                </button>
                                <p className="px-1 text-xs font-bold uppercase tracking-[1.5px] text-slate-500 dark:text-slate-400">
                                    Step {step} of 2 · {step === 1 ? 'Student' : 'Violation'}
                                </p>
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="rv-stack card-premium p-3.5 sm:p-6 space-y-4 sm:space-y-5">
                            {/* Faculty (no account): the USTP email the report is sent under, confirmed with a code */}
                            {publicFaculty && (
                                <div id="rv-faculty" className={`rounded-xl border-2 px-3 py-3 ${verified ? 'border-emerald-100 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30' : 'border-blue-100 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30'}`}>
                                    {verified ? (
                                        <div className="flex items-center gap-2.5">
                                            <BadgeCheck size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                                            <p className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                Email confirmed: <span className="font-bold text-slate-900 dark:text-white">{verifiedName}</span> · {verified.email}
                                            </p>
                                            <button type="button" onClick={changeEmail} className="shrink-0 text-xs font-bold text-ustp-blue hover:underline dark:text-blue-300">Change</button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <label htmlFor="rv-faculty-email" className="flex items-center gap-1.5 text-xs font-bold text-ustp-blue dark:text-blue-300">
                                                <Mail size={15} /> Your USTP email
                                            </label>
                                            <input id="rv-faculty-email" type="email" required value={facultyEmail} maxLength={254} autoComplete="email"
                                                onChange={(e) => { setFacultyEmail(e.target.value); if (codeSentTo) setCodeSentTo(''); }}
                                                placeholder="yourname@ustp.edu.ph" className={`${inputClass} !bg-white dark:!bg-slate-900`} disabled={emailBusy} />
                                            {codeSentTo && (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">We sent a 6-digit code to <span className="font-bold">{codeSentTo}</span>. It expires in 5 minutes.</p>
                                                    <div className="flex gap-2">
                                                        <input id="rv-faculty-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); checkCode(); } }}
                                                            inputMode="numeric" autoComplete="one-time-code" placeholder="000000" autoFocus
                                                            className={`${inputClass} !bg-white dark:!bg-slate-900 text-center font-mono tracking-[0.35em]`} disabled={emailBusy} />
                                                        <button type="button" onClick={checkCode} disabled={emailBusy} className="shrink-0 rounded-lg sm:rounded-xl bg-ustp-blue px-4 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60">
                                                            {emailBusy ? <Loader2 size={16} className="animate-spin" /> : 'Verify'}
                                                        </button>
                                                    </div>
                                                    <button type="button" onClick={sendCode} disabled={emailBusy} className="text-xs font-bold text-ustp-blue hover:underline disabled:opacity-60 dark:text-blue-300">Send a new code</button>
                                                </div>
                                            )}
                                            {emailError && (
                                                <p role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
                                                    {emailError}
                                                    {emailHasAccount && <> <Link to="/faculty" className="font-bold text-ustp-blue underline dark:text-blue-300">Log in</Link></>}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className={`grid grid-cols-1 gap-4 sm:gap-5 ${kiosk ? '' : 'md:grid-cols-2'}`}>
                                {/* Student (guards: step 1) */}
                                {guardStep2 && (
                                    // Step 2: who the report is about, from step 1
                                    <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-900/60">
                                        <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800 dark:text-slate-100">{studentName || 'Student'} <span className="font-medium text-slate-500 dark:text-slate-400">· {form.student_id}</span></p>
                                        <button type="button" onClick={() => setStep(1)} className="shrink-0 text-xs font-bold text-ustp-blue hover:underline dark:text-blue-300">Edit</button>
                                    </div>
                                )}
                                <section ref={studentRef} className={`rv-stack space-y-2.5 sm:space-y-3 min-w-0 ${guardStep2 ? 'hidden' : ''}`}>
                                    <h2 className={`flex items-center gap-2 text-base font-black text-ustp-blue dark:text-blue-300 ${kiosk ? 'hidden' : ''}`}>
                                        Student
                                    </h2>
                                    <div>
                                        <Label text htmlFor="rv-id" icon={IdCard}>{manual || kiosk ? 'Student ID' : 'Student ID (type it or scan their QR)'}</Label>
                                        <div className="relative">
                                            <input id="rv-id" required value={form.student_id} onChange={handleIdChange} placeholder="Student ID" inputMode="numeric" maxLength={10} minLength={10} title="10 numbers, like 2023303188" className={`${inputClass} ${manual || kiosk ? '' : 'pr-12'}`} />
                                            {!manual && !kiosk && <button type="button" onClick={() => setIsScanning(true)} aria-label="Scan student QR" className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square bg-ustp-blue text-white rounded-lg flex items-center justify-center active:scale-95 transition-transform">
                                                <Scan size={16} />
                                            </button>}
                                        </div>
                                    </div>
                                    {form.record_name ? (
                                        // From the student's record or QR (the report goes by ID): the name, and what the
                                        // record says about them; the fields below are filled in from it too
                                        <div>
                                            <p className={`${labelClass} rv-label-text`}>Name</p>
                                            <div className="rv-namebox flex items-start gap-2 rounded-lg sm:rounded-xl border-2 border-emerald-100 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 px-3 py-2 sm:py-2.5">
                                                <UserCheck size={15} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-200">{studentName}</p>
                                                    <p className="truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                                        {[form.record_registered ? 'Registered student' : 'Not registered yet',
                                                            form.record_year && (/^\d$/.test(form.record_year) ? `Year ${form.record_year}` : form.record_year)].filter(Boolean).join(' · ')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        // Not registered yet: typed in, saved as "First Last"
                                        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                                            <div className="min-w-0">
                                                <Label text htmlFor="rv-first" icon={UserRound}>First name</Label>
                                                <input id="rv-first" required placeholder="First name" autoComplete="off" maxLength={50} value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} className={inputClass} />
                                            </div>
                                            <div className="min-w-0">
                                                <label htmlFor="rv-last" className={`${labelClass} rv-label-text`}>Last name</label>
                                                <input id="rv-last" required placeholder="Last name" autoComplete="off" maxLength={50} value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} className={inputClass} />
                                            </div>
                                        </div>
                                    )}
                                    {/* Department first, then only its courses (same as registration) */}
                                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                                        <div className="min-w-0">
                                            <Label htmlFor="rv-dept" icon={Building2}>Department</Label>
                                            <select id="rv-dept" required value={form.department} onChange={e => {
                                                const department = e.target.value;
                                                setForm({ ...form, department, course: courseOptionsFor(department).includes(form.course) ? form.course : '' });
                                            }} className={selectClass(!form.department)} style={selectArrow}>
                                                <option value="">Choose</option>
                                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                        <div className="min-w-0">
                                            <Label htmlFor="rv-course" icon={GraduationCap}>Course</Label>
                                            <select id="rv-course" required disabled={!form.department} value={form.course} onChange={e => setForm({ ...form, course: e.target.value })} className={selectClass(!form.course)} style={selectArrow}>
                                                <option value="">{form.department ? 'Choose' : 'Department first'}</option>
                                                {courseOptionsFor(form.department, form.course).map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    {/* Short fields side by side, also on phones */}
                                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                                        <div className="min-w-0">
                                            <Label htmlFor="rv-gender" icon={Users}>Gender</Label>
                                            <select id="rv-gender" required value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className={selectClass(!form.gender)} style={selectArrow}>
                                                <option value="">Choose</option>
                                                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                                            </select>
                                        </div>
                                        <div className="min-w-0">
                                            <Label text htmlFor="rv-contact" icon={Phone}>Contact number</Label>
                                            <input id="rv-contact" required type="tel" placeholder="Contact number" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} className={inputClass} />
                                        </div>
                                    </div>
                                    <div>
                                        <Label text htmlFor="rv-email" icon={Mail}>Email</Label>
                                        <input id="rv-email" required type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} />
                                    </div>
                                </section>

                                {/* Violation (guards: step 2) */}
                                <section className={`rv-stack space-y-2.5 sm:space-y-3 min-w-0 ${guardStep1 ? 'hidden' : ''}`}>
                                    <h2 className={`flex items-center gap-2 text-base font-black text-ustp-blue dark:text-blue-300 ${kiosk ? 'hidden' : ''}`}>
                                        Violation
                                    </h2>
                                    {/* Tick every violation the student committed; each becomes its own report */}
                                    <fieldset>
                                        <legend className={labelClass}>What happened (choose all that apply)</legend>
                                        {/* Two dropdowns (Less Grave, Light): + adds a violation */}
                                        <ViolationPicker value={form.violations} onToggle={toggleViolation} />
                                        {form.violations.length > 1 && (
                                            <p className="mt-1.5 ml-1 text-xs font-semibold text-red-600 dark:text-red-400">{form.violations.length} violations: each is sent as its own report.</p>
                                        )}
                                    </fieldset>
                                    {/* min-w-0 + appearance-none stop iPhone Safari's date/time boxes from spilling past the card */}
                                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                                        <div className="min-w-0">
                                            <Label htmlFor="rv-date" icon={CalendarDays}>Date</Label>
                                            <input id="rv-date" type="date" required value={form.incident_date} onChange={e => setForm({ ...form, incident_date: e.target.value })} className={`${inputClass} appearance-none`} />
                                        </div>
                                        <div className="min-w-0">
                                            <Label htmlFor="rv-time" icon={Clock}>Time</Label>
                                            <input id="rv-time" type="time" required value={form.incident_time} onChange={e => setForm({ ...form, incident_time: e.target.value })} className={`${inputClass} appearance-none`} />
                                        </div>
                                    </div>
                                    <p className="rv-note rounded-xl bg-slate-50 dark:bg-slate-900 px-3 py-2 sm:py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                                        OSA reviews every report before any penalty is given. The student gets an email about it.
                                    </p>
                                </section>
                            </div>

                            {guardStep1 ? (
                                // Guards, step 1: on to the violation
                                // preventDefault + its own key: the Submit button takes this spot as the step changes, and the same tap
                                // must not count as a press on it (that sent the form / asked for a violation)
                                <button key="next" type="button" onClick={(e) => { e.preventDefault(); nextStep(); }} className="bg-ustp-blue text-white w-full py-3 sm:py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-800">
                                    Next <ArrowRight size={18} />
                                </button>
                            ) : publicFaculty && !verified ? (
                                // Faculty: confirm the email first (sends the code), then the button becomes Submit report
                                <button type="submit" disabled={emailBusy} className="bg-ustp-blue text-white w-full py-3 sm:py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-800 active:scale-[0.99] transition-transform disabled:opacity-60">
                                    {emailBusy ? <Loader2 size={18} className="animate-spin" /> : <MailCheck size={18} />}
                                    {codeSentTo ? 'Type the code sent to your email' : 'Confirm email address'}
                                </button>
                            ) : (
                                <button key="submit" type="submit" disabled={loading} className="bg-ustp-blue text-white w-full py-3 sm:py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-800 active:scale-[0.99] transition-transform disabled:opacity-60">
                                    {loading && <Loader2 size={18} className="animate-spin" />}
                                    {loading ? 'Sending…' : 'Submit report'}
                                </button>
                            )}
                        </form>
                        </>
                    ) : (
                        // Sent: the same slip, marked sent, so the guard can see exactly what went to OSA
                        <div className="card-premium mx-auto w-full max-w-md p-5 sm:p-7">
                            <div className="text-center">
                                <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <CheckCircle2 className="text-white" size={30} />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{violationLabels.length > 1 ? `${violationLabels.length} reports sent` : 'Report sent'}</h2>
                                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">OSA will review {violationLabels.length > 1 ? 'them' : 'it'}. The student gets an email.</p>
                            </div>

                            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 text-left">
                                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 px-4 py-3">
                                    <div className="w-10 h-10 shrink-0 rounded-full bg-blue-100 text-ustp-blue dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center text-sm font-bold">{initials}</div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{studentName || '—'}</p>
                                        <p className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">{form.student_id}</p>
                                    </div>
                                    <span className="ml-auto shrink-0 rounded-full bg-amber-100 dark:bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">For review</span>
                                </div>
                                <ul className="border-t border-dashed border-slate-200 dark:border-slate-700 px-4 py-3 space-y-1.5">
                                    {violationLabels.map((v) => (
                                        <li key={v} className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-300">
                                            {v}
                                        </li>
                                    ))}
                                </ul>
                                <p className="border-t border-dashed border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    {incidentWhen} · by {reporterName}
                                </p>
                            </div>

                            <div className="mt-5 grid grid-cols-1 gap-3">
                                <button onClick={resetForm} className="py-3 rounded-xl bg-ustp-blue text-white font-bold text-sm hover:bg-blue-800">Report another</button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
};

export default ReportViolation;
