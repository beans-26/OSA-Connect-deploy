import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Shield, LayoutDashboard, User, AlertTriangle, Clock, LogOut, Menu, X, Users, History, BarChart3, Settings, HelpCircle, ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, FileSearch, Archive, TrendingUp, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/osaconnect-logo.png';
import logoDark from '../assets/osaconnect-logo-dark.png';
import logoIcon from '../assets/osaconnect-icon.png';
import { loginPathFor } from '../lib/portals';
import { logoutStudent } from './studentSession';

// Every page renders its own Sidebar, so it remounts on each navigation.
// Only slide it in the first time; after that it should stay put while the content animates.
let hasSlidIn = false;

const Sidebar = ({ role }) => {
    const navigate = useNavigate();
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Clears the saved login (a student's running session is stopped too) and goes to that role's login page
    const confirmLogout = () => {
        setShowConfirmModal(false);
        setMobileOpen(false);
        if (role === 'student') {
            logoutStudent(navigate);
            return;
        }
        localStorage.removeItem('user');
        navigate(loginPathFor(role), { replace: true });
    };

    const logOut = () => {
        setShowConfirmModal(true);
    };
    const [slideIn] = useState(() => {
        const first = !hasSlidIn;
        hasSlidIn = true;
        return first;
    });
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
    const [collapsedSections, setCollapsedSections] = useState({});

    const toggleCollapse = () => {
        setCollapsed((prev) => {
            localStorage.setItem('sidebar-collapsed', !prev);
            return !prev;
        });
    };

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
                    { name: 'Pending Reviews', path: '/admin/pending', icon: FileSearch },
                    { name: 'Archives', path: '/admin/archives', icon: Archive },
                ]
            },
            {
                title: 'REPORTS & ADMIN',
                links: [
                    { name: 'Analytics', path: '/admin/analytics', icon: TrendingUp },
                    { name: 'Settings', path: '/admin/settings', icon: Settings },
                ]
            }
        ],
        guard: [
            { name: 'Report Violation', path: '/guard/report', icon: ShieldAlert },
            { name: 'History', path: '/guard/history', icon: History },
            { name: 'Analytics', path: '/guard/analytics', icon: BarChart3 },
        ],
        staff: [
            { name: 'Report Violation', path: '/staff/report', icon: ShieldAlert },
            { name: 'History', path: '/staff/history', icon: History },
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
            title={collapsed ? item.name : undefined}
            className={({ isActive }) => `
                flex items-center gap-3 ${collapsed ? 'justify-center px-2 py-3 mx-2' : 'px-4 py-3 mx-3'} rounded-full transition-all duration-300 font-bold text-sm
                ${isActive
                    ? 'bg-ustp-blue text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-ustp-blue dark:hover:text-ustp-blue'}
            `}
        >
            <item.icon size={20} className="shrink-0" />
            {!collapsed && <span>{item.name}</span>}
        </NavLink>
    );

    const sidebarContent = (isCollapsed = false) => (
        <>
            <div className={`mb-8 flex flex-col items-center justify-center pt-2 pb-6 border-b border-slate-100 dark:border-slate-800 ${isCollapsed ? 'mx-2' : 'mx-6'}`}>
                {isCollapsed ? (
                    /* Show the OC brand icon when collapsed */
                    <img src={logoIcon} alt="OSAConnect" className="w-10 h-10 object-contain select-none rounded-xl shadow-sm" draggable="false" />
                ) : (
                    <>
                        {/* The OSAConnect wordmark (same as the login pages); dark mode uses a copy with the navy parts made light */}
                        <img src={logo} alt="OSAConnect: Smart student violation management" className="h-11 w-auto max-w-full object-contain select-none dark:hidden" draggable="false" />
                        <img src={logoDark} alt="OSAConnect: Smart student violation management" className="hidden h-11 w-auto max-w-full object-contain select-none dark:block" draggable="false" />
                    </>
                )}
            </div>

            <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
                {items.map((item, idx) => {
                    if (item.title) {
                        return (
                            <div key={idx} className="mb-6">
                                {!isCollapsed ? (
                                    <button 
                                        onClick={() => toggleSection(item.title)}
                                        className="w-full flex items-center justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-7 mb-3 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                                    >
                                        <span>{item.title}</span>
                                        {collapsedSections[item.title] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                ) : (
                                    <div className="w-8 mx-auto mb-3 border-t border-slate-100 dark:border-slate-800" />
                                )}
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
                {['admin', 'staff', 'guard'].includes(role) && (
                    <Link to="/help" onClick={() => setMobileOpen(false)} title={isCollapsed ? 'Help' : undefined} className={`flex items-center gap-3 ${isCollapsed ? 'justify-center px-2 py-3 mx-2' : 'px-4 py-3 mx-3'} text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-ustp-blue rounded-xl transition-all group mb-1`}>
                        <HelpCircle size={20} className="group-hover:scale-110 transition-transform shrink-0" />
                        {!isCollapsed && <span className="font-bold text-sm">Help</span>}
                    </Link>
                )}
                <button type="button" onClick={logOut} title={isCollapsed ? 'Log Out' : undefined} className={`${isCollapsed ? 'w-[calc(100%-1rem)] mx-2 justify-center' : 'w-[calc(100%-1.5rem)] mx-3'} flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 rounded-xl transition-all group`}>
                    <LogOut size={20} className="group-hover:-translate-x-1 transition-transform shrink-0" />
                    {!isCollapsed && <span className="font-bold text-sm">Log Out</span>}
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Top Bar: above the pages' sticky search headers (z-40), below modals (z-50) */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-[45] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <img src={logo} alt="OSAConnect" className="h-8 w-auto object-contain select-none dark:hidden" draggable="false" />
                    <img src={logoDark} alt="OSAConnect" className="hidden h-8 w-auto object-contain select-none dark:block" draggable="false" />
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
                            className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[46]"
                            onClick={() => setMobileOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="lg:hidden fixed top-0 left-0 w-[280px] h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-[47] py-6 flex flex-col shadow-2xl"
                        >
                            {sidebarContent(false)}
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <motion.aside
                initial={slideIn ? { x: -100, opacity: 0 } : false}
                animate={{ x: 0, opacity: 1, width: collapsed ? 72 : 288 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="hidden lg:flex h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 sticky top-0 py-8 flex-col shrink-0 relative overflow-hidden"
            >
                {sidebarContent(collapsed)}
                {/* Collapse toggle button — sits at the bottom of the sidebar, clearly visible */}
                <button
                    onClick={toggleCollapse}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    className="absolute top-10 -right-0 w-6 h-12 rounded-l-lg bg-ustp-blue hover:bg-blue-700 flex items-center justify-center text-white transition-all shadow-md hover:w-7"
                >
                    {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
                </button>
            </motion.aside>

            {/* Confirmation modal before logging out */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-150 border border-slate-100 dark:border-slate-700 text-center">
                        <div className="w-12 h-12 bg-red-50 dark:bg-red-950/50 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <LogOut size={22} />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Log out?</h3>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 mb-6">
                            Are you sure you want to log out of your account?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmLogout}
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors shadow-md shadow-red-200 dark:shadow-none"
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;

