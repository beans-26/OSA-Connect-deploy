import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Key, User, ArrowRight, ShieldCheck, Clock } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (response.ok) {
                const userData = { username: data.username, role: data.role };
                if (data.name) userData.name = data.name;
                if (data.student_id) userData.student_id = data.student_id;
                localStorage.setItem('user', JSON.stringify(userData));
                if (data.role === 'admin' || data.role === 'staff') {
                    navigate('/staff/overview');
                } else if (data.role === 'guard') {
                    navigate('/guard/report');
                } else {
                    navigate('/student/dashboard');
                }
            } else {
                alert(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-6 lg:p-12 relative overflow-hidden">
            {/* Background blobs for premium feel */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-ustp-blue/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-ustp-gold/5 rounded-full blur-[120px]" />

            <div className="w-full max-w-[1100px] grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-8 bg-white rounded-3xl md:rounded-[40px] shadow-2xl p-0 md:p-4 relative z-10 border border-slate-100 overflow-hidden">

                {/* Info Section - Hidden on small mobile */}
                <div className="hidden md:flex bg-ustp-navy rounded-3xl md:rounded-[32px] p-8 md:p-12 text-white flex-col justify-between relative overflow-hidden group">
                    {/* Animated pattern overlay */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent animate-pulse" />
                    </div>

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform duration-500">
                            <ShieldCheck className="text-ustp-gold" size={36} />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                            USTP OSA <br />
                            <span className="text-ustp-gold">Connect</span>
                        </h1>
                        <p className="text-slate-400 font-medium text-lg leading-relaxed max-w-sm">
                            Unified Penalty & Violation Management System for the University of Science and Technology of Southern Philippines.
                        </p>
                    </div>

                    <div className="relative z-10 space-y-8">
                        <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                <Shield size={22} className="text-ustp-gold" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm uppercase tracking-widest text-white/50 mb-0.5">Secure Portal</h4>
                                <p className="text-xs font-medium text-slate-400">Advanced ID recognition and monitoring.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                <Clock size={22} className="text-ustp-gold" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm uppercase tracking-widest text-white/50 mb-0.5">Efficiency</h4>
                                <p className="text-xs font-medium text-slate-400">Automated timekeeping and clearance.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Login Form Section */}
                <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
                    {/* Mobile View Logo */}
                    <div className="flex items-center gap-3 mb-10 md:hidden">
                        <div className="w-12 h-12 bg-ustp-navy rounded-xl flex items-center justify-center shadow-lg">
                            <ShieldCheck className="text-ustp-gold" size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-ustp-navy leading-none">USTP OSA</h1>
                            <span className="text-ustp-gold font-bold text-sm tracking-tighter uppercase">Connect</span>
                        </div>
                    </div>

                    <div className="mb-10 md:mb-12">
                        <h2 className="text-3xl font-black text-slate-900 mb-2">Welcome Back</h2>
                        <p className="text-slate-400 font-medium">Please sign in to your dashboard</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-ustp-blue transition-colors duration-300">
                                    <User size={20} />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Username or Student ID"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pl-12 focus:ring-4 focus:ring-ustp-blue/10 focus:border-ustp-blue transition-all outline-none font-semibold text-slate-700 placeholder:text-slate-300 placeholder:font-normal"
                                    required
                                />
                            </div>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-ustp-blue transition-colors duration-300">
                                    <Key size={20} />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pl-12 focus:ring-4 focus:ring-ustp-blue/10 focus:border-ustp-blue transition-all outline-none font-semibold text-slate-700 placeholder:text-slate-300 placeholder:font-normal"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="group relative bg-ustp-blue text-white w-full py-5 rounded-2xl text-lg font-bold shadow-2xl shadow-ustp-blue/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            <span className="relative z-10 flex items-center gap-3">
                                Sign In to Portal
                                <ArrowRight size={22} className="group-hover:translate-x-1.5 transition-transform" />
                            </span>
                        </button>

                        <div className="pt-6 text-center space-y-4">
                            <p className="text-slate-500 font-medium">
                                Don't have a QR ID?{' '}
                                <a href="/register" className="text-ustp-blue font-bold hover:underline">Register Here</a>
                            </p>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                                Protected by USTP OSA System Security
                            </p>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    );
};

export default Login;
