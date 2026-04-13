import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    Shield, 
    QrCode, 
    Bell, 
    Clock, 
    LayoutDashboard, 
    CheckCircle, 
    ArrowRight, 
    FileText, 
    Activity, 
    Menu,
    X
} from 'lucide-react';
import laptopMockup from '../assets/mockup_laptop.png';
import tabletMockup from '../assets/mockup_tablet.png';
import phoneMockup from '../assets/mockup_phone.png';

const RotatingDeviceStack = ({ laptop, tablet, phone }) => {
    const [index, setIndex] = useState(0);
    const devices = [
        { id: 'desktop', type: 'laptop', img: laptop, device: 'Desktop', title: 'ADMIN DASHBOARD' },
        { id: 'tablet', type: 'tablet', img: tablet, device: 'Tablet', title: 'GUARD REPORT' },
        { id: 'mobile', type: 'phone', img: phone, device: 'Phone', title: 'STUDENT HUB' },
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % devices.length);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    // Helper to get position based on current index
    const getPos = (i) => {
        const diff = (i - index + devices.length) % devices.length;
        if (diff === 0) return 'front';
        if (diff === 1) return 'right';
        return 'left';
    };

    return (
        <div className="relative w-full max-w-2xl h-[420px] md:h-[550px] flex flex-col items-center justify-center">
            <div className="relative w-full h-80 md:h-[400px] flex items-center justify-center translate-y-[-10px] md:translate-y-[-30px]">
                {devices.map((d, i) => {
                    const pos = getPos(i);
                    const isFront = pos === 'front';
                    const isRight = pos === 'right';
                    
                    return (
                        <div 
                            key={d.id}
                            className={`
                                absolute transition-all duration-1000 ease-in-out
                                ${isFront ? 'z-30 scale-[0.95] md:scale-110 opacity-100 translate-x-0' : ''}
                                ${isRight ? 'z-10 scale-[0.7] md:scale-85 opacity-30 md:opacity-40 translate-x-[40%] md:translate-x-[45%] rotate-[10deg]' : ''}
                                ${!isFront && !isRight ? 'z-10 scale-[0.7] md:scale-85 opacity-30 md:opacity-40 translate-x-[-40%] md:translate-x-[-45%] rotate-[-10deg]' : ''}
                            `}
                        >
                            <div className={`
                                relative bg-slate-900 border-2 md:border-4 border-slate-950 shadow-2xl overflow-hidden
                                ${d.type === 'laptop' ? 'w-72 md:w-[450px] aspect-[16/10] rounded-2xl' : ''}
                                ${d.type === 'tablet' ? 'w-48 md:w-[260px] aspect-[3/4.5] rounded-3xl border-slate-800' : ''}
                                ${d.type === 'phone' ? 'w-32 md:w-[180px] aspect-[9/19] rounded-[40px] border-slate-900 bg-black p-1' : ''}
                            `}>
                                <img src={d.img} className="w-full h-full object-cover" alt={d.title} />
                                {d.type === 'phone' && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-5 bg-black rounded-b-xl z-10" />}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Active Device Info Overlay */}
            <div className="text-center mt-10 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500" key={index}>
                <div className="inline-block px-3 py-1 bg-blue-50 text-blue-900 text-[10px] font-black rounded-full uppercase tracking-widest">{devices[index].device}</div>
                <h3 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">{devices[index].title}</h3>
                <div className="flex justify-center gap-1.5 pt-2">
                    {devices.map((_, i) => (
                        <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === index ? 'w-6 bg-blue-900' : 'w-1.5 bg-slate-200'}`} />
                    ))}
                </div>
            </div>
        </div>
    );
};

const LandingPage = () => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const CSSLogo = ({ className = "", light = false }) => (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="relative">
                <div className="absolute -top-1 -left-1 w-4 h-3 bg-amber-400 rounded-tr-[8px] rounded-tl-[4px] rotate-[-10deg]" />
                <h2 className={`text-lg font-bold ${light ? 'text-white' : 'text-slate-900'} tracking-tight relative z-10 leading-none uppercase`}>OSA</h2>
            </div>
            <span className={`text-lg font-bold ${light ? 'text-blue-300' : 'text-blue-900'}`}>Connect</span>
        </div>
    );

    const navLinks = [
        { name: 'Home', href: '#home' },
        { name: 'Features', href: '#features' },
        { name: 'About', href: '#about' },
    ];

    return (
        <div className="min-h-screen bg-white font-sans text-slate-700 selection:bg-blue-50 selection:text-blue-900">
            {/* Simple Navigation */}
            <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-200 ${scrolled ? 'bg-white shadow-sm py-4 border-b border-slate-100' : 'bg-transparent py-6'}`}>
                <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
                    <CSSLogo />
                    
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <a 
                                key={link.name} 
                                href={link.href} 
                                className="text-xs font-semibold text-slate-500 hover:text-blue-900 transition-colors"
                            >
                                {link.name}
                            </a>
                        ))}
                        <Link to="/login" className="px-6 py-2 bg-blue-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors">
                            Sign In
                        </Link>
                    </div>

                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-slate-900">
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-100 p-6 flex flex-col gap-4 md:hidden shadow-lg animate-in fade-in slide-in-from-top-2">
                        {navLinks.map((link) => (
                            <a key={link.name} href={link.href} onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-slate-700">{link.name}</a>
                        ))}
                        <Link to="/login" className="px-6 py-3 bg-blue-900 text-white rounded-lg text-center font-bold text-sm">Login</Link>
                    </div>
                )}
            </nav>

            {/* Hero Section - Clean & Static */}
            <section id="home" className="pt-40 pb-24 px-6 bg-slate-50">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
                                Integrated <br/>
                                <span className="text-blue-900">OSA Connect</span>
                            </h1>
                            <div className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded border border-amber-200 uppercase tracking-widest">
                                "One scan at a time"
                            </div>
                        </div>
                        
                        <p className="text-lg text-slate-600 font-medium leading-relaxed max-w-lg">
                            A smart and efficient student violation management system. Record violations, verify identities, and track community service in real time through a digital ecosystem.
                        </p>

                        <div className="flex gap-4 pt-4">
                            <Link to="/register" className="px-8 py-3 bg-blue-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors flex items-center gap-2">
                                Get Started <ArrowRight size={16} />
                            </Link>
                            <Link to="/login" className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors">
                                Login Portal
                            </Link>
                        </div>
                    </div>
                    
                    <div className="flex justify-center md:justify-end relative order-first md:order-last mb-12 md:mb-0">
                        <RotatingDeviceStack laptop={laptopMockup} tablet={tabletMockup} phone={phoneMockup} />
                    </div>

                </div>
            </section>

            {/* Features - Pure Grid */}
            <section id="features" className="py-24 px-6 bg-white border-t border-slate-50">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-16">
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Features</h2>
                        <div className="w-12 h-1 bg-amber-400 mt-2" />
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
                        {[
                            { title: 'Digital Violation Recording', icon: FileText, desc: 'Centralized and secure logging of student disciplinary incidents.' },
                            { title: 'QR Identity Verification', icon: QrCode, desc: 'Instant identity checks using secure student digital IDs.' },
                            { title: 'Real-time Notifications', icon: Bell, desc: 'Automated alert delivery for administrators and students.' },
                            { title: 'Community Service Tracking', icon: Clock, desc: 'Live monitoring and management of assigned service hours.' },
                            { title: 'Comprehensive Dashboard', icon: LayoutDashboard, desc: 'Admin reporting hub for status monitoring and data analysis.' }
                        ].map((f, i) => (
                            <div key={i} className="flex gap-6">
                                <div className="w-12 h-12 bg-slate-50 text-blue-900 rounded-lg flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">
                                    <f.icon size={20} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-bold text-slate-900 text-base">{f.title}</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="py-24 bg-slate-900 text-white">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <p className="text-amber-400 font-bold text-[10px] uppercase tracking-[0.2em]">Efficiency Protocol</p>
                                <h2 className="text-3xl font-extrabold tracking-tight">About OSA Connect</h2>
                            </div>
                            <div className="space-y-6">
                                <div className="flex gap-5">
                                    <CheckCircle size={20} className="text-blue-300 shrink-0" />
                                    <p className="text-slate-400 text-sm font-medium">Manage student violations faster and more accurately.</p>
                                </div>
                                <div className="flex gap-5">
                                    <CheckCircle size={20} className="text-blue-300 shrink-0" />
                                    <p className="text-slate-400 text-sm font-medium">Reduces manual paperwork and streamlines administrative effort.</p>
                                </div>
                                <div className="flex gap-5">
                                    <CheckCircle size={20} className="text-blue-300 shrink-0" />
                                    <p className="text-slate-400 text-sm font-medium">Improves transparency between students and administrators.</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-white/5 rounded-2xl border border-white/10">
                            <h3 className="text-xl font-bold mb-4">Integrated Ecosystem</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Our platform provides a unified environment for student violation processing, QR-based verification, and real-time service monitoring, designed for university-wide stability.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-16 px-6 bg-white border-t border-slate-100">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="space-y-4 text-center md:text-left">
                        <CSSLogo />
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest max-w-xs leading-relaxed">
                            A professional ecosystem for student violation processing and campus monitoring.
                        </p>
                    </div>
                    
                    <div className="flex gap-12 text-center md:text-left">
                        <div className="flex flex-col gap-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Sections</p>
                            <a href="#home" className="text-xs font-medium text-slate-500 hover:text-blue-900">Home</a>
                            <a href="#features" className="text-xs font-medium text-slate-500 hover:text-blue-900">Features</a>
                            <a href="#about" className="text-xs font-medium text-slate-500 hover:text-blue-900">About</a>
                        </div>
                        <div className="flex flex-col gap-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Account</p>
                            <Link to="/login" className="text-xs font-medium text-slate-500 hover:text-blue-900">Login</Link>
                            <Link to="/register" className="text-xs font-medium text-slate-500 hover:text-blue-900">Register</Link>
                        </div>
                    </div>
                </div>
                <div className="max-w-6xl mx-auto border-t border-slate-50 mt-16 pt-8 text-center md:text-left">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
                        © 2026 OSA CONNECT • ONE SCAN AT A TIME
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
