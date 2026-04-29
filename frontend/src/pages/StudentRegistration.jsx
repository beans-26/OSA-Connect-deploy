import React, { useState, useEffect } from 'react';
import { 
    UserPlus, 
    CheckCircle2, 
    QrCode, 
    Download, 
    ChevronRight, 
    IdCard, 
    Mail, 
    Phone, 
    GraduationCap, 
    Building2, 
    Layers, 
    Lock,
    Loader2,
    KeyRound
} from 'lucide-react';
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
    const [otp, setOtp] = useState('');
    const [otpCooldown, setOtpCooldown] = useState(0);
    const [studentData, setStudentData] = useState({
        student_id: '',
        name: '',
        course: '',
        department: '',
        year_level: '',
        email: '',
        contact_number: '',
        password: ''
    });

    const CSSLogo = ({ className = "" }) => (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="relative">
                <div className="absolute -top-1 -left-1 w-4 h-3 bg-amber-400 rounded-tr-[4px] rounded-tl-[2px]" />
                <h2 className="text-xl font-bold text-slate-800 tracking-tight relative z-10 leading-none">OSA</h2>
            </div>
            <span className="text-xl font-bold text-blue-900">Connect</span>
        </div>
    );

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

    const startCooldown = () => {
        setOtpCooldown(60);
        const interval = setInterval(() => {
            setOtpCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const requestOTP = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            const response = await fetch('/api/students/request_otp/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: studentData.email })
            });
            if (response.ok) {
                setStep(2);
                startCooldown();
            } else {
                const data = await response.json();
                alert(`OTP Request failed: ${data.error || 'Check your email'}`);
            }
        } catch (error) {
            alert('Server connection error');
        } finally {
            setSaving(false);
        }
    };

    const verifyAndRegister = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...studentData,
                password: studentData.password || studentData.student_id,
                otp: otp
            };
            const response = await fetch('/api/students/register_with_otp/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                setStep(3);
            } else {
                const data = await response.json();
                alert(`Verification failed: ${data.error || data.message || 'Check your details'}`);
            }
        } catch (error) {
            alert('Server connection error');
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
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, 1024, 1024);
            const pngFile = canvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            downloadLink.download = `${studentData.student_id}_qr_secure.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 sm:p-12">
            <div className="w-full max-w-2xl space-y-10">
                
                {/* Clean Header */}
                <div className="text-center space-y-4">
                    <CSSLogo className="justify-center" />
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Student Identity Proxy</h1>
                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest text-blue-900/60">Registry Portal</p>
                    </div>
                </div>

                {/* Stable Registration Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 sm:p-12">
                    {step === 1 ? (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div className="border-b border-slate-50 pb-6">
                                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Account Details</h2>
                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Step 01: Personal Information</p>
                            </div>

                            <form onSubmit={requestOTP} className="space-y-8">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {[
                                        { label: 'Student ID', key: 'student_id', icon: IdCard, placeholder: '2023303188' },
                                        { label: 'Full Name', key: 'name', icon: UserPlus, placeholder: 'First M. Last' },
                                        { label: 'Course', key: 'course', icon: GraduationCap, type: 'select', options: COURSES },
                                        { label: 'Department', key: 'department', icon: Building2, type: 'select', options: DEPARTMENTS },
                                        { label: 'Year Level', key: 'year_level', icon: Layers, type: 'select', options: [1,2,3,4,5] },
                                        { label: 'Contact', key: 'contact_number', icon: Phone, placeholder: '09XXX' }
                                    ].map((f) => (
                                        <div key={f.key} className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{f.label}</label>
                                            {f.type === 'select' ? (
                                                <select required value={studentData[f.key]} onChange={(e) => setStudentData({...studentData, [f.key]: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 font-semibold text-slate-700 outline-none focus:bg-white focus:border-blue-600 appearance-none text-sm transition-none">
                                                    <option value="">Select {f.label}</option>
                                                    {f.options.map(o => <option key={o} value={o}>{f.key === 'year_level' ? `Year ${o}` : o}</option>)}
                                                </select>
                                            ) : (
                                                <input required type="text" value={studentData[f.key]} onChange={(e) => setStudentData({...studentData, [f.key]: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none font-semibold text-slate-700 placeholder:text-slate-200 focus:bg-white focus:border-blue-600 text-sm transition-none" placeholder={f.placeholder} />
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-6 pt-6 border-t border-slate-100">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                        <input required type="email" value={studentData.email} onChange={(e) => setStudentData({...studentData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3.5 outline-none font-semibold text-slate-700 focus:bg-white focus:border-blue-600 transition-none text-sm" placeholder="student@example.edu" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
                                        <input type="password" value={studentData.password} onChange={(e) => setStudentData({...studentData, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3.5 outline-none font-semibold text-slate-700 focus:bg-white focus:border-blue-600 transition-none text-sm" placeholder="ID as default if blank" />
                                    </div>
                                </div>

                                <button type="submit" disabled={saving} className="w-full h-14 bg-blue-900 text-white rounded-lg font-bold text-xs uppercase tracking-[0.2em] shadow-sm flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors">
                                    {saving ? <Loader2 className="animate-spin" size={20} /> : <>Verify Email <ChevronRight size={18} /></>}
                                </button>
                            </form>

                            <div className="mt-10 text-center pt-8 border-t border-slate-100/50">
                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Already have an account? <Link to="/login" className="text-blue-900 font-bold underline underline-offset-4">Log in</Link></p>
                            </div>
                        </div>
                    ) : step === 2 ? (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div className="border-b border-slate-50 pb-6 text-center">
                                <div className="w-16 h-16 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-100">
                                    <Mail size={32} />
                                </div>
                                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Verify Your Email</h2>
                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">Step 02: Verification Code</p>
                                <p className="text-slate-500 text-sm mt-4">We sent a 6-digit code to <span className="font-semibold text-slate-800">{studentData.email}</span></p>
                            </div>

                            <form onSubmit={verifyAndRegister} className="space-y-6">
                                <div className="space-y-1.5 max-w-sm mx-auto">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">6-Digit Code</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <KeyRound className="text-slate-400" size={18} />
                                        </div>
                                        <input required type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-12 p-3.5 outline-none font-bold tracking-widest text-center text-xl text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-blue-600 transition-none" placeholder="000000" />
                                    </div>
                                </div>

                                <div className="max-w-sm mx-auto space-y-4">
                                    <button type="submit" disabled={saving || otp.length < 6} className="w-full h-14 bg-blue-900 text-white rounded-lg font-bold text-xs uppercase tracking-[0.2em] shadow-sm flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                        {saving ? <Loader2 className="animate-spin" size={20} /> : <>Complete Registration <ChevronRight size={18} /></>}
                                    </button>
                                    
                                    <div className="text-center">
                                        {otpCooldown > 0 ? (
                                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Resend code in {otpCooldown}s</p>
                                        ) : (
                                            <button type="button" onClick={requestOTP} disabled={saving} className="text-blue-900 font-bold text-[10px] uppercase tracking-widest underline underline-offset-4 hover:text-blue-700">
                                                Resend Code
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </form>
                            <div className="mt-6 text-center pt-6 border-t border-slate-100/50">
                                <button onClick={() => setStep(1)} className="text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600">
                                    ← Back to Details
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6 animate-in fade-in duration-300">
                            <div className="w-16 h-16 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-10 border border-blue-100">
                                <CheckCircle2 size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight mb-2">Registration Success</h2>
                            <p className="text-slate-500 font-bold text-sm max-w-sm mx-auto mb-10">Verification complete. Save your official QR credentials below for campus entry.</p>

                            <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 inline-block mb-10">
                                <QRCode id="qr-code-svg" value={formatQRData(studentData)} size={200} level={"H"} />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                                <button onClick={downloadQR} className="h-14 flex-1 bg-blue-900 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-sm flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors">
                                    <Download size={18} /> Download QR ID
                                </button>
                                <Link to="/login" className="h-14 flex-1 bg-slate-100 text-slate-500 rounded-lg font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-200 transition-colors">
                                    Continue to Login
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <p className="mt-12 text-[10px] font-bold text-slate-300 uppercase tracking-widest">OSA CONNECT SECURITY © 2026</p>
        </div>
    );
};

export default StudentRegistration;
