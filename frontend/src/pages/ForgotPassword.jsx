import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    Mail, 
    KeyRound, 
    Lock, 
    ChevronRight, 
    Loader2, 
    CheckCircle2,
    ArrowLeft
} from 'lucide-react';

const ForgotPassword = () => {
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [otpCooldown, setOtpCooldown] = useState(0);
    const navigate = useNavigate();

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

    const handleRequestOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/students/request_password_reset/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (response.ok) {
                setStep(2);
                startCooldown();
            } else {
                setError(data.error || 'Failed to send reset code');
            }
        } catch (err) {
            setError('Connection failure');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = (e) => {
        e.preventDefault();
        if (otp.length === 6) {
            setStep(3);
        } else {
            setError('Please enter a 6-digit code');
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/students/reset_password/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, password: newPassword })
            });
            const data = await response.json();
            if (response.ok) {
                setStep(4);
            } else {
                setError(data.error || 'Failed to reset password');
            }
        } catch (err) {
            setError('Connection failure');
        } finally {
            setLoading(false);
        }
    };

    const CSSLogo = ({ className = "" }) => (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="relative">
                <div className="absolute -top-1 -left-1 w-4 h-3 bg-amber-400 rounded-tr-[4px] rounded-tl-[2px]" />
                <h2 className="text-xl font-bold text-slate-800 tracking-tight relative z-10 leading-none">OSA</h2>
            </div>
            <span className="text-xl font-bold text-blue-900">Connect</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-4">
                    <CSSLogo className="justify-center" />
                    <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Security Recovery</h1>
                </div>

                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg">
                            <p className="text-red-600 font-bold text-[10px] uppercase tracking-widest text-center">{error}</p>
                        </div>
                    )}

                    {step === 1 && (
                        <form onSubmit={handleRequestOTP} className="space-y-6 animate-in fade-in duration-300">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Account Email</label>
                                <div className="relative border border-slate-200 rounded-lg bg-slate-50 overflow-hidden focus-within:bg-white focus-within:border-blue-600 transition-none">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                        <Mail size={18} />
                                    </div>
                                    <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter registered email" className="w-full bg-transparent p-3.5 pl-11 outline-none font-semibold text-slate-700 placeholder:text-slate-300 text-sm" />
                                </div>
                            </div>
                            <button type="submit" disabled={loading} className="w-full h-12 bg-blue-900 text-white rounded-lg font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <>Send Reset Code <ChevronRight size={16} /></>}
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleVerifyOTP} className="space-y-6 animate-in fade-in duration-300">
                            <div className="text-center space-y-2 mb-6">
                                <p className="text-slate-500 text-sm">We sent a verification code to <br/><span className="font-bold text-slate-800">{email}</span></p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 text-center block w-full">6-Digit Code</label>
                                <input required type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3.5 outline-none font-bold tracking-[0.5em] text-center text-xl text-slate-700 focus:bg-white focus:border-blue-600 transition-none" placeholder="000000" />
                            </div>
                            <button type="submit" disabled={otp.length < 6} className="w-full h-12 bg-blue-900 text-white rounded-lg font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-50">
                                Verify Code <ChevronRight size={16} />
                            </button>
                            <div className="text-center">
                                {otpCooldown > 0 ? (
                                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Resend in {otpCooldown}s</p>
                                ) : (
                                    <button type="button" onClick={handleRequestOTP} className="text-blue-900 font-bold text-[10px] uppercase tracking-widest underline underline-offset-4">Resend Code</button>
                                )}
                            </div>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleResetPassword} className="space-y-6 animate-in fade-in duration-300">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                                    <div className="relative border border-slate-200 rounded-lg bg-slate-50 overflow-hidden focus-within:bg-white focus-within:border-blue-600 transition-none">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                            <Lock size={18} />
                                        </div>
                                        <input required type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" className="w-full bg-transparent p-3.5 pl-11 outline-none font-semibold text-slate-700 placeholder:text-slate-300 text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                                    <div className="relative border border-slate-200 rounded-lg bg-slate-50 overflow-hidden focus-within:bg-white focus-within:border-blue-600 transition-none">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                            <Lock size={18} />
                                        </div>
                                        <input required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" className="w-full bg-transparent p-3.5 pl-11 outline-none font-semibold text-slate-700 placeholder:text-slate-300 text-sm" />
                                    </div>
                                </div>
                            </div>
                            <button type="submit" disabled={loading} className="w-full h-12 bg-blue-900 text-white rounded-lg font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <>Update Password <CheckCircle2 size={16} /></>}
                            </button>
                        </form>
                    )}

                    {step === 4 && (
                        <div className="text-center space-y-6 animate-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-100">
                                <CheckCircle2 size={32} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-slate-900">Password Reset Success</h3>
                                <p className="text-slate-500 text-sm">Your security credentials have been updated successfully.</p>
                            </div>
                            <button onClick={() => navigate('/login')} className="w-full h-12 bg-slate-900 text-white rounded-lg font-bold text-xs uppercase tracking-widest">Back to Login</button>
                        </div>
                    )}
                </div>

                {step < 4 && (
                    <div className="text-center">
                        <Link to="/login" className="inline-flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600">
                            <ArrowLeft size={12} /> Back to Login
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
