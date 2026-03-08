import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Shield, LayoutDashboard, User, AlertTriangle, Clock, LogOut, Menu, X, Users, History, BarChart3, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ role }) => {
    const [mobileOpen, setMobileOpen] = useState(false);

    const menuItems = {
        guard: [
            { name: 'Report Violation', path: '/guard/report', icon: AlertTriangle },
            { name: 'History', path: '/guard/history', icon: History },
        ],
        staff: [
            { name: 'Dashboard', path: '/staff/overview', icon: LayoutDashboard },
            { name: 'View All Students', path: '/staff/students', icon: Users },
            { name: 'Pending Reviews', path: '/staff/pending', icon: AlertTriangle },
            { name: 'Archives', path: '/staff/archives', icon: Clock },
            { name: 'Analytics', path: '/staff/analytics', icon: BarChart3 },
            { name: 'Settings', path: '/staff/settings', icon: Settings },
        ],
        student: [
            { name: 'Service Hub', path: '/student/dashboard', icon: LayoutDashboard },
            { name: 'Settings', path: '/student/settings', icon: User },
        ],
    };

    const items = menuItems[role] || [];

    const sidebarContent = (
        <>
            <div className="mb-10 flex items-center gap-3">
                <div className="w-10 h-10 bg-ustp-blue rounded-xl flex items-center justify-center shadow-lg">
                    <Shield className="text-ustp-gold" size={24} />
                </div>
                <div>
                    <h1 className="font-bold text-xl text-ustp-blue leading-none">OSA</h1>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Connect</p>
                </div>
            </div>

            <nav className="flex-1 space-y-2">
                {items.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300
              ${isActive
                                ? 'bg-ustp-blue shadow-blue-200 text-white shadow-lg translate-x-1'
                                : 'text-slate-500 hover:bg-slate-100 hover:text-ustp-blue'}
            `}
                    >
                        <item.icon size={20} />
                        <span className="font-semibold text-sm">{item.name}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="mt-auto pt-6 border-t border-slate-100">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 w-full text-red-500 hover:bg-red-50 rounded-2xl transition-all group">
                    <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-semibold text-sm">Log Out</span>
                </Link>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Top Bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-40 glass border-b border-slate-200/50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-ustp-blue rounded-lg flex items-center justify-center shadow-md">
                        <Shield className="text-ustp-gold" size={18} />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg text-ustp-blue leading-none">OSA</h1>
                        <p className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">Connect</p>
                    </div>
                </div>
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                >
                    {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
                            onClick={() => setMobileOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="lg:hidden fixed top-0 left-0 w-[280px] h-screen bg-white border-r border-slate-200/50 z-50 p-6 flex flex-col shadow-2xl"
                        >
                            {sidebarContent}
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <motion.aside
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="hidden lg:flex w-64 h-screen glass border-r border-slate-200/50 sticky top-0 p-6 flex-col"
            >
                {sidebarContent}
            </motion.aside>
        </>
    );
};

export default Sidebar;
