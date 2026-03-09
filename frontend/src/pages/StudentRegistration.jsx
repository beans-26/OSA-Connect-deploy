import React, { useState } from 'react';
import { UserPlus, CheckCircle2, QrCode, Download, ShieldCheck } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Link } from 'react-router-dom';

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

const StudentRegistration = () => {
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [studentData, setStudentData] = useState({
        student_id: '',
        name: '',
        course: '',
        department: '',
        year_level: '',
        email: '',
        contact_number: '',
        password: '' // Will use student_id as default if not filled by them
    });

    const formatQRData = (student) => {
        if (!student.name) return student.student_id;

        const nameParts = student.name.trim().split(/\s+/);
        let firstName = nameParts[0] || '';
        let middleInitial = '';
        let lastName = '';

        if (nameParts.length >= 2) {
            const lastPart = nameParts[nameParts.length - 1];
            if (lastPart.endsWith('.') || lastPart.length <= 3) {
                middleInitial = lastPart;
                lastName = nameParts.length > 2 ? nameParts[nameParts.length - 2] : '';
            } else {
                lastName = lastPart;
                middleInitial = nameParts.length > 2 ? nameParts[1] : '';
            }
        }

        const formattedName = `${firstName.toUpperCase()} ${middleInitial.toUpperCase()} ${lastName.toUpperCase()}`.trim();
        const course = student.course ? student.course.replace(/^BS|^BSIT|^BSCS|^BSCE|^BSEE|^BSME|^BSCpE/i, '').trim() : '';

        return `${student.student_id} ${formattedName} ${course}`.trim();

    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const payload = {
                ...studentData,
                password: studentData.password || studentData.student_id
            };

            const response = await fetch('/api/students/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setStep(2); // Success & Show QR
            } else {
                const data = await response.json();
                alert(`Registration failed: ${data.message || 'Check your details or ID might already be registered.'}`);
            }
        } catch (error) {
            console.error('Error registering:', error);
            alert('Failed to connect to the server.');
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
            canvas.width = 256;
            canvas.height = 256;
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height); // white background
            ctx.drawImage(img, 0, 0);
            const pngFile = canvas.toDataURL('image/png');

            const downloadLink = document.createElement('a');
            downloadLink.download = `${studentData.student_id}_qr.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-10 px-4">

            {/* Header */}
            <div className="mb-10 text-center">
                <div className="w-20 h-20 bg-ustp-blue rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-200">
                    <ShieldCheck className="text-white" size={40} />
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic">OSA Connect</h1>
                <p className="text-slate-500 mt-2 font-medium tracking-wide uppercase text-sm">Student Identity Registration</p>
            </div>

            {/* Registration Card */}
            <div className="bg-white rounded-[40px] p-8 md:p-12 w-full max-w-2xl shadow-2xl border-4 border-slate-50">
                {step === 1 ? (
                    <div className="animate-in slide-in-from-bottom-5 duration-500">
                        <div className="flex items-center gap-4 mb-8 pb-6 border-b-2 border-slate-50">
                            <div className="w-12 h-12 bg-blue-50 text-ustp-blue rounded-full flex items-center justify-center">
                                <UserPlus size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Enter Your Details</h2>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Generate your official QR ID</p>
                            </div>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1 mb-2 block">Student ID *</label>
                                    <input type="text" required value={studentData.student_id} onChange={(e) => setStudentData({ ...studentData, student_id: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] p-4 font-bold focus:border-ustp-blue outline-none transition-all placeholder:text-slate-300" placeholder="e.g. 2023303188" />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1 mb-2 block">Full Name *</label>
                                    <input type="text" required value={studentData.name} onChange={(e) => setStudentData({ ...studentData, name: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] p-4 font-bold focus:border-ustp-blue outline-none transition-all placeholder:text-slate-300" placeholder="e.g. Juan De La Cruz" />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1 mb-2 block">Course *</label>
                                    <select required value={studentData.course} onChange={(e) => setStudentData({ ...studentData, course: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] p-4 font-bold text-slate-700 outline-none focus:border-ustp-blue appearance-none">
                                        <option value="" disabled>Select Course</option>
                                        {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1 mb-2 block">Department *</label>
                                    <select required value={studentData.department} onChange={(e) => setStudentData({ ...studentData, department: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] p-4 font-bold text-slate-700 outline-none focus:border-ustp-blue appearance-none">
                                        <option value="" disabled>Select Department</option>
                                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1 mb-2 block">Year Level *</label>
                                    <select required value={studentData.year_level} onChange={(e) => setStudentData({ ...studentData, year_level: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] p-4 font-bold text-slate-700 outline-none focus:border-ustp-blue appearance-none">
                                        <option value="" disabled>Select Year</option>
                                        {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1 mb-2 block">Contact Number</label>
                                    <input type="tel" value={studentData.contact_number} onChange={(e) => setStudentData({ ...studentData, contact_number: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] p-4 font-bold focus:border-ustp-blue outline-none transition-all placeholder:text-slate-300" placeholder="09XX..." />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1 mb-2 block">Email Address *</label>
                                <input type="email" required value={studentData.email} onChange={(e) => setStudentData({ ...studentData, email: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] p-4 font-bold focus:border-ustp-blue outline-none transition-all placeholder:text-slate-300" placeholder="student@example.com" />
                            </div>

                            <button type="submit" disabled={saving} className="w-full bg-ustp-blue text-white py-5 rounded-[24px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-blue-200 disabled:opacity-50 mt-4">
                                {saving ? "Registering..." : "Complete Registration"}
                            </button>
                        </form>
                        <div className="mt-8 text-center border-t-2 border-slate-50 pt-8">
                            <p className="text-slate-400 text-sm font-medium">Already registered?</p>
                            <Link to="/login" className="text-ustp-blue font-bold uppercase text-xs tracking-widest hover:underline mt-2 inline-block">Go to Login</Link>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in zoom-in duration-500 text-center py-6">
                        <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-green-200">
                            <CheckCircle2 size={40} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight italic mb-2">Registration Complete!</h2>
                        <p className="text-slate-500 font-medium mb-10 max-w-sm mx-auto">Your identity has been verified. Save your QR code below; you will need it when entering the campus.</p>

                        <div className="bg-slate-50 p-8 rounded-[32px] inline-block border-4 border-white shadow-inner mb-10 relative">
                            {/* Decorative corners */}
                            <div className="absolute top-4 left-4 w-4 h-4 border-t-4 border-l-4 border-ustp-blue"></div>
                            <div className="absolute top-4 right-4 w-4 h-4 border-t-4 border-r-4 border-ustp-blue"></div>
                            <div className="absolute bottom-4 left-4 w-4 h-4 border-b-4 border-l-4 border-ustp-blue"></div>
                            <div className="absolute bottom-4 right-4 w-4 h-4 border-b-4 border-r-4 border-ustp-blue"></div>

                            <QRCode
                                id="qr-code-svg"
                                value={formatQRData(studentData)}
                                size={220}
                                level={"H"}
                            />
                        </div>

                        <div className="space-y-4 max-w-sm mx-auto">
                            <button onClick={downloadQR} className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-5 rounded-[24px] font-black uppercase text-sm tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                                <Download size={20} />
                                Download My QR ID
                            </button>
                            <Link to="/login" className="w-full flex items-center justify-center bg-slate-100 text-slate-500 py-5 rounded-[24px] font-black uppercase text-sm tracking-widest hover:bg-slate-200 transition-all">
                                Continue to Dashboard
                            </Link>
                        </div>
                    </div>
                )}
            </div>
            {/* Footer */}
            <p className="mt-12 tracking-widest text-[10px] font-bold text-slate-400 uppercase">OSTP Gate Security System © {new Date().getFullYear()}</p>
        </div>
    );
};

export default StudentRegistration;
