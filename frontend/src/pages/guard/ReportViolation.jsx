import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Scan, Send, CheckCircle2, ClipboardList, X, LogOut, ChartColumnBig, User, AlertTriangle, Loader2 } from 'lucide-react';
import QrScannerModal from '../../components/QrScannerModal';
import { parseStudentQr, NOT_A_STUDENT_QR } from '../../components/studentQr';
import { DEPARTMENTS, GENDERS, departmentForCourse, courseOptionsFor } from '../../lib/academics';
import { GUARD_STAFF_LOGIN } from '../../lib/portals';
// Violation types a guard or faculty & staff can report (shared with the admin's Report Violation)
import { VIOLATIONS } from '../../lib/violationTypes';

// Phones get shorter boxes (py-2) so the whole form fits with less scrolling, like registration
const inputClass = "w-full min-w-0 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 font-semibold text-sm text-slate-800 dark:text-slate-200 focus:border-ustp-blue outline-none transition-colors placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60";
// Dropdowns: the browser's own look adds inner padding and bigger text, so they're drawn like the text
// boxes with a small chevron; `empty` makes "Choose" faint like a placeholder (same as StudentRegistration)
const selectClass = (empty) => `${inputClass} appearance-none truncate bg-[length:14px] bg-[right_0.6rem_center] bg-no-repeat pr-8 ${empty ? '!text-slate-400 !font-medium' : ''}`;
const selectArrow = { backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" };
const labelClass = "mb-1 ml-1 block text-xs font-bold text-slate-500 dark:text-slate-400";
const headerLink = "flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-full text-slate-600 dark:text-slate-300 hover:text-ustp-blue font-bold text-xs";


const emptyForm = () => ({
    student_id: '', name: '', gender: '', course: '', department: '', contact: '',
    email: '', violations: [], // one or more; each becomes its own report
    incident_date: new Date().toISOString().split('T')[0],
    incident_time: new Date().toTimeString().slice(0, 5),
});

// Guards and faculty & staff report a violation: find the student (scan their QR or type the ID), pick
// the violation, check, send. OSA reviews it on the admin side.
const ReportViolation = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = user.role || 'guard';
    const userName = user.full_name || 'Personnel';

    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [form, setForm] = useState(emptyForm);

    // The scanner only hands over codes that parseStudentQr accepts (see validate below)
    const handleScanResult = (decodedText) => {
        setIsScanning(false);
        const student = parseStudentQr(decodedText);
        if (!student) return;
        setForm(prev => ({
            ...prev,
            student_id: student.studentId,
            name: student.name || prev.name,
            course: student.course || prev.course,
            // The QR only carries the course; its department follows from it
            department: departmentForCourse(student.course) || prev.department,
        }));
        fetchStudentData(student.studentId);
    };

    // A registered student's details fill in the form
    const fetchStudentData = async (id) => {
        try {
            const response = await fetch(`/api/students/${id}/`);
            if (response.ok) {
                const data = await response.json();
                setForm(prev => ({
                    ...prev, student_id: id, name: data.name, course: data.course,
                    department: data.department, contact: data.contact_number, email: data.email,
                    gender: data.gender || prev.gender
                }));
            }
        } catch { /* not registered yet: typed in by hand */ }
    };

    // Student IDs are 10 numbers: only digits, and the student is looked up once all 10 are typed
    const handleIdChange = (e) => {
        const id = e.target.value.replace(/\D/g, '').slice(0, 10);
        setForm(prev => ({ ...prev, student_id: id }));
        if (id.length === 10) fetchStudentData(id);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.violations.length) {
            alert('Choose at least one violation.');
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
            const response = await fetch('/api/violations/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, violation_types: form.violations, reporting_guard: userName }),
            });
            if (response.ok) setSent(true);
            else {
                const err = await response.json().catch(() => ({}));
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
    };

    const violationLabels = form.violations.map((v) => VIOLATIONS.find(([value]) => value === v)?.[1] || v);
    // For the receipt: "CITC", initials, and "Wed, Sep 30, 2026 · 8:46 PM"
    const deptShort = (form.department.match(/\(([^)]+)\)\s*$/) || [])[1] || form.department;
    const initials = form.name.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
    const incidentWhen = (() => {
        const d = new Date(`${form.incident_date}T${form.incident_time || '00:00'}`);
        if (Number.isNaN(d.getTime())) return `${form.incident_date} · ${form.incident_time}`;
        return `${d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · ${d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}`;
    })();

    return (
        <div className="flex bg-slate-50 dark:bg-slate-900 min-h-screen relative">
            {isScanning && (
                <QrScannerModal
                    title="Scan Student QR"
                    subtitle="Scan the student's ID or OSAConnect QR code"
                    allowUpload
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
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Violation report</p>
                                <h2 id="confirm-title" className="text-lg font-black text-slate-900 dark:text-white leading-tight">Check before sending</h2>
                            </div>
                            <button onClick={() => setShowConfirmModal(false)} aria-label="Close" className="w-9 h-9 shrink-0 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 flex items-center justify-center">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mx-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                            {/* Student */}
                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 px-4 py-3.5">
                                <div className="w-11 h-11 shrink-0 rounded-full bg-blue-100 text-ustp-blue dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center text-sm font-black">{initials}</div>
                                <div className="min-w-0">
                                    <p className="truncate text-base font-black text-slate-900 dark:text-white">{form.name || '—'}</p>
                                    <p className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">{form.student_id}</p>
                                    <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                                        {[form.course, deptShort, form.gender].filter(Boolean).join(' · ')}
                                    </p>
                                </div>
                            </div>

                            {/* Violations */}
                            <div className="border-t border-dashed border-slate-200 dark:border-slate-700 px-4 py-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{violationLabels.length > 1 ? 'Violations' : 'Violation'}</p>
                                    {violationLabels.length > 1 && (
                                        <span className="rounded-full bg-red-100 dark:bg-red-500/15 px-2 py-0.5 text-[10px] font-black text-red-700 dark:text-red-300">{violationLabels.length} reports</span>
                                    )}
                                </div>
                                <ul className="space-y-1.5">
                                    {violationLabels.map((v) => (
                                        <li key={v} className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm font-bold text-red-700 dark:text-red-300">
                                            <AlertTriangle size={14} className="shrink-0" /> {v}
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
                                    <dd className="min-w-0 truncate text-right font-bold text-slate-800 dark:text-slate-200">{userName}</dd>
                                </div>
                            </dl>
                        </div>

                        <p className="mx-5 mt-3 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                            OSA reviews {violationLabels.length > 1 ? 'each report' : 'the report'} before any penalty is given. The student gets an email about it.
                        </p>

                        <div className="grid grid-cols-2 gap-3 p-5">
                            <button onClick={() => setShowConfirmModal(false)} className="py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700">Edit</button>
                            <button onClick={confirmSubmission} disabled={loading} className="py-3 rounded-xl bg-ustp-blue text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-800 disabled:opacity-60">
                                <Send size={16} /> {violationLabels.length > 1 ? `Send ${violationLabels.length} reports` : 'Send report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation modal before logging out */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-150 border border-slate-100 dark:border-slate-700">
                        <div className="w-12 h-12 bg-red-50 dark:bg-red-950/50 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <LogOut size={22} />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white text-center">Log out?</h3>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center mt-1 mb-6">
                            Are you sure you want to log out of your account?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { localStorage.clear(); window.location.href = GUARD_STAFF_LOGIN; }}
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors shadow-md shadow-red-200 dark:shadow-none"
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 p-3 md:p-10 w-full max-w-full h-screen overflow-y-auto custom-scrollbar">
                <header className="max-w-4xl mx-auto w-full mb-2.5 flex items-center justify-between gap-4 px-4 sm:px-6">
                    <div className="min-w-0">
                        <h1 className="text-xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Report a violation</h1>
                        <p className="mt-1 text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                            <span>Signed in as</span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-ustp-blue border border-blue-200/60 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60 shadow-xs">
                                {userName}
                            </span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {['guard', 'staff'].includes(userRole) && (
                            <Link to={`/${userRole}/history`} className={headerLink}>
                                <ClipboardList size={14} /> <span className="hidden sm:inline">History</span>
                            </Link>
                        )}
                        {userRole === 'guard' && (
                            <Link to="/guard/analytics" className={headerLink}>
                                <ChartColumnBig size={14} /> <span className="hidden sm:inline">Analytics</span>
                            </Link>
                        )}
                        <button
                            onClick={() => setShowLogoutConfirm(true)}
                            aria-label="Log out"
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 hover:bg-red-100 dark:hover:bg-red-900/60 shadow-sm rounded-full font-bold text-xs transition-colors"
                        >
                            <LogOut size={14} className="shrink-0 text-red-500 dark:text-red-400" />
                            <span>Log out</span>
                        </button>
                    </div>
                </header>

                <div className="max-w-4xl mx-auto w-full pb-10">
                    {!sent ? (
                        <form onSubmit={handleSubmit} className="card-premium p-3.5 sm:p-6 space-y-4 sm:space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                                {/* Student */}
                                <section className="space-y-2.5 sm:space-y-3 min-w-0">
                                    <h2 className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
                                        <User size={16} className="text-ustp-blue" /> Student
                                    </h2>
                                    <div>
                                        <label className={labelClass} htmlFor="rv-id">Student ID (type it or scan their QR)</label>
                                        <div className="relative">
                                            <input id="rv-id" required value={form.student_id} onChange={handleIdChange} placeholder="Student ID" inputMode="numeric" maxLength={10} minLength={10} title="10 numbers, like 2023303188" className={`${inputClass} pr-12`} />
                                            <button type="button" onClick={() => setIsScanning(true)} aria-label="Scan student QR" className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square bg-ustp-blue text-white rounded-lg flex items-center justify-center active:scale-95 transition-transform">
                                                <Scan size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="rv-name">Full name</label>
                                        <input id="rv-name" required placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} />
                                    </div>
                                    {/* Department first, then only its courses (same as registration) */}
                                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                                        <div className="min-w-0">
                                            <label className={labelClass} htmlFor="rv-dept">Department</label>
                                            <select id="rv-dept" required value={form.department} onChange={e => {
                                                const department = e.target.value;
                                                setForm({ ...form, department, course: courseOptionsFor(department).includes(form.course) ? form.course : '' });
                                            }} className={selectClass(!form.department)} style={selectArrow}>
                                                <option value="">Choose</option>
                                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                        <div className="min-w-0">
                                            <label className={labelClass} htmlFor="rv-course">Course</label>
                                            <select id="rv-course" required disabled={!form.department} value={form.course} onChange={e => setForm({ ...form, course: e.target.value })} className={selectClass(!form.course)} style={selectArrow}>
                                                <option value="">{form.department ? 'Choose' : 'Department first'}</option>
                                                {courseOptionsFor(form.department, form.course).map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    {/* Short fields side by side, also on phones */}
                                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                                        <div className="min-w-0">
                                            <label className={labelClass} htmlFor="rv-gender">Gender</label>
                                            <select id="rv-gender" required value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className={selectClass(!form.gender)} style={selectArrow}>
                                                <option value="">Choose</option>
                                                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                                            </select>
                                        </div>
                                        <div className="min-w-0">
                                            <label className={labelClass} htmlFor="rv-contact">Contact number</label>
                                            <input id="rv-contact" required type="tel" placeholder="Contact number" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} className={inputClass} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="rv-email">Email</label>
                                        <input id="rv-email" required type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} />
                                    </div>
                                </section>

                                {/* Violation */}
                                <section className="space-y-2.5 sm:space-y-3 min-w-0">
                                    <h2 className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
                                        <AlertTriangle size={16} className="text-red-500" /> Violation
                                    </h2>
                                    {/* Tick every violation the student committed; each becomes its own report */}
                                    <fieldset>
                                        <legend className={labelClass}>What happened (choose all that apply)</legend>
                                        {/* Two per row, also on phones */}
                                        <div className="grid grid-cols-2 gap-2">
                                            {VIOLATIONS.map(([value, label]) => {
                                                const checked = form.violations.includes(value);
                                                return (
                                                    <label key={value} className={`flex cursor-pointer items-center gap-2 sm:gap-2.5 rounded-lg sm:rounded-xl border-2 px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm leading-tight font-semibold transition-colors ${checked
                                                        ? 'border-red-400 bg-red-50 text-red-700 dark:border-red-500/60 dark:bg-red-500/10 dark:text-red-300'
                                                        : 'border-slate-100 bg-slate-50 text-slate-700 hover:border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>
                                                        <input type="checkbox" checked={checked} onChange={() => toggleViolation(value)} className="h-4 w-4 shrink-0 accent-red-600" />
                                                        {label}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        {form.violations.length > 1 && (
                                            <p className="mt-1.5 ml-1 text-xs font-semibold text-red-600 dark:text-red-400">{form.violations.length} violations: each is sent as its own report.</p>
                                        )}
                                    </fieldset>
                                    {/* min-w-0 + appearance-none stop iPhone Safari's date/time boxes from spilling past the card */}
                                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                                        <div className="min-w-0">
                                            <label className={labelClass} htmlFor="rv-date">Date</label>
                                            <input id="rv-date" type="date" required value={form.incident_date} onChange={e => setForm({ ...form, incident_date: e.target.value })} className={`${inputClass} appearance-none`} />
                                        </div>
                                        <div className="min-w-0">
                                            <label className={labelClass} htmlFor="rv-time">Time</label>
                                            <input id="rv-time" type="time" required value={form.incident_time} onChange={e => setForm({ ...form, incident_time: e.target.value })} className={`${inputClass} appearance-none`} />
                                        </div>
                                    </div>
                                    <p className="rounded-xl bg-slate-50 dark:bg-slate-900 px-3 py-2 sm:py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                                        OSA reviews every report before any penalty is given. The student gets an email about it.
                                    </p>
                                </section>
                            </div>

                            <button type="submit" disabled={loading} className="bg-ustp-blue text-white w-full py-3 sm:py-3.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 hover:bg-blue-800 active:scale-[0.99] transition-transform disabled:opacity-60">
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                {loading ? 'Sending…' : 'Submit report'}
                            </button>
                        </form>
                    ) : (
                        // Sent: the same slip, marked sent, so the guard can see exactly what went to OSA
                        <div className="card-premium mx-auto w-full max-w-md p-5 sm:p-7">
                            <div className="text-center">
                                <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <CheckCircle2 className="text-white" size={30} />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white">{violationLabels.length > 1 ? `${violationLabels.length} reports sent` : 'Report sent'}</h2>
                                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">OSA will review {violationLabels.length > 1 ? 'them' : 'it'}. The student gets an email.</p>
                            </div>

                            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 text-left">
                                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 px-4 py-3">
                                    <div className="w-10 h-10 shrink-0 rounded-full bg-blue-100 text-ustp-blue dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center text-sm font-black">{initials}</div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-black text-slate-900 dark:text-white">{form.name || '—'}</p>
                                        <p className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">{form.student_id}</p>
                                    </div>
                                    <span className="ml-auto shrink-0 rounded-full bg-amber-100 dark:bg-amber-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">For review</span>
                                </div>
                                <ul className="border-t border-dashed border-slate-200 dark:border-slate-700 px-4 py-3 space-y-1.5">
                                    {violationLabels.map((v) => (
                                        <li key={v} className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-300">
                                            <AlertTriangle size={14} className="shrink-0" /> {v}
                                        </li>
                                    ))}
                                </ul>
                                <p className="border-t border-dashed border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    {incidentWhen} · by {userName}
                                </p>
                            </div>

                            <div className={`mt-5 grid gap-3 ${['guard', 'staff'].includes(userRole) ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {['guard', 'staff'].includes(userRole) && (
                                    <Link to={`/${userRole}/history`} className="py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 text-center text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700">View history</Link>
                                )}
                                <button onClick={resetForm} className="py-3 rounded-xl bg-ustp-blue text-white font-bold text-sm hover:bg-blue-800">Report another</button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ReportViolation;
