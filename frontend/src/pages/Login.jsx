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

const Login = () => {
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
                // Treat Admin as invalid on public login
                if (data.role === 'admin') {
                    setError('Invalid credentials');
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
                
                if (data.role === 'admin') navigate('/admin/overview');
                else if (data.role === 'staff') navigate('/staff/report');
                else if (data.role === 'guard') navigate('/guard/report');
                else if (data.role === 'student') navigate('/student/dashboard');
                else setError(`Unknown Role: ${data.role}`);
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
                <div className="absolute -top-1 -left-1 w-4 h-3 bg-amber-400 rounded-tr-[4px] rounded-tl-[2px] transition-none" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight relative z-10 leading-none">OSA</h2>
            </div>
            <span className="text-xl font-bold text-blue-900">Connect</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                {/* Simplified Branding Header */}
                <div className="text-center space-y-6">
                    <div className="flex justify-center transition-none">
                        <CSSLogo />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Login to Portal</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Smart student violation management</p>
                    </div>
                </div>

                {/* Clean Form Card */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg">
                            <p className="text-red-600 font-bold text-xs uppercase tracking-widest text-center">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            {/* Input Field */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Account ID / Username</label>
                                <div className="relative border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 overflow-hidden focus-within:bg-white dark:bg-slate-800 focus-within:border-blue-600 transition-none">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Enter your ID"
                                        className="w-full bg-transparent p-3.5 pl-11 outline-none font-semibold text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:text-slate-600 text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Secret Password</label>
                                <div className="relative border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 overflow-hidden focus-within:bg-white dark:bg-slate-800 focus-within:border-blue-600 transition-none">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter password"
                                        className="w-full bg-transparent p-3.5 pl-11 pr-11 outline-none font-semibold text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:text-slate-600 text-sm"
                                        required
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:text-slate-400 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <div className="text-right px-1">
                                    <Link to="/forgot-password" size={18} className="text-[10px] font-bold text-blue-700 uppercase tracking-widest hover:text-blue-900 transition-colors">
                                        Forgot Password?
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full h-12 bg-blue-900 text-white rounded-lg font-bold text-sm tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={18} />
                            ) : (
                                <>Sign In Portal <ChevronRight size={16} /></>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer Links */}
                <div className="text-center pt-2">
                    <p className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                        Don't have an ID?{' '}
                        <Link to="/register" className="text-blue-700 hover:text-blue-900 font-bold">Register Now</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
