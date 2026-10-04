import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Scan, Send, CheckCircle2, X, UserRound, UserCheck, Loader2, IdCard, Building2, GraduationCap, Users, Phone, Mail, CalendarDays, Clock } from 'lucide-react';

// The guard-on-duty name typed on this device, filled in again for the next report
const ON_DUTY_KEY = 'osa-guard-on-duty';
import QrScannerModal from '../../components/QrScannerModal';
import { parseStudentQr, NOT_A_STUDENT_QR } from '../../components/studentQr';
import { DEPARTMENTS, GENDERS, departmentForCourse, courseOptionsFor } from '../../lib/academics';
// Violation types a guard or faculty & staff can report (shared with the admin's Report Violation)
import { VIOLATIONS } from '../../lib/violationTypes';

// Phones get shorter boxes (py-2) so the whole form fits with less scrolling, like registration
const inputClass = "w-full min-w-0 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 font-semibold text-sm text-slate-800 dark:text-slate-200 focus:border-ustp-blue outline-none transition-colors placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60";
// Dropdowns: the browser's own look adds inner padding and bigger text, so they're drawn like the text
// boxes with a small chevron; `empty` makes "Choose" faint like a placeholder (same as StudentRegistration)
const selectClass = (empty) => `${inputClass} appearance-none truncate bg-[length:14px] bg-[right_0.6rem_center] bg-no-repeat pr-8 ${empty ? '!text-slate-400 !font-medium' : ''}`;
const selectArrow = { backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" };
const labelClass = "mb-1 ml-1 block text-xs font-bold text-slate-500 dark:text-slate-400";

// A field label with its icon
const Label = ({ htmlFor, icon: Icon, children }) => (
    <label htmlFor={htmlFor} className="mb-1 ml-1 flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
        <Icon size={13} className="shrink-0" aria-hidden="true" /> {children}
    </label>
);


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
    // Guards share accounts, so a guard account types the name of the guard on duty (kept on this device for
    // the next report). It's the "Reported by" OSA sees. Faculty & staff report as themselves.
    const isGuard = userRole === 'guard';
    const [onDutyName, setOnDutyName] = useState(() => {
        try { return localStorage.getItem(ON_DUTY_KEY) || ''; } catch { return ''; }
    });
    const reporterName = isGuard ? (onDutyName.trim() || '—') : userName;

    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
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
        if (isGuard) {
            if (!onDutyName.trim()) { alert('Type the name of the guard on duty.'); return; }
            try { localStorage.setItem(ON_DUTY_KEY, onDutyName.trim()); } catch { /* private mode */ }
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
                body: JSON.stringify({ ...form, violation_types: form.violations, reporting_guard: userName, on_duty_name: isGuard ? onDutyName.trim() : undefined }),
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

    // Inside the guard / faculty & staff layout (components/ReporterShell.jsx): top bar, menu and Log out live there
    return (
        <>
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
                                    <p className="truncate text-base font-bold text-slate-900 dark:text-white">{form.name || '—'}</p>
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
            <main className="w-full px-3 py-4 md:px-6 md:py-6">
                <div className="max-w-4xl mx-auto w-full pb-10">
                    {!sent ? (
                        <form onSubmit={handleSubmit} className="card-premium p-3.5 sm:p-6 space-y-4 sm:space-y-5">
                            {/* Guard accounts are shared: who is on duty (remembered on this device) */}
                            {isGuard && (
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 rounded-xl border-2 border-blue-100 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 px-3 py-2.5">
                                    <label htmlFor="rv-onduty" className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-ustp-blue dark:text-blue-300">
                                        <UserCheck size={15} /> Guard on duty
                                    </label>
                                    <input id="rv-onduty" required value={onDutyName} maxLength={100} autoComplete="name"
                                        onChange={(e) => setOnDutyName(e.target.value)}
                                        onBlur={() => { try { localStorage.setItem(ON_DUTY_KEY, onDutyName.trim()); } catch { /* private mode */ } }}
                                        placeholder="Your full name" className={`${inputClass} !bg-white dark:!bg-slate-900`} />
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                                {/* Student */}
                                <section className="space-y-2.5 sm:space-y-3 min-w-0">
                                    <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                                        <UserRound size={16} className="text-ustp-blue" /> Student
                                    </h2>
                                    <div>
                                        <Label htmlFor="rv-id" icon={IdCard}>Student ID (type it or scan their QR)</Label>
                                        <div className="relative">
                                            <input id="rv-id" required value={form.student_id} onChange={handleIdChange} placeholder="Student ID" inputMode="numeric" maxLength={10} minLength={10} title="10 numbers, like 2023303188" className={`${inputClass} pr-12`} />
                                            <button type="button" onClick={() => setIsScanning(true)} aria-label="Scan student QR" className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square bg-ustp-blue text-white rounded-lg flex items-center justify-center active:scale-95 transition-transform">
                                                <Scan size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="rv-name" icon={UserRound}>Full name</Label>
                                        <input id="rv-name" required placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} />
                                    </div>
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
                                            <Label htmlFor="rv-contact" icon={Phone}>Contact number</Label>
                                            <input id="rv-contact" required type="tel" placeholder="Contact number" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} className={inputClass} />
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="rv-email" icon={Mail}>Email</Label>
                                        <input id="rv-email" required type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} />
                                    </div>
                                </section>

                                {/* Violation */}
                                <section className="space-y-2.5 sm:space-y-3 min-w-0">
                                    <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                                        Violation
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
                                            <Label htmlFor="rv-date" icon={CalendarDays}>Date</Label>
                                            <input id="rv-date" type="date" required value={form.incident_date} onChange={e => setForm({ ...form, incident_date: e.target.value })} className={`${inputClass} appearance-none`} />
                                        </div>
                                        <div className="min-w-0">
                                            <Label htmlFor="rv-time" icon={Clock}>Time</Label>
                                            <input id="rv-time" type="time" required value={form.incident_time} onChange={e => setForm({ ...form, incident_time: e.target.value })} className={`${inputClass} appearance-none`} />
                                        </div>
                                    </div>
                                    <p className="rounded-xl bg-slate-50 dark:bg-slate-900 px-3 py-2 sm:py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                                        OSA reviews every report before any penalty is given. The student gets an email about it.
                                    </p>
                                </section>
                            </div>

                            <button type="submit" disabled={loading} className="bg-ustp-blue text-white w-full py-3 sm:py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-800 active:scale-[0.99] transition-transform disabled:opacity-60">
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
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{violationLabels.length > 1 ? `${violationLabels.length} reports sent` : 'Report sent'}</h2>
                                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">OSA will review {violationLabels.length > 1 ? 'them' : 'it'}. The student gets an email.</p>
                            </div>

                            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 text-left">
                                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 px-4 py-3">
                                    <div className="w-10 h-10 shrink-0 rounded-full bg-blue-100 text-ustp-blue dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center text-sm font-bold">{initials}</div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{form.name || '—'}</p>
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
        </>
    );
};

export default ReportViolation;
