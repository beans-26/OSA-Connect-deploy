import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { Shield, Scan, Send, AlertCircle, CheckCircle2, User, UserPlus, ClipboardList, Clock, X } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const COURSES = [
    "BS Civil Engineering",
    "BS Electronics Engineering",
    "BS Electrical Engineering",
    "BS Mechanical Engineering",
    "BS Computer Engineering",
    "BS Geodetic Engineering",
    "BS Food Technology",
    "BS Information Technology",
    "BS Computer Science",
    "BS Data Science",
    "BS Technology Communication Management",
    "BS Applied Physics",
    "BS Applied Mathematics",
    "BS Chemistry",
    "BS Environmental Science",
    "BS Secondary Education Major in Science",
    "Major in Mathematics",
    "B. Tech & Livelihood Education (Home Economics)",
    "B. Tech & Livelihood Education (Industrial Arts)",
    "Bachelor in Technical-Vocational Teacher Education Major in Computer System Servicing",
    "Major in Fashion and Garments",
    "Major in Food Service Management",
    "BS AutoTronics",
    "BS Electro-Mechanical Technology",
    "BS Electronics Technology",
    "BS Energy Systems and Management",
    "BS Manufacturing Engineering Technology",
    "College of Medicine",
    "Senior High School"
];

const DEPARTMENTS = [
    "College of Engineering and Architecture (CEA)",
    "College of Information Technology and Computing (CITC)",
    "College of Science and Mathematics (CSM)",
    "College of Science and Technology Education (CSTE)",
    "College of Technology (CT)",
    "College of Medicine (COM)",
    "Senior High School (SHS)"
];

const ReportViolation = () => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [recentReports, setRecentReports] = useState([]);
    const [statusMsg, setStatusMsg] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [form, setForm] = useState({
        student_id: '',
        name: '',
        course: '',
        department: '',
        contact: '',
        email: '',
        violation: '',
        description: '',
        incident_date: new Date().toISOString().split('T')[0],
        incident_time: new Date().toTimeString().slice(0, 5)
    });

    useEffect(() => {
        fetchRecentReports();
    }, []);

    const fetchRecentReports = async () => {
        try {
            const response = await fetch('/api/violations/');
            if (response.ok) {
                const data = await response.json();
                setRecentReports(data.reverse());
            }
        } catch (error) {
            console.error('History fetch failed:', error);
        }
    };

    useEffect(() => {
        if (!isScanning) return;

        const scanner = new Html5QrcodeScanner("qr-reader", {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true
        });

        scanner.render((decodedText) => {
            scanner.clear();
            setIsScanning(false);
            
            const studentIdMatch = decodedText.match(/\b(20\d{7,})\b/);
            const studentId = studentIdMatch ? studentIdMatch[1] : decodedText;
            
            setForm(prev => ({ ...prev, student_id: studentId }));
            if (studentId.length >= 8) fetchStudentData(studentId);
        }, (err) => {

        });

        return () => {
            scanner.clear().catch(e => console.error("Scanner cleared:", e));
        };
    }, [isScanning]);

    const fetchStudentData = async (id) => {
        try {
            const response = await fetch(`/api/students/${id}/`);
            if (response.ok) {
                const data = await response.json();
                setForm(prev => ({
                    ...prev,
                    student_id: id,
                    name: data.name || '',
                    course: data.course || '',
                    department: data.department || '',
                    contact: data.contact_number || '',
                    email: data.email || ''
                }));
            }
        } catch (error) {
            console.log("New student. Database match not found.");
        }
    };

    const handleScan = () => {
        setIsScanning(true);
    };

    const handleIdChange = async (e) => {
        const id = e.target.value;
        setForm(prev => ({ ...prev, student_id: id }));

        if (id.length >= 8) {
            fetchStudentData(id);
        } else {
            setForm(prev => ({
                ...prev,
                name: '',
                course: '',
                department: '',
                contact: '',
                email: ''
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setShowConfirmModal(true);
    };

    const confirmSubmission = async () => {
        setShowConfirmModal(false);
        setLoading(true);
        setStatusMsg('Connecting to Secure Database...');

        try {
            const payload = {
                ...form,
                reporting_guard: 'Gate Guard 1'
            };

            const response = await fetch('/api/violations/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const contentType = response.headers.get("content-type");
            let result;
            if (contentType && contentType.indexOf("application/json") !== -1) {
                result = await response.json();
            } else {
                result = { error: "Server returned a non-JSON response" };
            }

            if (response.ok) {
                setStep(2);
                fetchRecentReports();
            } else {
                console.error("Submission error details:", result);
                alert(`DB Error: ${result.error || 'Check server logs'}`);
            }
        } catch (error) {
            console.error("Network crash:", error);
            alert('CRITICAL: Cannot reach OSA Server. Ensure backend is running.');
        } finally {
            setLoading(false);
            setStatusMsg('');
        }
    };

    return (
        <div className="flex bg-slate-50 min-h-screen relative">

            {/* QR Scanner Overlay Modal */}
            {isScanning && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
                    <div className="bg-white rounded-3xl sm:rounded-[40px] p-6 sm:p-10 max-w-md w-full shadow-2xl relative overflow-hidden">
                        <button
                            onClick={() => setIsScanning(false)}
                            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors z-10"
                        >
                            <X size={20} />
                        </button>
                        <div className="text-center mb-6 sm:mb-8">
                            <h3 className="font-black text-xl sm:text-2xl text-slate-800 tracking-tight">Scanner Hub</h3>
                            <p className="text-xs sm:text-sm font-medium text-slate-400 mt-2">Position physical ID QR within frame</p>
                        </div>
                        <div id="qr-reader" className="w-full rounded-2xl sm:rounded-3xl overflow-hidden border-4 border-slate-100"></div>
                    </div>
                    </div>
                )}

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-900">Confirm Violation Report</h2>
                            <button onClick={() => setShowConfirmModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="space-y-4 mb-6">
                            <div className="bg-slate-50 p-4 rounded-xl">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Student ID</p>
                                <p className="font-bold text-slate-800">{form.student_id}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Student Name</p>
                                <p className="font-bold text-slate-800">{form.name}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-xl">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Course</p>
                                    <p className="font-bold text-slate-800 text-sm">{form.course}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Department</p>
                                    <p className="font-bold text-slate-800 text-sm">{form.department}</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Contact</p>
                                <p className="font-bold text-slate-800">{form.contact}</p>
                            </div>
                            <div className="bg-red-50 p-4 rounded-xl">
                                <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Violation Type</p>
                                <p className="font-bold text-red-800">{form.violation}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-xl">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Date of Incident</p>
                                    <p className="font-bold text-slate-800">{form.incident_date}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Time of Incident</p>
                                    <p className="font-bold text-slate-800">{form.incident_time}</p>
                                </div>
                            </div>
                            {form.description && (
                                <div className="bg-slate-50 p-4 rounded-xl">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Description</p>
                                    <p className="font-bold text-slate-800">{form.description}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowConfirmModal(false)} 
                                className="flex-1 bg-slate-100 text-slate-600 font-black py-3 rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmSubmission} 
                                disabled={loading}
                                className="flex-1 bg-green-600 text-white font-black py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Submitting...' : 'Confirm & Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Sidebar role="guard" />
            <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto overflow-y-auto mobile-top-spacer">
                <header className="mb-8 lg:mb-12 flex flex-col sm:flex-row justify-between sm:items-end gap-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight text-ustp-blue">Gate Security</h1>
                        <p className="text-slate-500 mt-1 sm:mt-2 font-medium italic tracking-wide text-sm sm:text-base">Violation Monitoring & Entry</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 gap-6 lg:gap-10">
                    <div className="space-y-6 lg:space-y-8">
                        {step === 1 && (
                            <div className="card-premium shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-500">
                                <div className="flex items-center justify-between mb-6 lg:mb-10 pb-4 lg:pb-6 border-b border-slate-100">
                                    <h3 className="font-black text-lg sm:text-xl lg:text-2xl text-slate-900 flex items-center gap-3 sm:gap-4">
                                        <ClipboardList className="text-blue-600 shrink-0" size={28} />
                                        <span className="leading-tight">VIOLATION REPORT FORM</span>
                                    </h3>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                                        <div className="space-y-4 sm:space-y-5">
                                            <div>
                                                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1 mb-2 block">Student Identification</label>
                                                <div className="relative">
                                                    <input required placeholder="Student ID (e.g. 2022-1002)" value={form.student_id} className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl sm:rounded-[24px] p-3 sm:p-4 lg:p-5 pr-14 sm:pr-16 font-black focus:border-blue-600 outline-none transition-all placeholder:text-slate-400 text-sm sm:text-base" onChange={handleIdChange} />
                                                    <button
                                                        type="button"
                                                        onClick={handleScan}
                                                        title="Optional ID Scanner"
                                                        className="absolute right-2 sm:right-3 top-2 sm:top-3 bottom-2 sm:bottom-3 aspect-square bg-slate-200 hover:bg-slate-300 rounded-xl sm:rounded-[16px] flex items-center justify-center text-slate-600 transition-colors"
                                                    >
                                                        <Scan size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                            <input required readOnly={form.name !== ''} placeholder="Student Full Name" value={form.name} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl sm:rounded-[24px] p-3 sm:p-4 lg:p-5 font-bold focus:border-blue-600 outline-none transition-all opacity-80 text-sm sm:text-base" onChange={(e) => setForm({ ...form, name: e.target.value })} />
                                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                                <select required value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl sm:rounded-[24px] p-3 sm:p-4 lg:p-5 font-bold focus:border-blue-600 outline-none transition-all opacity-80 text-sm">
                                                    <option value="">Course</option>
                                                    {COURSES.map(course => (
                                                        <option key={course} value={course}>{course}</option>
                                                    ))}
                                                </select>
                                                <select required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl sm:rounded-[24px] p-3 sm:p-4 lg:p-5 font-bold focus:border-blue-600 outline-none transition-all opacity-80 text-sm">
                                                    <option value="">Department</option>
                                                    {DEPARTMENTS.map(dept => (
                                                        <option key={dept} value={dept}>{dept}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-4 sm:space-y-5">
                                            <div>
                                                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1 mb-2 block">Contact & Incident</label>
                                                <input required readOnly={form.contact !== ''} placeholder="Contact Number" value={form.contact} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl sm:rounded-[24px] p-3 sm:p-4 lg:p-5 font-bold focus:border-blue-600 outline-none transition-all opacity-80 text-sm sm:text-base" onChange={(e) => setForm({ ...form, contact: e.target.value })} />
                                            </div>
                                            <input required readOnly={form.email !== ''} type="email" placeholder="Institutional Email" value={form.email} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl sm:rounded-[24px] p-3 sm:p-4 lg:p-5 font-bold focus:border-blue-600 outline-none transition-all opacity-80 text-sm sm:text-base" onChange={(e) => setForm({ ...form, email: e.target.value })} />
                                            <select required className="w-full bg-red-50 border-2 border-red-50 rounded-2xl sm:rounded-[24px] p-3 sm:p-4 lg:p-5 font-black text-red-900 focus:border-red-500 outline-none transition-all appearance-none cursor-pointer text-sm sm:text-base" onChange={(e) => setForm({ ...form, violation: e.target.value })} value={form.violation}>
                                                <option value="">SELECT VIOLATION CATEGORY</option>
                                                <option value="No ID">No ID</option>
                                                <option value="Improper wearing of ID">Improper wearing of ID</option>
                                                <option value="Dress code violation">Dress code violation</option>
                                                <option value="Littering">Littering</option>
                                                <option value="Disrespect to staff">Disrespect to staff</option>
                                                <option value="Public disturbance">Public disturbance</option>
                                                <option value="Unauthorized use of facilities">Unauthorized use of facilities</option>
                                                <option value="Cheating">Cheating</option>
                                                <option value="Forgery of signature">Forgery of signature</option>
                                                <option value="Vandalism">Vandalism</option>
                                                <option value="Smoking inside campus">Smoking inside campus</option>
                                                <option value="Serious misconduct">Serious misconduct</option>
                                            </select>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1 mb-2 block">Date of Incident</label>
                                                    <input 
                                                        type="date" 
                                                        required
                                                        value={form.incident_date}
                                                        onChange={(e) => setForm({ ...form, incident_date: e.target.value })}
                                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl sm:rounded-[24px] p-3 sm:p-4 font-bold focus:border-blue-600 outline-none transition-all text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1 mb-2 block">Time of Incident</label>
                                                    <input 
                                                        type="time" 
                                                        required
                                                        value={form.incident_time}
                                                        onChange={(e) => setForm({ ...form, incident_time: e.target.value })}
                                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl sm:rounded-[24px] p-3 sm:p-4 font-bold focus:border-blue-600 outline-none transition-all text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button type="submit" disabled={loading} className="btn-premium bg-blue-600 hover:bg-slate-800 text-white w-full py-4 sm:py-5 lg:py-6 text-base sm:text-lg lg:text-xl shadow-2xl shadow-blue-900/40 flex items-center justify-center gap-3 sm:gap-4 group active:scale-[0.98] transition-transform">
                                        <Send size={22} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        {loading ? statusMsg || "Processing..." : "FINALIZE SUBMISSION"}
                                    </button>
                                </form>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="card-premium text-center py-16 sm:py-24 border-2 border-green-200 bg-green-50/10 shadow-2xl shadow-green-900/5 animate-in zoom-in duration-700">
                                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-xl shadow-green-200">
                                    <CheckCircle2 className="text-white" size={40} />
                                </div>
                                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 italic tracking-tighter">SUCCESSFULLY FILED!</h2>
                                <p className="text-slate-500 mt-4 sm:mt-6 max-w-sm mx-auto text-base sm:text-lg lg:text-xl leading-relaxed font-bold px-4">The violation for <span className="text-blue-600 underline decoration-4 underline-offset-8 uppercase">{form.name}</span> has been stored in the database.</p>
                                <button onClick={() => { setStep(1); setForm({ student_id: '', name: '', course: '', department: '', contact: '', email: '', violation: '', description: '' }); }} className="mt-8 sm:mt-12 btn-premium bg-slate-900 text-white w-full max-w-sm py-4 sm:py-5 hover:bg-slate-800 shadow-xl transition-all uppercase tracking-widest font-black text-xs sm:text-sm mx-4">Create New Entry</button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ReportViolation;
