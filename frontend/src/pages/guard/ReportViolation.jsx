import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Scan, Send, CheckCircle2, ClipboardList, Clock, X, LogOut, HelpCircle } from 'lucide-react';
import QrScannerModal from '../../components/QrScannerModal';
import { parseStudentQr, NOT_A_STUDENT_QR } from '../../components/studentQr';

const COURSES = [
    "BS Civil Engineering", "BS Electronics Engineering", "BS Electrical Engineering", "BS Mechanical Engineering",
    "BS Computer Engineering", "BS Geodetic Engineering", "BS Food Technology", "BS Information Technology",
    "BS Computer Science", "BS Data Science", "BS Technology Communication Management", "BS Applied Physics",
    "BS Applied Mathematics", "BS Chemistry", "BS Environmental Science", "BS Secondary Education Major in Science",
    "Major in Mathematics", "B. Tech & Livelihood Education (Home Economics)", "B. Tech & Livelihood Education (Industrial Arts)",
    "Bachelor in Technical-Vocational Teacher Education Major in Computer System Servicing", "Major in Fashion and Garments",
    "Major in Food Service Management", "BS AutoTronics", "BS Electro-Mechanical Technology", "BS Electronics Technology",
    "BS Energy Systems and Management", "BS Manufacturing Engineering Technology", "College of Medicine", "Senior High School"
];

const DEPARTMENTS = [
    "College of Engineering and Architecture (CEA)", "College of Information Technology and Computing (CITC)",
    "College of Science and Mathematics (CSM)", "College of Science and Technology Education (CSTE)",
    "College of Technology (CT)", "College of Medicine (COM)", "Senior High School (SHS)"
];

const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-3 py-2.5 md:p-3.5 font-bold focus:border-ustp-blue outline-none transition-all text-sm";
const labelClass = "text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-[0.2em] ml-1 mb-1 block";

const ReportViolation = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = user.role || 'guard';
    const userName = user.full_name || 'Personnel';

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [form, setForm] = useState({
        student_id: '', name: '', course: '', department: '', contact: '',
        email: '', violation: '',
        incident_date: new Date().toISOString().split('T')[0],
        incident_time: new Date().toTimeString().slice(0, 5)
    });

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
        }));
        fetchStudentData(student.studentId);
    };

    const fetchStudentData = async (id) => {
        try {
            const response = await fetch(`/api/students/${id}/`);
            if (response.ok) {
                const data = await response.json();
                setForm(prev => ({
                    ...prev, student_id: id, name: data.name, course: data.course,
                    department: data.department, contact: data.contact_number, email: data.email
                }));
            }
        } catch (error) { }
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
        setStatusMsg('Syncing with Cloud Database...');
        try {
            const response = await fetch('/api/violations/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, reporting_guard: userName }),
            });
            if (response.ok) setStep(2);
            else {
                const err = await response.json();
                alert(`Error: ${err.error || 'Check fields'}`);
            }
        } catch (error) {
            alert('CRITICAL: Server Unreachable.');
        } finally {
            setLoading(false);
            setStatusMsg('');
        }
    };

    const resetForm = () => {
        setStep(1);
        setForm({
            student_id: '', name: '', course: '', department: '', contact: '',
            email: '', violation: '',
            incident_date: new Date().toISOString().split('T')[0],
            incident_time: new Date().toTimeString().slice(0, 5)
        });
    };

    return (
        <div className="flex bg-slate-50 dark:bg-slate-900 min-h-screen relative">
            {/* Modal Scanner */}
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

            {/* Confirm Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-50">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Confirm Incident</h2>
                            <button onClick={() => setShowConfirmModal(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 transition-colors">
                                <X size={28} />
                            </button>
                        </div>
                        <div className="space-y-4 mb-10">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl">
                                    <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mb-1">Student ID</p>
                                    <p className="font-black text-slate-800 dark:text-slate-200 text-lg uppercase">{form.student_id}</p>
                                </div>
                                <div className="bg-red-50 p-5 rounded-3xl">
                                    <p className="text-[10px] uppercase font-black text-red-400 tracking-widest mb-1">Violation</p>
                                    <p className="font-black text-red-900 uppercase leading-tight">{form.violation}</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl">
                                <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mb-1">Student Full Name</p>
                                <p className="font-bold text-slate-800 dark:text-slate-200 text-lg">{form.name || '—'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl">
                                    <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mb-1">Email</p>
                                    <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">{form.email || '—'}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl">
                                    <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mb-1">Contact</p>
                                    <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">{form.contact || '—'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl">
                                    <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mb-1">Date</p>
                                    <p className="font-bold text-slate-700 dark:text-slate-300">{form.incident_date}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl">
                                    <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mb-1">Time</p>
                                    <p className="font-bold text-slate-700 dark:text-slate-300">{form.incident_time}</p>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setShowConfirmModal(false)} className="bg-slate-100 text-slate-600 dark:text-slate-400 font-black py-5 rounded-[24px] uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                            <button onClick={confirmSubmission} disabled={loading} className="bg-ustp-blue text-white font-black py-5 rounded-[24px] uppercase text-xs tracking-widest hover:bg-slate-900 shadow-xl transition-all">Submit Now</button>
                        </div>
                    </div>
                </div>
            )}
 
            <main className="flex-1 p-3 md:p-10 w-full max-w-full h-screen overflow-y-auto custom-scrollbar">
                {/* Help + Log Out sit in the header so they scroll away with the page */}
                <header className="max-w-4xl mx-auto w-full mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tighter uppercase italic">
                            {userRole === 'guard' ? 'Guard Report' : 'Staff Report'}
                        </h1>
                        <p className="text-slate-400 dark:text-slate-500 font-medium italic text-[11px] md:text-sm">
                            Academic Integrity & Safety Reporting
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {userRole === 'guard' && (
                            <Link to="/guard/history" className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-600 rounded-full text-slate-600 dark:text-slate-300 hover:text-ustp-blue font-bold text-xs">
                                <Clock size={14} /> History
                            </Link>
                        )}
                        <Link to="/help" aria-label="Help" className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-600 rounded-full text-slate-600 dark:text-slate-300 hover:text-ustp-blue font-bold text-xs">
                            <HelpCircle size={14} /> <span className="hidden sm:inline">Help</span>
                        </Link>
                        <button
                            onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
                            aria-label="Log Out"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-600 rounded-full text-red-500 hover:bg-red-50 font-bold text-xs"
                        >
                            <LogOut size={14} /> <span className="hidden sm:inline">Log Out</span>
                        </button>
                    </div>
                </header>

                <div className="max-w-4xl mx-auto w-full pb-10">
                    {step === 1 ? (
                        <div className="card-premium border-2 border-white shadow-2xl p-4 sm:p-6 md:p-8 animate-in slide-in-from-bottom-5 duration-500">
                            <h3 className="text-base md:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 mb-3 pb-3 border-b border-slate-50 uppercase tracking-tighter">
                                <ClipboardList className="text-ustp-blue" size={20} />
                                New Incident Report
                            </h3>

                            <form onSubmit={handleSubmit} className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2.5">
                                    <div className="space-y-2.5 min-w-0">
                                        <div>
                                            <label className={labelClass}>Student ID / Scan QR</label>
                                            <div className="relative">
                                                <input required value={form.student_id} onChange={handleIdChange} placeholder="202X-XXXXXXX" className={`${inputClass} pr-12 font-black uppercase placeholder:text-slate-300`} />
                                                <button type="button" onClick={() => setIsScanning(true)} className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square bg-ustp-blue text-white rounded-lg flex items-center justify-center shadow-md shadow-blue-200 active:scale-95 transition-all">
                                                    <Scan size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <input required placeholder="Student Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} />
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <select required value={form.course} onChange={e => setForm({ ...form, course: e.target.value })} className={`${inputClass} appearance-none truncate`}>
                                                <option value="">Course</option>
                                                {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <select required value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className={`${inputClass} appearance-none truncate`}>
                                                <option value="">Dept</option>
                                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                        <input required type="email" placeholder="Email Address" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} />
                                        <input required type="tel" placeholder="Contact Number" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} className={inputClass} />
                                    </div>
                                    <div className="space-y-2.5 min-w-0">
                                        <select required value={form.violation} onChange={e => setForm({ ...form, violation: e.target.value })} className="w-full bg-red-50 border-2 border-red-100 rounded-xl px-3 py-2.5 md:p-3.5 font-black text-red-900 focus:border-red-500 outline-none transition-all cursor-pointer text-sm appearance-none truncate">
                                            <option value="">SELECT VIOLATION</option>
                                            <option value="No ID">No ID</option>
                                            <option value="Improper wearing of ID">Improper Wearing of ID</option>
                                            <option value="Dress code violation">Dress Code</option>
                                            <option value="Littering">Littering</option>
                                            <option value="Smoking inside campus">Smoking</option>
                                            <option value="Serious misconduct">Serious Misconduct</option>
                                        </select>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            {/* min-w-0 + appearance-none stop iPhone Safari's date/time boxes from spilling past the card */}
                                            <div className="min-w-0">
                                                <label className={labelClass}>Date</label>
                                                <input type="date" required value={form.incident_date} onChange={e => setForm({ ...form, incident_date: e.target.value })} className={`${inputClass} min-w-0 appearance-none text-xs`} />
                                            </div>
                                            <div className="min-w-0">
                                                <label className={labelClass}>Time</label>
                                                <input type="time" required value={form.incident_time} onChange={e => setForm({ ...form, incident_time: e.target.value })} className={`${inputClass} min-w-0 appearance-none text-xs`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button type="submit" disabled={loading} className="group relative bg-ustp-blue text-white w-full py-3.5 rounded-xl text-base font-black shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 transition-all hover:bg-slate-900 active:scale-[0.98]">
                                    <Send size={20} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                                    {loading ? "Syncing..." : "SUBMIT REPORT"}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="card-premium border-2 border-green-200 bg-green-50/20 shadow-2xl p-8 md:p-20 text-center animate-in zoom-in duration-500">
                            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
                                <CheckCircle2 className="text-white" size={32} />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Report Stored!</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-4 max-w-xs mx-auto font-bold text-base leading-relaxed">Violation synchronized with cloud database.</p>
                            <button onClick={resetForm} className="mt-8 bg-slate-900 text-white w-full max-w-[240px] py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-slate-800 transition-all">New Entry</button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ReportViolation;
