import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Shield, LayoutDashboard, User, AlertTriangle, Clock, LogOut, Menu, X, Users, History, BarChart3, Settings, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.png';

const Sidebar = ({ role }) => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState({});

    const toggleSection = (title) => {
        setCollapsedSections(prev => ({ ...prev, [title]: !prev[title] }));
    };

    const menuItems = {
        admin: [
            {
                title: 'OVERVIEW',
                links: [
                    { name: 'Dashboard', path: '/admin/overview', icon: LayoutDashboard },
                ]
            },
            {
                title: 'MANAGEMENT',
                links: [
                    { name: 'Students', path: '/admin/students', icon: Users },
                    { name: 'Pending Reviews', path: '/admin/pending', icon: AlertTriangle },
                    { name: 'Archives', path: '/admin/archives', icon: Clock },
                ]
            },
            {
                title: 'REPORTS & ADMIN',
                links: [
                    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
                    { name: 'Settings', path: '/admin/settings', icon: Settings },
                ]
            }
        ],
        guard: [
            { name: 'Report Violation', path: '/guard/report', icon: AlertTriangle },
            { name: 'History', path: '/guard/history', icon: History },
        ],
        student: [
            { name: 'Service Hub', path: '/student/dashboard', icon: LayoutDashboard },
            { name: 'Settings', path: '/student/settings', icon: User },
        ],
    };

    const items = menuItems[role] || [];

    const renderLink = (item) => (
        <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 mx-3 rounded-full transition-all duration-300 font-bold text-sm
                ${isActive
                    ? 'bg-ustp-blue text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-ustp-blue dark:hover:text-ustp-blue'}
            `}
        >
            <item.icon size={20} />
            <span>{item.name}</span>
        </NavLink>
    );

    const sidebarContent = (
        <>
            <div className="mb-8 flex flex-col items-center justify-center pt-2 pb-6 border-b border-slate-100 dark:border-slate-800 mx-6">
                <div className="flex items-center gap-3">
                    <img src={logo} alt="OSA Connect Logo" className="h-12 w-auto object-contain" />
                    <div className="flex flex-col">
                        <span className="text-ustp-navy dark:text-white font-black text-xl tracking-tight leading-none">OSAConnect</span>
                        <span className="text-slate-400 dark:text-slate-500 text-[9px] uppercase tracking-widest mt-1">Student Affairs</span>
                    </div>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
                {items.map((item, idx) => {
                    if (item.title) {
                        return (
                            <div key={idx} className="mb-6">
                                <button 
                                    onClick={() => toggleSection(item.title)}
                                    className="w-full flex items-center justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-7 mb-3 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                                >
                                    <span>{item.title}</span>
                                    {collapsedSections[item.title] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                </button>
                                <AnimatePresence initial={false}>
                                    {!collapsedSections[item.title] && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="space-y-1 overflow-hidden"
                                        >
                                            {item.links.map(link => renderLink(link))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    }
                    return renderLink(item);
                })}
            </nav>

            <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800 pb-4">
                {role === 'admin' && (
                    <Link to="/admin/help" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 mx-3 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-ustp-blue rounded-xl transition-all group mb-1">
                        <HelpCircle size={20} className="group-hover:scale-110 transition-transform" />
                        <span className="font-bold text-sm">Help</span>
                    </Link>
                )}
                <Link to="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 mx-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 rounded-xl transition-all group">
                    <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold text-sm">Log Out</span>
                </Link>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Top Bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <img src={logo} alt="OSA Connect Logo" className="h-8 w-auto object-contain" />
                </div>
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
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
                            className="lg:hidden fixed top-0 left-0 w-[280px] h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 py-6 flex flex-col shadow-2xl"
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
                className="hidden lg:flex w-72 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 sticky top-0 py-8 flex-col shrink-0"
            >
                {sidebarContent}
            </motion.aside>
        </>
    );
};

export default Sidebar;
