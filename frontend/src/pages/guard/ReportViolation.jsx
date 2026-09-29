import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Scan, Send, CheckCircle2, Clock, X, LogOut, BarChart3, User, AlertTriangle, Loader2 } from 'lucide-react';
import QrScannerModal from '../../components/QrScannerModal';
import { parseStudentQr, NOT_A_STUDENT_QR } from '../../components/studentQr';
import { DEPARTMENTS, GENDERS, departmentForCourse, courseOptionsFor } from '../../lib/academics';
import { GUARD_STAFF_LOGIN } from '../../lib/portals';

const inputClass = "w-full min-w-0 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-3 py-2.5 font-semibold text-sm text-slate-800 dark:text-slate-200 focus:border-ustp-blue outline-none transition-colors placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60";
const labelClass = "mb-1 ml-1 block text-xs font-bold text-slate-500 dark:text-slate-400";
const headerLink = "flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-full text-slate-600 dark:text-slate-300 hover:text-ustp-blue font-bold text-xs";

// Violation types a guard or faculty & staff can report: [value, label]. The value must match OSA's
// penalty table (PUNISHMENT_SYSTEM in backend/core/views.py). Same list as the app.
const VIOLATIONS = [
    ['Curfew Violation', 'Curfew Violation'],
    ['No ID / Improper ID Sling', 'No ID / Improper ID Sling'],
    ['No School Uniform', 'No School Uniform'],
    ['Dress Code Violation', 'Dress Code Violation'],
];

const emptyForm = () => ({
    student_id: '', name: '', gender: '', course: '', department: '', contact: '',
    email: '', violation: '',
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

    const handleIdChange = (e) => {
        const id = e.target.value;
        setForm(prev => ({ ...prev, student_id: id }));
        if (id.length >= 8) fetchStudentData(id);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setShowConfirmModal(true);
    };

    const confirmSubmission = async () => {
        setShowConfirmModal(false);
        setLoading(true);
        try {
            const response = await fetch('/api/violations/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, reporting_guard: userName }),
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

    const violationLabel = VIOLATIONS.find(([value]) => value === form.violation)?.[1] || form.violation;
    const confirmRows = [
        ['Student', `${form.name || '—'}`],
        ['Student ID', form.student_id],
        ['Gender', form.gender || '—'],
        ['Course', [form.course, form.department && (form.department.match(/\(([^)]+)\)\s*$/) || [])[1]].filter(Boolean).join(' · ') || '—'],
        ['Violation', violationLabel],
        ['Date & time', `${form.incident_date} · ${form.incident_time}`],
    ];

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
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">Check the report</h2>
                            <button onClick={() => setShowConfirmModal(false)} aria-label="Close" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X size={22} />
                            </button>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700 rounded-2xl border border-slate-100 dark:border-slate-700 px-4">
                            {confirmRows.map(([label, value]) => (
                                <div key={label} className="flex items-baseline justify-between gap-4 py-2.5">
                                    <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
                                    <span className={`min-w-0 text-right text-sm font-bold ${label === 'Violation' ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>{value}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <button onClick={() => setShowConfirmModal(false)} className="py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold text-sm hover:bg-slate-200">Edit</button>
                            <button onClick={confirmSubmission} disabled={loading} className="py-3 rounded-xl bg-ustp-blue text-white font-bold text-sm hover:bg-blue-800 disabled:opacity-60">Send report</button>
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
                                <Clock size={14} /> <span className="hidden sm:inline">History</span>
                            </Link>
                        )}
                        {userRole === 'guard' && (
                            <Link to="/guard/analytics" className={headerLink}>
                                <BarChart3 size={14} /> <span className="hidden sm:inline">Analytics</span>
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
                        <form onSubmit={handleSubmit} className="card-premium p-4 sm:p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Student */}
                                <section className="space-y-3 min-w-0">
                                    <h2 className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
                                        <User size={16} className="text-ustp-blue" /> Student
                                    </h2>
                                    <div>
                                        <label className={labelClass} htmlFor="rv-id">Student ID (type it or scan their QR)</label>
                                        <div className="relative">
                                            <input id="rv-id" required value={form.student_id} onChange={handleIdChange} placeholder="Student ID" inputMode="numeric" className={`${inputClass} pr-12`} />
                                            <button type="button" onClick={() => setIsScanning(true)} aria-label="Scan student QR" className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square bg-ustp-blue text-white rounded-lg flex items-center justify-center active:scale-95 transition-transform">
                                                <Scan size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="rv-name">Full name</label>
                                        <input id="rv-name" required placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="rv-gender">Gender</label>
                                        <select id="rv-gender" required value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className={inputClass}>
                                            <option value="">Choose gender</option>
                                            {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                    {/* Department first, then only its courses (same as registration) */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="min-w-0">
                                            <label className={labelClass} htmlFor="rv-dept">Department</label>
                                            <select id="rv-dept" required value={form.department} onChange={e => {
                                                const department = e.target.value;
                                                setForm({ ...form, department, course: courseOptionsFor(department).includes(form.course) ? form.course : '' });
                                            }} className={`${inputClass} truncate`}>
                                                <option value="">Choose</option>
                                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                        <div className="min-w-0">
                                            <label className={labelClass} htmlFor="rv-course">Course</label>
                                            <select id="rv-course" required disabled={!form.department} value={form.course} onChange={e => setForm({ ...form, course: e.target.value })} className={`${inputClass} truncate`}>
                                                <option value="">{form.department ? 'Choose' : 'Department first'}</option>
                                                {courseOptionsFor(form.department, form.course).map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="min-w-0">
                                            <label className={labelClass} htmlFor="rv-email">Email</label>
                                            <input id="rv-email" required type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} />
                                        </div>
                                        <div className="min-w-0">
                                            <label className={labelClass} htmlFor="rv-contact">Contact number</label>
                                            <input id="rv-contact" required type="tel" placeholder="Contact number" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} className={inputClass} />
                                        </div>
                                    </div>
                                </section>

                                {/* Violation */}
                                <section className="space-y-3 min-w-0">
                                    <h2 className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
                                        <AlertTriangle size={16} className="text-red-500" /> Violation
                                    </h2>
                                    <div>
                                        <label className={labelClass} htmlFor="rv-violation">What happened</label>
                                        <select id="rv-violation" required value={form.violation} onChange={e => setForm({ ...form, violation: e.target.value })} className={`${inputClass} ${form.violation ? 'text-red-700 dark:text-red-400' : ''}`}>
                                            <option value="">Choose the violation</option>
                                            {VIOLATIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                        </select>
                                    </div>
                                    {/* min-w-0 + appearance-none stop iPhone Safari's date/time boxes from spilling past the card */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="min-w-0">
                                            <label className={labelClass} htmlFor="rv-date">Date</label>
                                            <input id="rv-date" type="date" required value={form.incident_date} onChange={e => setForm({ ...form, incident_date: e.target.value })} className={`${inputClass} appearance-none`} />
                                        </div>
                                        <div className="min-w-0">
                                            <label className={labelClass} htmlFor="rv-time">Time</label>
                                            <input id="rv-time" type="time" required value={form.incident_time} onChange={e => setForm({ ...form, incident_time: e.target.value })} className={`${inputClass} appearance-none`} />
                                        </div>
                                    </div>
                                    <p className="rounded-xl bg-slate-50 dark:bg-slate-900 px-3 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                                        OSA reviews every report before any penalty is given. The student gets an email about it.
                                    </p>
                                </section>
                            </div>

                            <button type="submit" disabled={loading} className="bg-ustp-blue text-white w-full py-3.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 hover:bg-blue-800 active:scale-[0.99] transition-transform disabled:opacity-60">
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                {loading ? 'Sending…' : 'Submit report'}
                            </button>
                        </form>
                    ) : (
                        <div className="card-premium p-8 md:p-14 text-center">
                            <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5">
                                <CheckCircle2 className="text-white" size={30} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Report sent</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium text-sm">OSA will review it. You can see it in your history.</p>
                            <button onClick={resetForm} className="mt-7 bg-ustp-blue text-white w-full max-w-[240px] py-3.5 rounded-xl font-bold text-sm hover:bg-blue-800">Report another</button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ReportViolation;
