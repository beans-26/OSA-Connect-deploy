import React, { useState } from 'react';
import {
    CheckCircle2,
    Download,
    ChevronRight,
    Mail,
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

const YEAR_LEVELS = ['1', '2', '3', '4', '5'];
const OFFLINE_MESSAGE = "Can't reach the server. Check your internet connection and try again.";

const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg p-3 outline-none font-semibold text-slate-700 dark:text-slate-300 placeholder:text-slate-300 focus:bg-white dark:bg-slate-800 focus:border-blue-600 text-sm transition-none";

const Field = ({ label, children }) => (
    <div className="space-y-1.5 min-w-0">
        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{label}</label>
        {children}
    </div>
);

const StudentRegistration = () => {
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [otp, setOtp] = useState('');
    const [otpCooldown, setOtpCooldown] = useState(0);
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

    const CSSLogo = ({ className = "" }) => (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="relative">
                <div className="absolute -top-1 -left-1 w-4 h-3 bg-amber-400 rounded-tr-[4px] rounded-tl-[2px]" />
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 tracking-tight relative z-10 leading-none">OSA</h2>
            </div>
            <span className="text-xl font-bold text-blue-900">Connect</span>
        </div>
    );

    // Same format as the mobile app: "ID FIRST MIDDLE LAST COURSE"
    const formatQRData = (student) => {
        const nameParts = [student.first_name, student.middle_name, student.last_name].filter(Boolean);
        const formattedName = nameParts.join(' ').toUpperCase();
        return `${student.student_id} ${formattedName} ${student.course || ''}`.trim();
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
                    contact_number: studentData.contact_number
                })
            });
            if (response.ok) {
                setStep(2);
                startCooldown();
            } else {
                const data = await response.json().catch(() => ({}));
                alert(data.error || 'Check your email');
            }
        } catch (error) {
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
            const payload = {
                ...studentData,
                name: fullName,
                password: studentData.password,
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
                const data = await response.json().catch(() => ({}));
                alert(`Verification Failed

${data.error || data.message || 'Check your details'}`);
            }
        } catch (error) {
            alert(`Verification Failed

${OFFLINE_MESSAGE}`);
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 sm:p-8">
            <div className="w-full max-w-md space-y-8">
                
                {/* Clean Header */}
                <div className="text-center space-y-4">
                    <CSSLogo className="justify-center" />
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Student Identity Proxy</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-widest text-blue-900/60">Registry Portal</p>
                    </div>
                </div>

                {/* Stable Registration Card */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 p-6 sm:p-8">
                    {step === 1 ? (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div className="border-b border-slate-50 pb-6">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">Account Details</h2>
                                <p className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest">Step 01: Personal Information</p>
                            </div>

                            <form onSubmit={requestOTP} className="space-y-8">
                                {/* Same order and rows as the mobile app's registration */}
                                <div className="space-y-5">
                                    <Field label="Student ID">
                                        <input required type="text" value={studentData.student_id} onChange={(e) => setStudentData({...studentData, student_id: e.target.value})} className={inputClass} />
                                    </Field>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field label="First Name">
                                            <input required type="text" value={studentData.first_name} onChange={(e) => setStudentData({...studentData, first_name: e.target.value})} className={inputClass} />
                                        </Field>
                                        <Field label="Last Name">
                                            <input required type="text" value={studentData.last_name} onChange={(e) => setStudentData({...studentData, last_name: e.target.value})} className={inputClass} />
                                        </Field>
                                    </div>
                                    <Field label="Middle Name (Optional)">
                                        <input type="text" value={studentData.middle_name} onChange={(e) => setStudentData({...studentData, middle_name: e.target.value})} className={inputClass} />
                                    </Field>
                                    <Field label="Course">
                                        <select required value={studentData.course} onChange={(e) => setStudentData({...studentData, course: e.target.value})} className={`${inputClass} appearance-none`}>
                                            <option value="">Select Course</option>
                                            {COURSES.map((o) => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Department">
                                        <select required value={studentData.department} onChange={(e) => setStudentData({...studentData, department: e.target.value})} className={`${inputClass} appearance-none`}>
                                            <option value="">Select Department</option>
                                            {DEPARTMENTS.map((o) => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </Field>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field label="Year Level">
                                            <select required value={studentData.year_level} onChange={(e) => setStudentData({...studentData, year_level: e.target.value})} className={`${inputClass} appearance-none`}>
                                                <option value="">Year</option>
                                                {YEAR_LEVELS.map((y) => <option key={y} value={y}>Year {y}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Contact">
                                            <input required type="tel" inputMode="numeric" maxLength={11} value={studentData.contact_number} onChange={(e) => setStudentData({...studentData, contact_number: e.target.value.replace(/\D/g, '').slice(0, 11)})} className={inputClass} />
                                        </Field>
                                    </div>
                                </div>

                                <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                                        <input required type="email" value={studentData.email} onChange={(e) => setStudentData({...studentData, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg p-3.5 outline-none font-semibold text-slate-700 dark:text-slate-300 focus:bg-white dark:bg-slate-800 focus:border-blue-600 transition-none text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Password</label>
                                        <input required type="password" value={studentData.password} onChange={(e) => setStudentData({...studentData, password: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg p-3.5 outline-none font-semibold text-slate-700 dark:text-slate-300 focus:bg-white dark:bg-slate-800 focus:border-blue-600 transition-none text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Re-enter Password</label>
                                        <input required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`w-full bg-slate-50 dark:bg-slate-900 border rounded-lg p-3.5 outline-none font-semibold text-slate-700 dark:text-slate-300 focus:bg-white dark:bg-slate-800 transition-none text-sm ${passwordMismatch ? 'border-red-400 focus:border-red-500' : 'border-slate-200 dark:border-slate-600 focus:border-blue-600'}`} />
                                        {passwordMismatch && (
                                            <p className="ml-1 text-[11px] font-bold text-red-500">Passwords do not match</p>
                                        )}
                                    </div>
                                </div>

                                <button type="submit" disabled={saving} className="w-full h-14 bg-blue-900 text-white rounded-lg font-bold text-xs uppercase tracking-[0.2em] shadow-sm flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors">
                                    {saving ? <Loader2 className="animate-spin" size={20} /> : <>Verify Email <ChevronRight size={18} /></>}
                                </button>
                            </form>

                            <div className="mt-10 text-center pt-8 border-t border-slate-100 dark:border-slate-700/50">
                                <p className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest">Already have an account? <Link to="/login" className="text-blue-900 font-bold underline underline-offset-4">Log in</Link></p>
                            </div>
                        </div>
                    ) : step === 2 ? (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div className="border-b border-slate-50 pb-6 text-center">
                                <div className="w-16 h-16 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-100">
                                    <Mail size={32} />
                                </div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">Verify Your Email</h2>
                                <p className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-2">Step 02: Verification Code</p>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-4">We sent a 6-digit code to <span className="font-semibold text-slate-800 dark:text-slate-200">{studentData.email}</span></p>
                            </div>

                            <form onSubmit={verifyAndRegister} className="space-y-6">
                                <div className="space-y-1.5 max-w-sm mx-auto">
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">6-Digit Code</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <KeyRound className="text-slate-400 dark:text-slate-500" size={18} />
                                        </div>
                                        <input required type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg pl-12 p-3.5 outline-none font-bold tracking-widest text-center text-xl text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:text-slate-600 focus:bg-white dark:bg-slate-800 focus:border-blue-600 transition-none" />
                                    </div>
                                </div>

                                <div className="max-w-sm mx-auto space-y-4">
                                    <button type="submit" disabled={saving || otp.length < 6} className="w-full h-14 bg-blue-900 text-white rounded-lg font-bold text-xs uppercase tracking-[0.2em] shadow-sm flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                        {saving ? <Loader2 className="animate-spin" size={20} /> : <>Complete Registration <ChevronRight size={18} /></>}
                                    </button>
                                    
                                    <div className="text-center">
                                        {otpCooldown > 0 ? (
                                            <p className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest">Resend code in {otpCooldown}s</p>
                                        ) : (
                                            <button type="button" onClick={requestOTP} disabled={saving} className="text-blue-900 font-bold text-[10px] uppercase tracking-widest underline underline-offset-4 hover:text-blue-700">
                                                Resend Code
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </form>
                            <div className="mt-6 text-center pt-6 border-t border-slate-100 dark:border-slate-700/50">
                                <button onClick={() => setStep(1)} className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600 dark:text-slate-400">
                                    ← Back to Details
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6 animate-in fade-in duration-300">
                            <div className="w-16 h-16 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-10 border border-blue-100">
                                <CheckCircle2 size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight mb-2">Registration Success</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm max-w-sm mx-auto mb-10">Verification complete. Save your official QR credentials below for campus entry.</p>

                            <div className="bg-white dark:bg-slate-800 p-10 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 inline-block mb-10">
                                <QRCode id="qr-code-svg" value={formatQRData(studentData)} size={200} level={"H"} />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                                <button onClick={downloadQR} className="h-14 flex-1 bg-blue-900 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-sm flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors">
                                    <Download size={18} /> Download QR ID
                                </button>
                                <Link to="/login" className="h-14 flex-1 bg-slate-100 text-slate-500 dark:text-slate-400 rounded-lg font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-200 transition-colors">
                                    Continue to Login
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default StudentRegistration;
