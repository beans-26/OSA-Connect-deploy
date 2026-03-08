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
            
            if (data.role === 'admin') {
                navigate('/staff/overview');
            } else if (data.role === 'guard') {
                navigate('/guard/report');
            } else if (data.role === 'staff') {
                navigate('/staff/overview');
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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
            <div className="w-full max-w-[1100px] grid grid-cols-1 md:grid-cols-2 gap-10 bg-white rounded-[40px] shadow-2xl p-4 md:p-8 relative z-10 border border-slate-100 overflow-hidden">
                <div className="bg-ustp-navy rounded-[32px] p-12 text-white flex flex-col justify-between relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform">
                            <ShieldCheck className="text-ustp-gold" size={36} />
                        </div>
                        <h1 className="text-5xl font-black mb-6 leading-tight">USTP OSA <br /><span className="text-ustp-gold">Connect</span></h1>
                        <p className="text-slate-400 font-medium text-lg leading-relaxed max-w-sm">
                            Unified Penalty & Violation Management System for the University of Science and Technology of Southern Philippines.
                        </p>
                    </div>

                    <div className="relative z-10 space-y-6">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                                <Shield size={24} className="text-ustp-gold" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm uppercase tracking-widest text-white/50 mb-1">Secure Portal</h4>
                                <p className="text-xs font-medium text-slate-400">Advanced ID recognition and real-time monitoring.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                                <Clock size={24} className="text-ustp-gold" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm uppercase tracking-widest text-white/50 mb-1">Efficiency</h4>
                                <p className="text-xs font-medium text-slate-400">Automated timekeeping and clearance workflows.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-10 flex flex-col justify-center">
                    <div className="mb-12">
                        <h2 className="text-3xl font-black text-slate-900 mb-2">Welcome Back</h2>
                        <p className="text-slate-400 font-medium">Please sign in to your dashboard</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-ustp-blue transition-colors">
                                    <User size={20} />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Username or Student ID"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pl-12 focus:ring-4 focus:ring-blue-100 focus:border-ustp-blue transition-all outline-none font-bold text-slate-700"
                                    required
                                />
                            </div>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-ustp-blue transition-colors">
                                    <Key size={20} />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pl-12 focus:ring-4 focus:ring-blue-100 focus:border-ustp-blue transition-all outline-none font-bold text-slate-700"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn-premium bg-ustp-blue text-white w-full py-5 text-lg shadow-2xl shadow-blue-900/10 flex items-center justify-center gap-3 mt-4"
                        >
                            Sign In to Portal
                            <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform" />
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
};

export default Login;
