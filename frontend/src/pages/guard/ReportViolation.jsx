import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { Shield, Scan, Send, AlertCircle, CheckCircle2, User, UserPlus, ClipboardList, Clock, X, QrCode } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

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

const ReportViolation = () => {
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

    // Scanner Effect
    useEffect(() => {
        if (!isScanning) return;
        const scanner = new Html5QrcodeScanner("report-qr-reader", {
            fps: 10, qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0, rememberLastUsedCamera: true
        });
        scanner.render((decodedText) => {
            scanner.clear();
            setIsScanning(false);

            // New Format: NAME, ID, COURSE
            // Example: VINCENT M. DAGARAGA, 2023303188, BSIT
            const parts = decodedText.split(',').map(p => p.trim());

            if (parts.length >= 2) {
                const name = parts[0];
                const studentId = parts[1];
                const course = parts[2] || '';

                setForm(prev => ({
                    ...prev,
                    name: name,
                    student_id: studentId,
                    course: course
                }));
            } else {
                // Fallback for standard ID-only codes
                const idMatch = decodedText.match(/\b(20\d{7,})\b/);
                const studentId = idMatch ? idMatch[1] : decodedText;
                setForm(prev => ({ ...prev, student_id: studentId }));
                if (studentId.length >= 8) fetchStudentData(studentId);
            }
        });
        return () => { scanner.clear().catch(e => { }); };
    }, [isScanning]);

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
                body: JSON.stringify({ ...form, reporting_guard: 'Gate Security' }),
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
        <div className="flex bg-slate-50 min-h-screen relative">
            {/* Modal Scanner */}
            {isScanning && (
                <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
                        <button onClick={() => setIsScanning(false)} className="absolute top-6 right-6 w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all">
                            <X size={24} />
                        </button>
                        <div className="text-center mb-10">
                            <h3 className="font-black text-2xl text-slate-800 tracking-tight">Scanner Hub</h3>
                            <p className="text-sm font-medium text-slate-400 mt-2">Scan Physical ID / QR Code</p>
                        </div>
                        <div id="report-qr-reader" className="w-full rounded-2xl overflow-hidden border-4 border-slate-50 shadow-inner"></div>
                    </div>
                </div>
            )}

            {/* Confirm Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-white rounded-[40px] p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-50">
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Confirm Incident</h2>
                            <button onClick={() => setShowConfirmModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={28} />
                            </button>
                        </div>
                        <div className="space-y-4 mb-10">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-5 rounded-3xl">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Student ID</p>
                                    <p className="font-black text-slate-800 text-lg uppercase">{form.student_id}</p>
                                </div>
                                <div className="bg-red-50 p-5 rounded-3xl">
                                    <p className="text-[10px] uppercase font-black text-red-400 tracking-widest mb-1">Violation</p>
                                    <p className="font-black text-red-900 uppercase leading-tight">{form.violation}</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-3xl">
                                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Student Full Name</p>
                                <p className="font-bold text-slate-800 text-lg">{form.name || '—'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-5 rounded-3xl">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Email</p>
                                    <p className="font-bold text-slate-700 text-sm">{form.email || '—'}</p>
                                </div>
                                <div className="bg-slate-50 p-5 rounded-3xl">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Contact</p>
                                    <p className="font-bold text-slate-700 text-sm">{form.contact || '—'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="bg-slate-50 p-5 rounded-3xl">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Date</p>
                                    <p className="font-bold text-slate-700">{form.incident_date}</p>
                                </div>
                                <div className="bg-slate-50 p-5 rounded-3xl">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Time</p>
                                    <p className="font-bold text-slate-700">{form.incident_time}</p>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setShowConfirmModal(false)} className="bg-slate-100 text-slate-600 font-black py-5 rounded-[24px] uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                            <button onClick={confirmSubmission} disabled={loading} className="bg-ustp-blue text-white font-black py-5 rounded-[24px] uppercase text-xs tracking-widest hover:bg-slate-900 shadow-xl transition-all">Submit Now</button>
                        </div>
                    </div>
                </div>
            )}

            <Sidebar role="guard" />
            <main className="flex-1 p-4 md:p-10 pt-24 md:pt-10 max-w-7xl mx-auto overflow-y-auto">
                <header className="mb-10 text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tighter uppercase italic">Gate Security</h1>
                    <p className="text-slate-400 mt-1 font-medium italic text-sm md:text-base">Violation Reporting & Sync Center</p>
                </header>

                <div className="max-w-4xl mx-auto">
                    {step === 1 ? (
                        <div className="card-premium border-2 border-white shadow-2xl p-8 md:p-12 animate-in slide-in-from-bottom-5 duration-500">
                            <h3 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-4 mb-10 pb-6 border-b border-slate-50 uppercase tracking-tighter">
                                <ClipboardList className="text-ustp-blue" size={32} />
                                New Incident Report
                            </h3>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="relative group">
                                            <label className="text-[10px] uppercase font-black text-slate-300 tracking-[0.2em] ml-1 mb-2 block">Student ID / Scan QR</label>
                                            <div className="relative">
                                                <input required value={form.student_id} onChange={handleIdChange} placeholder="202X-XXXXXXX" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] p-5 pr-16 font-black focus:border-ustp-blue outline-none transition-all uppercase placeholder:text-slate-200" />
                                                <button type="button" onClick={() => setIsScanning(true)} className="absolute right-3 top-3 bottom-3 aspect-square bg-ustp-blue text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 hover:scale-105 active:scale-95 transition-all">
                                                    <Scan size={22} />
                                                </button>
                                            </div>
                                        </div>
                                        <input required placeholder="Student Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] p-5 font-bold focus:border-ustp-blue outline-none transition-all" />
                                        <div className="grid grid-cols-2 gap-4">
                                            <select required value={form.course} onChange={e => setForm({ ...form, course: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] p-5 font-bold outline-none focus:border-ustp-blue text-xs appearance-none">
                                                <option value="">Course</option>
                                                {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <select required value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] p-5 font-bold outline-none focus:border-ustp-blue text-xs appearance-none">
                                                <option value="">Dept</option>
                                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                        <input required type="email" placeholder="Email Address" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] p-5 font-bold focus:border-ustp-blue outline-none transition-all" />
                                        <input required placeholder="Contact Number" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] p-5 font-bold focus:border-ustp-blue outline-none transition-all" />
                                    </div>
                                    <div className="space-y-6">
                                        <select required value={form.violation} onChange={e => setForm({ ...form, violation: e.target.value })} className="w-full bg-red-50 border-2 border-red-100 rounded-[24px] p-5 font-black text-red-900 focus:border-red-500 outline-none transition-all cursor-pointer">
                                            <option value="">SELECT VIOLATION</option>
                                            <option value="No ID">No ID</option>
                                            <option value="Improper wearing of ID">Improper Wearing of ID</option>
                                            <option value="Dress code violation">Dress Code</option>
                                            <option value="Littering">Littering</option>
                                            <option value="Smoking inside campus">Smoking</option>
                                            <option value="Serious misconduct">Serious Misconduct</option>
                                        </select>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] uppercase font-black text-slate-300 tracking-widest mb-1 ml-1 block">Incident Date</label>
                                                <input type="date" required value={form.incident_date} onChange={e => setForm({ ...form, incident_date: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] p-5 font-bold outline-none focus:border-ustp-blue" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase font-black text-slate-300 tracking-widest mb-1 ml-1 block">Incident Time</label>
                                                <input type="time" required value={form.incident_time} onChange={e => setForm({ ...form, incident_time: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] p-5 font-bold outline-none focus:border-ustp-blue" />
                                            </div>
                                        </div>

                                    </div>
                                </div>
                                <button type="submit" disabled={loading} className="group relative bg-ustp-blue text-white w-full py-6 rounded-[28px] text-xl font-black shadow-2xl shadow-blue-900/40 flex items-center justify-center gap-4 transition-all hover:bg-slate-900 active:scale-[0.98]">
                                    <Send size={24} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                                    {loading ? statusMsg : "SUBMIT INCIDENT"}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="card-premium border-2 border-green-200 bg-green-50/20 shadow-2xl p-12 md:p-20 text-center animate-in zoom-in duration-500">
                            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-10 shadow-xl shadow-green-200">
                                <CheckCircle2 className="text-white" size={48} />
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Report Stored!</h2>
                            <p className="text-slate-500 mt-6 max-w-sm mx-auto font-bold text-lg leading-relaxed">Violation for student <span className="text-ustp-blue underline decoration-4 underline-offset-8">{form.student_id}</span> has been synchronized with OSTP OSA servers.</p>
                            <button onClick={resetForm} className="mt-12 bg-slate-900 text-white w-full max-w-sm py-5 rounded-[24px] font-black uppercase text-sm tracking-widest shadow-xl hover:bg-slate-800 transition-all">New Entry</button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ReportViolation;
