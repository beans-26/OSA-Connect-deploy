import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    User, 
    Eye, 
    EyeOff, 
    Lock, 
    ChevronRight,
    Loader2
} from 'lucide-react';

const AdminLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            
            if (response.ok) {
                if (data.role !== 'admin') {
                    setError('Access denied.');
                    setLoading(false);
                    return;
                }

                const userData = {
                    username: data.username,
                    role: data.role,
                    student_id: data.student_id,
                    name: data.name
                };
                localStorage.setItem('user', JSON.stringify(userData));
                navigate('/admin/overview');
            } else {
                setError(data.error || 'Invalid credentials');
            }
        } catch (error) {
            setError('System connection failure');
        } finally {
            setLoading(false);
        }
    };

    const CSSLogo = ({ className = "" }) => (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="relative">
                <div className="absolute -top-1 -left-1 w-4 h-3 bg-amber-400 rounded-tr-[4px] rounded-tl-[2px]" />
                <h2 className="text-xl font-bold text-slate-900 tracking-tight relative z-10 leading-none">OSA</h2>
            </div>
            <span className="text-xl font-bold text-blue-900">Connect</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                {/* Simplified Branding Header */}
                <div className="text-center space-y-6">
                    <div className="flex justify-center transition-none">
                        <CSSLogo />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-slate-800">Admin Portal</h1>
                        <p className="text-slate-500 text-sm font-medium">Smart student violation management</p>
                    </div>
                </div>

                {/* Secure Form Card - Minimalist */}
                <div className="bg-white p-8 rounded-xl shadow-sm border-t-4 border-blue-900 border-x border-b border-slate-200">
                    
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-center">
                            <p className="text-red-600 font-bold text-[10px] uppercase tracking-widest">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            {/* Input Field */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Account ID</label>
                                <div className="relative border border-slate-200 rounded-lg bg-slate-50 overflow-hidden focus-within:bg-white focus-within:border-blue-900 transition-none">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-900 transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Admin ID"
                                        className="w-full bg-transparent p-3.5 pl-11 outline-none font-bold text-slate-700 placeholder:text-slate-200 text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
                                <div className="relative border border-slate-200 rounded-lg bg-slate-50 overflow-hidden focus-within:bg-white focus-within:border-blue-900 transition-none">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Secure password"
                                        className="w-full bg-transparent p-3.5 pl-11 pr-11 outline-none font-bold text-slate-700 placeholder:text-slate-300 text-sm"
                                        required
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full h-12 bg-slate-900 text-white rounded-lg font-bold text-xs uppercase tracking-[0.4em] shadow-sm flex items-center justify-center gap-3 hover:bg-black transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <Loader2 className="animate-spin text-blue-400" size={18} />
                            ) : (
                                <>Sign In <ChevronRight size={16} /></>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer Links */}
                <div className="text-center pt-2">
                    <p className="text-slate-400 font-bold text-[9px] uppercase tracking-[0.2em]">
                        Admin Interface • <Link to="/login" className="text-blue-900 hover:text-blue-700 font-black underline underline-offset-4">Return</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
