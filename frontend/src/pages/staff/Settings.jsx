import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import QRCode from 'react-qr-code';
import { Settings as SettingsIcon, Shield, Clock, QrCode, Bell, Lock, User, Search, Key, AlertTriangle, Save, LogOut } from 'lucide-react';

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
    const [activeSection, setActiveSection] = useState('codes');
    const [searchId, setSearchId] = useState('');
    const [lookupResult, setLookupResult] = useState(null);
    const [loadingLookup, setLoadingLookup] = useState(false);
    const [adminCode, setAdminCode] = useState('');
    const [tickets, setTickets] = useState([]);
    const [violations, setViolations] = useState([]);
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
        { id: 'codes', label: 'Action Codes', icon: QrCode, description: 'Service control QR codes' },
        { id: 'tickets', label: 'Service Hub', icon: Shield, description: 'Manual service override' },
        { id: 'account', label: 'Account', icon: User, description: 'Manage your profile' },
        { id: 'security', label: 'Security', icon: Lock, description: 'Password and access' },
        { id: 'notifications', label: 'Notifications', icon: Bell, description: 'System alerts' },
    ];

    useEffect(() => {
        if (activeSection === 'tickets') {
            fetchAdminData();
            const poll = setInterval(fetchAdminData, 3000);
            return () => clearInterval(poll);
        }
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
                setActionMessage({ text: 'Success!', type: 'success' });
                setAdminCode('');
                handleLookup();
                fetchAdminData();
            } else { setActionMessage({ text: "Failed to sync.", type: 'error' }); }
        } catch (e) { setActionMessage({ text: "Network error.", type: 'error' }); }
        setTimeout(() => setActionMessage({ text: '', type: '' }), 3000);
    };

    return (
        <div className="flex bg-slate-50 min-h-screen relative">
            <Sidebar role="staff" />
            <main className="flex-1 p-4 md:p-10 pt-24 md:pt-10 max-w-7xl mx-auto overflow-y-auto">
                <header className="mb-8 md:mb-12 text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight flex flex-col md:flex-row items-center gap-4">
                        <div className="p-3 bg-ustp-blue/10 rounded-2xl">
                            <SettingsIcon className="text-ustp-blue" size={32} />
                        </div>
                        Admin Command Center
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium italic">Control system logic, service hub overrides, and security protocols.</p>
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

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Navigation Sidebar */}
                    <div className="lg:col-span-1 space-y-3">
                        {sections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`w-full flex items-center gap-4 p-5 rounded-[24px] transition-all duration-300 ${activeSection === section.id
                                    ? 'bg-ustp-blue text-white shadow-xl shadow-blue-200 translate-x-1'
                                    : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100 hover:border-slate-200'
                                    }`}
                            >
                                <div className={`p-2 rounded-xl ${activeSection === section.id ? 'bg-white/20' : 'bg-slate-100'}`}>
                                    <section.icon size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-sm leading-none uppercase tracking-widest">{section.label}</p>
                                    <p className={`text-[10px] mt-1 font-bold ${activeSection === section.id ? 'text-blue-100' : 'text-slate-400'}`}>
                                        {section.description}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="lg:col-span-3">
                        {activeSection === 'codes' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-50">
                                        <div className="p-3 bg-indigo-50 text-indigo-500 rounded-2xl">
                                            <QrCode size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Service Control QR</h3>
                                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Live identification codes</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="bg-emerald-950 p-8 flex flex-col items-center justify-center text-center rounded-[32px] shadow-2xl border-4 border-emerald-800/30 group hover:border-emerald-500 transition-all duration-500">
                                            <h4 className="font-black text-xl uppercase tracking-tighter text-emerald-400 mb-6 flex items-center gap-2">
                                                <Clock size={20} /> Start / Resume
                                            </h4>
                                            <div className="bg-white p-6 rounded-[32px] mb-6 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                                                <QRCode value="OSA-RESUME" size={140} level="H" />
                                            </div>
                                            <div className="bg-emerald-900/50 text-emerald-300 rounded-2xl px-6 py-3 font-mono font-black text-sm border border-emerald-700/50 tracking-widest uppercase">
                                                OSA-RESUME
                                            </div>
                                        </div>

                                        <div className="bg-slate-900 p-8 flex flex-col items-center justify-center text-center rounded-[32px] shadow-2xl border-4 border-slate-800 group hover:border-slate-600 transition-all duration-500">
                                            <h4 className="font-black text-xl uppercase tracking-tighter text-slate-300 mb-6 flex items-center gap-2">
                                                <Clock size={20} /> Pause Service
                                            </h4>
                                            <div className="bg-white p-6 rounded-[32px] mb-6 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                                                <QRCode value="OSA-PAUSE" size={140} level="H" />
                                            </div>
                                            <div className="bg-slate-800/50 text-slate-400 rounded-2xl px-6 py-3 font-mono font-black text-sm border border-slate-700/50 tracking-widest uppercase">
                                                OSA-PAUSE
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'tickets' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="card-premium bg-gradient-to-br from-emerald-50 to-blue-50 border-2 border-emerald-100 flex flex-col md:flex-row items-center gap-8 p-10">
                                    <div className="flex-1">
                                        <h4 className="font-black text-emerald-800 uppercase tracking-[0.2em] text-[10px] mb-2">Manual Service Override</h4>
                                        <h3 className="text-2xl font-black text-slate-900 mb-6">Timer Control Without Devices</h3>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <input
                                                className="flex-1 bg-white border-2 border-emerald-100 rounded-2xl p-4 font-bold outline-none focus:border-emerald-500 shadow-sm"
                                                placeholder="Student ID Number"
                                                value={manualStudentId}
                                                onChange={(e) => setManualStudentId(e.target.value)}
                                            />
                                            <input
                                                type="password"
                                                className="w-full sm:w-40 bg-white border-2 border-emerald-100 rounded-2xl p-4 font-bold outline-none focus:border-emerald-500 shadow-sm"
                                                placeholder="CODE"
                                                value={manualCode}
                                                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                                            />
                                        </div>
                                        <div className="flex gap-3 mt-4">
                                            <button onClick={handleManualTimeIn} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-200">Time In</button>
                                            <button onClick={handleManualTimeOut} className="flex-1 bg-red-500 hover:bg-red-600 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-200">Time Out</button>
                                        </div>
                                        {manualMessage && <p className="mt-4 text-[10px] font-black uppercase text-emerald-600 tracking-widest bg-emerald-100/50 p-2 rounded-lg text-center">{manualMessage}</p>}
                                    </div>
                                    <div className="w-px h-40 bg-emerald-200 hidden md:block" />
                                    <div className="flex flex-col items-center justify-center p-6 bg-white/50 rounded-3xl border border-emerald-100 min-w-[200px]">
                                        <div className="p-4 bg-emerald-600 text-white rounded-2xl mb-3 shadow-lg">
                                            <Shield size={32} />
                                        </div>
                                        <p className="font-black text-slate-900 uppercase tracking-widest text-[10px]">Security Verified</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="card-premium">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="p-2 bg-blue-50 text-ustp-blue rounded-xl">
                                                <Search size={18} />
                                            </div>
                                            <h4 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Manual Student Lookup</h4>
                                        </div>

                                        <div className="flex gap-2 mb-8">
                                            <input
                                                className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-ustp-blue transition-all"
                                                placeholder="Enter ID..."
                                                value={searchId}
                                                onChange={(e) => setSearchId(e.target.value)}
                                            />
                                            <button onClick={handleLookup} disabled={loadingLookup} className="px-6 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase transition-all shadow-lg shadow-slate-200">Lookup</button>
                                        </div>

                                        {lookupResult && lookupResult !== 'Not Found' && (
                                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-in zoom-in">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-10 h-10 bg-blue-50 text-ustp-blue rounded-xl flex items-center justify-center font-black">
                                                        {lookupResult.violation_details?.student_details?.name?.charAt(0)}
                                                    </div>
                                                    <p className="font-black text-slate-900 text-sm uppercase truncate">{lookupResult.violation_details?.student_details?.name}</p>
                                                </div>
                                                <div className="space-y-3">
                                                    <input type="password" placeholder="ADMIN CODE" className="w-full bg-slate-50 p-3 rounded-xl text-center font-black text-xs outline-none focus:bg-white focus:ring-2 ring-ustp-blue/10" value={adminCode} onChange={e => setAdminCode(e.target.value)} />
                                                    <div className="flex gap-2">
                                                        <input type="number" id="deductInput" className="w-20 bg-slate-50 p-3 rounded-xl text-center font-black text-xs outline-none" placeholder="Hrs" />
                                                        <button
                                                            onClick={() => handleSyncLog('custom', parseFloat(document.getElementById('deductInput').value))}
                                                            className="flex-1 bg-ustp-blue text-white rounded-xl font-black text-[10px] uppercase tracking-widest"
                                                        >
                                                            Deduct Time
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="card-premium flex flex-col h-[500px]">
                                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
                                            <h4 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Live Service Hub</h4>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                                <span className="text-[10px] font-black text-emerald-600 uppercase">Live</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                            {violations.filter(v => {
                                                const ticket = tickets.find(t => t.violation_details?.id === v.id || t.violation === v.id);
                                                return ticket && ticket.status !== 'Completed';
                                            }).map(v => {
                                                const ticket = tickets.find(t => t.violation_details?.id === v.id || t.violation === v.id);
                                                const isOngoing = ticket?.status === 'Ongoing';
                                                return (
                                                    <div key={v.id} className={`p-4 rounded-2xl border transition-all ${isOngoing ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                                        <div className="flex justify-between items-center mb-1">
                                                            <p className="font-black text-slate-900 text-xs truncate max-w-[150px] uppercase italic">{v.student_details?.name}</p>
                                                            {isOngoing ? <LiveTimer remainingHours={ticket.remaining_hours} /> : <span className="text-[10px] font-black text-slate-400 uppercase">Paused</span>}
                                                        </div>
                                                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{v.violation_type}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'account' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="card-premium p-10">
                                    <div className="flex flex-col md:flex-row gap-10">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-32 h-32 bg-slate-100 rounded-[40px] flex items-center justify-center border-4 border-white shadow-xl">
                                                <User size={64} className="text-slate-300" />
                                            </div>
                                            <span className="px-4 py-1.5 bg-ustp-blue/10 text-ustp-blue text-[10px] font-black uppercase tracking-widest rounded-full">
                                                {currentUser.role} Account
                                            </span>
                                        </div>

                                        <form onSubmit={handleUpdateProfile} className="flex-1 space-y-6">
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-2">Display Name</label>
                                                    <input
                                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-ustp-blue transition-all"
                                                        value={profileName}
                                                        onChange={(e) => setProfileName(e.target.value)}
                                                        placeholder="Enter full name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-2">Biography / Designations</label>
                                                    <textarea
                                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-ustp-blue transition-all min-h-[120px]"
                                                        value={profileBio}
                                                        onChange={(e) => setProfileBio(e.target.value)}
                                                        placeholder="Brief detail about yourself..."
                                                    />
                                                </div>
                                            </div>
                                            <button type="submit" className="btn-premium bg-ustp-blue text-white px-10 py-4 flex items-center gap-3 shadow-xl shadow-blue-200">
                                                <Save size={18} /> Update Profile
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'security' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="card-premium p-10 max-w-2xl">
                                    <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-50">
                                        <div className="p-3 bg-red-50 text-red-500 rounded-2xl">
                                            <Lock size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Access Control</h3>
                                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Manage login credentials</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleChangePassword} className="space-y-6">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-2">Current Password</label>
                                                <input
                                                    type="password"
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-ustp-blue transition-all"
                                                    value={oldPassword}
                                                    onChange={(e) => setOldPassword(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-2">New Password</label>
                                                    <input
                                                        type="password"
                                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-ustp-blue transition-all"
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-2">Confirm Password</label>
                                                    <input
                                                        type="password"
                                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-ustp-blue transition-all"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <button type="submit" className="w-full btn-premium bg-slate-900 text-white py-5 shadow-xl shadow-slate-200">
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
                                <h4 className="font-black text-slate-300 lowercase uppercase tracking-[0.2em] text-sm">Experimental Section</h4>
                                <p className="text-slate-400 text-xs font-medium mt-2">System alert configuration is currently under development.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StaffSettings;
