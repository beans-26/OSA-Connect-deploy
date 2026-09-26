import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { Settings as SettingsIcon, Shield, Clock, Bell, Lock, User, Search, Key, AlertTriangle, Save, LogOut, CheckCircle, MapPin } from 'lucide-react';
import GlobalSearch from '../../components/GlobalSearch';
import ServiceSites from './ServiceSites';

const LiveTimer = ({ remainingHours }) => {
    const formatTime = (hours) => {
        if (!hours) return '00:00:00';
        const h = Math.floor(hours);
        const m = Math.floor((hours - h) * 60);
        const s = Math.floor(((hours - h) * 60 - m) * 60);
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    return <span className="font-mono text-green-600 font-black tracking-tighter">{formatTime(remainingHours)}</span>;
};

const StaffSettings = () => {
    const userRole = JSON.parse(localStorage.getItem('user') || '{}').role || 'staff';
    const [activeSection, setActiveSection] = useState('sites');
    const [searchId, setSearchId] = useState('');
    const [lookupResult, setLookupResult] = useState(null);
    const [loadingLookup, setLoadingLookup] = useState(false);
    const [adminCode, setAdminCode] = useState('');
    const [tickets, setTickets] = useState([]);
    const [violations, setViolations] = useState([]);
    const [deductHours, setDeductHours] = useState('');
    const [manualStudentId, setManualStudentId] = useState('');
    const [manualMessage, setManualMessage] = useState('');
    const [manualCode, setManualCode] = useState('');
    const [actionMessage, setActionMessage] = useState({ text: '', type: '' });

    // Profile State
    const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
    const [profileName, setProfileName] = useState(currentUser.full_name || 'OSA Administrator');
    const [profileBio, setProfileBio] = useState(currentUser.bio || 'University of Science and Technology of Southern Philippines Personnel');

    // Security State
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [saveStatus, setSaveStatus] = useState({ msg: '', type: '' });

    const ADMIN_SECRET = "OSA-2026";

    const sections = [
        { id: 'sites', label: 'Service Sites', icon: MapPin, description: 'Register locations by GPS' },
        { id: 'account', label: 'Account', icon: User, description: 'Manage your profile' },
        { id: 'security', label: 'Security', icon: Lock, description: 'Password and access' },
        { id: 'notifications', label: 'Notifications', icon: Bell, description: 'System alerts' },
    ];

    useEffect(() => {
        // Removed tickets polling
    }, [activeSection]);

    const fetchAdminData = async () => {
        try {
            const [vResp, tResp] = await Promise.all([
                fetch('/api/violations/?t=' + Date.now()),
                fetch('/api/etickets/?t=' + Date.now())
            ]);
            setViolations(await vResp.json());
            setTickets(await tResp.json());
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setSaveStatus({ msg: 'Saving...', type: 'info' });
        try {
            const response = await fetch('/api/users/update_profile/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: currentUser.username,
                    full_name: profileName,
                    bio: profileBio
                })
            });
            const data = await response.json();
            if (response.ok) {
                const updatedUser = { ...currentUser, full_name: data.full_name, bio: data.bio };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setCurrentUser(updatedUser);
                setSaveStatus({ msg: 'Profile updated successfully!', type: 'success' });
            } else {
                setSaveStatus({ msg: data.error || 'Update failed', type: 'error' });
            }
        } catch (error) {
            setSaveStatus({ msg: 'Network error', type: 'error' });
        }
        setTimeout(() => setSaveStatus({ msg: '', type: '' }), 3000);
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setSaveStatus({ msg: "Passwords don't match!", type: 'error' });
            return;
        }
        setSaveStatus({ msg: 'Updating...', type: 'info' });
        try {
            const response = await fetch('/api/users/change_password/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: currentUser.username,
                    old_password: oldPassword,
                    new_password: newPassword
                })
            });
            const data = await response.json();
            if (response.ok) {
                setSaveStatus({ msg: 'Password changed successfully!', type: 'success' });
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                setSaveStatus({ msg: data.error || 'Update failed', type: 'error' });
            }
        } catch (error) {
            setSaveStatus({ msg: 'Network error', type: 'error' });
        }
        setTimeout(() => setSaveStatus({ msg: '', type: '' }), 3000);
    };

    const handleManualTimeIn = async () => {
        if (!manualStudentId || !manualCode) {
            setManualMessage('Please enter Student ID and Code');
            return;
        }
        try {
            const response = await fetch('/api/etickets/manual_time_in/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_id: manualStudentId, code: manualCode })
            });
            if (response.ok) {
                setManualMessage('Timer Started!');
                setManualCode('');
                fetchAdminData();
            } else { setManualMessage('Error starting timer'); }
        } catch (e) { setManualMessage('Network error'); }
        setTimeout(() => setManualMessage(''), 3000);
    };

    const handleManualTimeOut = async () => {
        if (!manualStudentId) {
            setManualMessage('Please enter Student ID');
            return;
        }
        try {
            const response = await fetch('/api/etickets/manual_time_out/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_id: manualStudentId })
            });
            const data = await response.json();
            if (response.ok) {
                setManualMessage(data.message);
                fetchAdminData();
            } else { setManualMessage(data.error || 'Error'); }
        } catch (e) { setManualMessage('Network error'); }
        setTimeout(() => setManualMessage(''), 3000);
    };

    const handleLookup = async () => {
        if (!searchId) return;
        setLoadingLookup(true);
        try {
            const resp = await fetch('/api/etickets/');
            const data = await resp.json();
            const cleanSearchId = String(searchId).trim().toLowerCase();
            const studentTicket = data.find(t =>
                String(t.violation_details?.student_details?.student_id).trim().toLowerCase() === cleanSearchId &&
                t.status !== 'Completed'
            );
            setLookupResult(studentTicket || 'Not Found');
        } catch (e) { setLookupResult('Error'); }
        finally { setLoadingLookup(false); }
    };

    const handleSyncLog = async (action, deductHrs = 0) => {
        setActionMessage({ text: '', type: '' });
        if (adminCode !== ADMIN_SECRET) {
            setActionMessage({ text: 'Error: Invalid Admin Override Code!', type: 'error' });
            return;
        }
        try {
            const resp = await fetch('/api/timelogs/log_time/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eticket_id: lookupResult.id,
                    action: action,
                    deduct_hours: deductHrs
                }),
            });
            if (resp.ok) {
                setActionMessage({ text: 'Hours successfully deducted!', type: 'success' });
                setAdminCode('');
                handleLookup();
                fetchAdminData();
            } else { setActionMessage({ text: "Failed to sync.", type: 'error' }); }
        } catch (e) { setActionMessage({ text: "Network error.", type: 'error' }); }
        setTimeout(() => setActionMessage({ text: '', type: '' }), 3000);
    };

    return (
        <div className="flex bg-slate-50 dark:bg-slate-900 min-h-screen relative font-sans">
            <Sidebar role={userRole} />
            <div className="flex-1 h-screen overflow-y-auto custom-scrollbar w-full">
                <div className="sticky top-0 z-40 bg-slate-50 dark:bg-slate-900 px-4 md:px-10 pt-[76px] lg:pt-10 pb-2 border-b border-transparent">
                    <GlobalSearch />
                </div>
                <main className="page-enter flex-1 px-4 pb-8 md:p-10 md:pt-0 w-full max-w-full">
                <header className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Settings
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium text-sm">Configure system preferences and administration</p>
                </header>

                {saveStatus.msg && (
                    <div className={`fixed bottom-10 right-10 z-50 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 duration-500 flex items-center gap-3 font-bold border-2 ${saveStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        saveStatus.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' :
                            'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                        <Save size={20} />
                        {saveStatus.msg}
                    </div>
                )}

                {actionMessage.text && (
                    <div className={`fixed bottom-10 left-10 z-50 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-left-10 duration-500 flex items-center gap-3 font-bold border-2 ${actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                        {actionMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                        {actionMessage.text}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Navigation Sidebar */}
                    <div className="lg:col-span-1 space-y-3">
                        {sections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`w-full flex items-center gap-3 p-3 md:p-4 rounded-xl transition-all duration-300 ${
                                    activeSection === section.id
                                    ? 'bg-ustp-blue text-white shadow-md translate-x-1'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                    }`}
                            >
                                <div className={`p-2 rounded-lg ${
                                    activeSection === section.id
                                    ? 'bg-white/20'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                }`}>
                                    <section.icon size={18} />
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-sm leading-none uppercase tracking-widest">{section.label}</p>
                                    <p className={`text-[10px] mt-1 font-bold ${activeSection === section.id ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>
                                        {section.description}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="lg:col-span-3">
                        {activeSection === 'sites' && <ServiceSites />}

                        {/* Tickets section removed */}

                        {activeSection === 'account' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="card-premium p-6 rounded-2xl">
                                    <div className="flex flex-col md:flex-row gap-8">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-white shadow-md">
                                                <User size={48} className="text-slate-300 dark:text-slate-600" />
                                            </div>
                                            <span className="px-4 py-1.5 bg-ustp-blue/10 text-ustp-blue text-[10px] font-black uppercase tracking-widest rounded-full">
                                                {currentUser.role} Account
                                            </span>
                                        </div>

                                        <form onSubmit={handleUpdateProfile} className="flex-1 space-y-6">
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 block ml-1">Display Name</label>
                                                    <input
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 text-sm font-semibold text-slate-600 dark:text-slate-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-ustp-blue"
                                                        value={profileName}
                                                        onChange={(e) => setProfileName(e.target.value)}
                                                        placeholder="Enter full name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 block ml-1">Biography / Designations</label>
                                                    <textarea
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 text-sm font-semibold text-slate-600 dark:text-slate-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-ustp-blue min-h-[100px]"
                                                        value={profileBio}
                                                        onChange={(e) => setProfileBio(e.target.value)}
                                                        placeholder="Brief detail about yourself..."
                                                    />
                                                </div>
                                            </div>
                                            <button type="submit" className="btn-premium bg-ustp-blue text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg shadow-blue-200 text-xs w-full md:w-auto">
                                                <Save size={16} /> Update Profile
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'security' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="card-premium p-6 rounded-2xl max-w-xl">
                                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                                        <div className="p-2 bg-red-50 text-red-500 rounded-xl">
                                            <Lock size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Access Control</h3>
                                            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest">Manage login credentials</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleChangePassword} className="space-y-5">
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 block ml-1">Current Password</label>
                                                <input
                                                    type="password"
                                                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 text-sm font-semibold text-slate-600 dark:text-slate-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-ustp-blue"
                                                    value={oldPassword}
                                                    onChange={(e) => setOldPassword(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 block ml-1">New Password</label>
                                                    <input
                                                        type="password"
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 text-sm font-semibold text-slate-600 dark:text-slate-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-ustp-blue"
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 block ml-1">Confirm Password</label>
                                                    <input
                                                        type="password"
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 text-sm font-semibold text-slate-600 dark:text-slate-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-ustp-blue"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <button type="submit" className="w-full btn-premium bg-slate-900 text-white py-3 rounded-xl text-xs shadow-md shadow-slate-200 hover:shadow-lg transition-all">
                                            Update Password
                                        </button>
                                    </form>

                                    <div className="mt-12 pt-8 border-t border-slate-50">
                                        <button
                                            onClick={() => {
                                                localStorage.removeItem('user');
                                                window.location.href = '/login';
                                            }}
                                            className="flex items-center gap-3 text-red-500 font-black text-[10px] uppercase tracking-widest hover:text-red-600 transition-colors"
                                        >
                                            <LogOut size={16} /> Sign out from all devices
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'notifications' && (
                            <div className="card-premium py-20 flex flex-col items-center justify-center text-center opacity-50 animate-in fade-in duration-500">
                                <Shield size={48} className="text-slate-200 mb-4" />
                                <h4 className="font-black text-slate-300 dark:text-slate-600 lowercase uppercase tracking-[0.2em] text-sm">Experimental Section</h4>
                                <p className="text-slate-400 dark:text-slate-500 text-xs font-medium mt-2">System alert configuration is currently under development.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            </div>
        </div>
    );
};

export default StaffSettings;
