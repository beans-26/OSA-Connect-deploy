import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, Clock, ArrowRight, CheckCircle, ChevronRight, QrCode, Monitor, Fingerprint, Globe, MapPin } from 'lucide-react';

const LandingPage = () => {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const heroRef = useRef(null);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!heroRef.current) return;
            const rect = heroRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            setMousePos({ x, y });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="min-h-screen bg-white selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
            <style>
                {`
                    @keyframes float {
                        0% { transform: translateY(0px) rotate(0deg); }
                        50% { transform: translateY(-20px) rotate(5deg); }
                        100% { transform: translateY(0px) rotate(0deg); }
                    }
                    @keyframes pulse-slow {
                        0%, 100% { opacity: 0.3; transform: scale(1); }
                        50% { opacity: 0.6; transform: scale(1.1); }
                    }
                    .animate-float { animation: float 6s ease-in-out infinite; }
                    .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
                    .glass { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); }
                `}
            </style>

            {/* Premium Navbar */}
            <nav className="fixed top-0 left-0 right-0 bg-white/70 backdrop-blur-xl z-[100] border-b border-slate-100/50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3 group cursor-pointer">
                        <div className="relative">
                            {/* The "Semi Curve Triangle" Shard */}
                            <div className="absolute -top-1 -left-1 w-6 h-4 bg-amber-400 rounded-tr-[100%] rounded-tl-[40%] rotate-[-15deg] group-hover:rotate-[15deg] transition-transform duration-500 z-0 opacity-80" />
                            <div className="absolute -top-0.5 -left-0.5 w-5 h-3 bg-white rounded-tr-[100%] rounded-tl-[40%] rotate-[-15deg] group-hover:rotate-[15deg] transition-transform duration-500 z-0 opacity-40 ml-1 mt-0.5" />
                            
                            <h2 className="text-2xl font-black text-slate-800 tracking-tighter relative z-10 leading-none">
                                OSA <span className="text-blue-600 font-bold italic tracking-normal ml-1">Connect</span>
                            </h2>
                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.3em] mt-0.5 ml-1">University Governance</p>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-10">
                        {['Features', 'Roles', 'Security'].map((item) => (
                            <a key={item} href={`#${item.toLowerCase()}`} className="text-[10px] font-black text-slate-400 hover:text-blue-600 transition-all uppercase tracking-[0.3em]">{item}</a>
                        ))}
                        <Link to="/login" className="relative h-12 px-8 flex items-center justify-center bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] overflow-hidden group">
                            <span className="relative z-10">Log In</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Immersive Hero Section */}
            <section ref={heroRef} className="relative pt-32 pb-24 px-6 overflow-hidden min-h-screen flex items-center">
                {/* Dynamic Background */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <div 
                        className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-100/30 rounded-full blur-[120px] animate-pulse-slow"
                        style={{ transform: `translate(${mousePos.x * 50}px, ${mousePos.y * 50}px)` }}
                    />
                    <div 
                        className="absolute bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-indigo-100/30 rounded-full blur-[120px] animate-pulse-slow"
                        style={{ transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -30}px)` }}
                    />
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)', backgroundSize: '40px 40px', opacity: 0.3 }} />
                </div>

                <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-16 items-center relative z-10">
                    <div className="lg:col-span-7 space-y-10 text-center lg:text-left">
                        <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white shadow-xl shadow-blue-100/50 rounded-full border border-blue-50">
                            <div className="relative">
                                <div className="absolute -top-1 -left-1 w-4 h-3 bg-amber-400 rounded-tr-[100%] rounded-tl-[40%] rotate-[-15deg]" />
                                <span className="text-[10px] font-black text-slate-900 tracking-tighter relative z-10">OSA</span>
                            </div>
                            <span className="text-blue-600 font-black text-[10px] uppercase tracking-[0.2em]">Next-Gen Discipline</span>
                        </div>
                        
                        <h1 className="text-5xl md:text-8xl font-black text-slate-900 leading-[0.95] tracking-tighter">
                            Control <span className="text-blue-600 italic">Order</span> <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-500 italic">With Precision.</span>
                        </h1>

                        <p className="text-lg md:text-xl text-slate-500 font-medium max-w-xl leading-relaxed mx-auto lg:mx-0">
                            The definitive all-in-one platform for USTP governance. Integrated geofencing, real-time reporting, and automated service tracking.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start">
                            <Link to="/login" className="group relative h-16 px-10 bg-blue-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl shadow-blue-200 flex items-center justify-center gap-4 overflow-hidden">
                                <span className="z-10">Launch Dashboard</span>
                                <ArrowRight className="z-10 group-hover:translate-x-2 transition-transform" size={18} />
                                <div className="absolute inset-0 bg-slate-900 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                            </Link>
                            <Link to="/register" className="h-16 px-10 bg-white border-2 border-slate-100 hover:border-blue-600 text-slate-600 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 hover:shadow-xl hover:shadow-slate-100">
                                Student Registration
                            </Link>
                        </div>
                    </div>

                    <div className="lg:col-span-5 relative group">
                        {/* Interactive Hero Card */}
                        <div 
                            className="relative bg-slate-900 rounded-[64px] p-2 shadow-[0_50px_100px_rgba(0,0,0,0.3)] transition-all duration-300 ease-out"
                            style={{ 
                                transform: `perspective(1000px) rotateX(${mousePos.y * -10}deg) rotateY(${mousePos.x * 10}deg)`,
                            }}
                        >
                            <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-[64px] opacity-20 group-hover:opacity-100 blur transition duration-500"></div>
                            <div className="relative bg-slate-950 rounded-[60px] p-8 aspect-[4/5] flex flex-col justify-between overflow-hidden border border-white/10">
                                <div className="flex justify-between items-start">
                                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/10">
                                        <Fingerprint className="text-blue-500" size={32} strokeWidth={1.5} />
                                    </div>
                                    <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                                        System Secure
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="w-[60%] h-full bg-gradient-to-r from-blue-500 to-indigo-500" />
                                    </div>
                                    <div className="w-[80%] h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="w-[40%] h-full bg-blue-500/50" />
                                    </div>
                                </div>

                                <div className="relative">
                                    <div className="w-32 h-32 bg-blue-600 rounded-[40px] absolute -right-16 -bottom-16 blur-3xl opacity-50" />
                                    <div className="text-left relative z-10">
                                        <p className="text-4xl font-black text-white tracking-tighter mb-1 uppercase italic leading-none">Live<br/>Tracking</p>
                                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Geofence Enabled</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating Badges */}
                        <div 
                            className="absolute -top-10 -right-10 glass p-5 rounded-3xl shadow-2xl border border-white/50 animate-float hidden md:block"
                            style={{ animationDelay: '1s' }}
                        >
                            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center mb-2 shadow-lg shadow-amber-200">
                                <QrCode className="text-white" size={20} />
                            </div>
                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Instant Scan</p>
                        </div>

                        <div 
                            className="absolute -bottom-10 -left-10 glass p-5 rounded-3xl shadow-2xl border border-white/50 animate-float hidden md:block"
                            style={{ animationDelay: '2s' }}
                        >
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center mb-2 shadow-lg shadow-indigo-200">
                                <MapPin className="text-white" size={20} />
                            </div>
                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Active Hubs</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Interactive Roles Selector */}
            <section id="roles" className="py-32 bg-slate-50 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-24">
                        <h2 className="text-blue-600 font-black text-xs uppercase tracking-[0.3em] mb-4">Unified Ecosystem</h2>
                        <h3 className="text-5xl font-black text-slate-900 tracking-tight uppercase">Strategic <span className="italic text-blue-600">Modules</span></h3>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { role: 'Admin', color: 'bg-blue-600', icon: Monitor, desc: 'Central command for oversight & analytics.' },
                            { role: 'Guard', color: 'bg-slate-900', icon: Shield, desc: 'Mobile-first scanning & field reporting.' },
                            { role: 'Faculty', color: 'bg-indigo-600', icon: Users, desc: 'Direct referral system for classroom order.' },
                            { role: 'Student', color: 'bg-amber-500', icon: Clock, desc: 'Self-monitoring service dashboard.' }
                        ].map((role, i) => (
                            <div 
                                key={i} 
                                className="group bg-white p-8 rounded-[40px] border border-slate-100 hover:border-blue-200 shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer"
                            >
                                <div className={`w-14 h-14 ${role.color} text-white rounded-[20px] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-xl`}>
                                    <role.icon size={24} />
                                </div>
                                <h4 className="text-2xl font-black text-slate-800 mb-3 tracking-tighter uppercase">{role.role}</h4>
                                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed">{role.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Tech Stats */}
            <section id="security" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="bg-slate-900 rounded-[64px] p-12 lg:p-24 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                        
                        <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
                            <div className="space-y-8">
                                <h3 className="text-4xl lg:text-5xl font-black text-white leading-none uppercase tracking-tighter italic">Enterprise-Grade <br/><span className="text-blue-500">Infrastructure.</span></h3>
                                <p className="text-slate-400 font-medium text-lg leading-relaxed">
                                    Built on a high-availability MongoDB backend and a responsive React frontend, OSA Connect ensures 99.9% uptime for critical university operations.
                                </p>
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <p className="text-4xl font-black text-white">0.3s</p>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Query Response</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-4xl font-black text-white">256-bit</p>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SSL Encryption</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/5 rounded-[48px] p-8 border border-white/10 backdrop-blur-xl">
                                <div className="space-y-6">
                                    {[
                                        { label: 'Cloud Database', status: 'Optimal' },
                                        { label: 'Geofencing Mesh', status: 'Online' },
                                        { label: 'Token Vault', status: 'Active' },
                                        { label: 'QR Generator', status: 'Ready' }
                                    ].map((stat, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                                            <span className="text-xs font-black text-white uppercase tracking-widest">{stat.label}</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                                <span className="text-[10px] font-black text-emerald-400 uppercase">{stat.status}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white py-20 px-6 border-t border-slate-100">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="text-center md:text-left space-y-4">
                        <div className="flex items-center justify-center md:justify-start gap-3">
                            <div className="relative">
                                <div className="absolute -top-1 -left-1 w-6 h-4 bg-amber-400 rounded-tr-[100%] rounded-tl-[40%] rotate-[-15deg] opacity-80" />
                                <div className="absolute -top-0.5 -left-0.5 w-5 h-3 bg-white rounded-tr-[100%] rounded-tl-[40%] rotate-[-15deg] opacity-40 ml-1 mt-0.5" />
                                <h2 className="text-3xl font-black text-slate-800 tracking-tighter relative z-10 leading-none">
                                    OSA <span className="text-blue-500 font-bold italic tracking-normal ml-1">Connect</span>
                                </h2>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 ml-1">USTP Office of Student Affairs</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-8">
                        <a href="#" className="text-[10px] font-black text-slate-400 hover:text-blue-600 transition-all uppercase tracking-widest">Privacy Policy</a>
                        <a href="#" className="text-[10px] font-black text-slate-400 hover:text-blue-600 transition-all uppercase tracking-widest">Terms of Service</a>
                    </div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">© 2026 USTP Office of Student Affairs</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
