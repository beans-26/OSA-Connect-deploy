import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import QRCode from 'react-qr-code';
import { User, Mail, Phone, BookOpen, Building2, Lock } from 'lucide-react';

const Settings = () => {
    const [studentInfo, setStudentInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        const fetchStudentInfo = async () => {
            if (!user.username) return;
            try {
                const response = await fetch(`/api/students/${user.username}/`);
                if (response.ok) {
                    const data = await response.json();
                    setStudentInfo(data);
                }
            } catch (error) {
                console.error('Failed to fetch student profile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStudentInfo();
    }, [user.username]);

    if (loading) {
        return (
            <div className="flex bg-slate-50 min-h-screen">
                <Sidebar role="student" />
                <main className="flex-1 p-4 sm:p-6 lg:p-10 flex items-center justify-center mobile-top-spacer">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </main>
            </div>
        );
    }

    if (!studentInfo) {
        return (
            <div className="flex bg-slate-50 min-h-screen">
                <Sidebar role="student" />
                <main className="flex-1 p-4 sm:p-6 lg:p-10 flex items-center justify-center mobile-top-spacer">
                    <p className="text-slate-500 font-bold text-sm sm:text-base">Profile not found. Please contact administration.</p>
                </main>
            </div>
        );
    }

    return (
        <div className="flex bg-slate-50 min-h-screen">
            <Sidebar role="student" />
            <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto overflow-y-auto mobile-top-spacer">
                <header className="mb-6 sm:mb-8 lg:mb-10">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Account Settings</h1>
                    <p className="text-slate-500 mt-1 font-medium italic text-sm sm:text-base">Manage your personal identification</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                    {/* QR Code Card */}
                    <div className="card-premium flex flex-col items-center justify-center p-8 sm:p-10 lg:p-12 text-center bg-white border-2 border-slate-100 shadow-xl">
                        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[32px] shadow-2xl shadow-blue-900/10 mb-6 sm:mb-8 border-4 border-slate-50">
                            <QRCode
                                value={studentInfo.student_id}
                                size={160}
                                level="H"
                                className="mx-auto w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] lg:w-[200px] lg:h-[200px]"
                            />
                        </div>
                        <h3 className="font-black text-xl sm:text-2xl text-slate-900 tracking-tight">{studentInfo.name}</h3>
                        <p className="text-blue-600 font-black tracking-widest text-xs sm:text-sm mt-1 mb-3 sm:mb-4 uppercase">{studentInfo.student_id}</p>
                        <p className="text-sm font-medium text-slate-400 max-w-[250px] px-2">
                            Present this personalized QR code to campus guards for instant violation registration or service hub scanning.
                        </p>
                    </div>

                    {/* Information Card */}
                    <div className="space-y-4 sm:space-y-6">
                        <div className="card-premium bg-white p-6 sm:p-8 overflow-hidden relative border-2 border-slate-100 shadow-sm">
                            <h4 className="font-black text-xs sm:text-sm uppercase tracking-[0.2em] text-blue-600 mb-6 sm:mb-8 flex items-center gap-3">
                                <User size={18} /> Basic Information
                            </h4>

                            <div className="space-y-4 sm:space-y-6">
                                <div>
                                    <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1">Full Identity Name</p>
                                    <p className="font-bold text-slate-800 text-lg sm:text-xl tracking-tight">{studentInfo.name}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                                    <div>
                                        <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1 flex items-center gap-2"><BookOpen size={12} /> Course</p>
                                        <p className="font-bold text-slate-800 uppercase text-sm sm:text-base">{studentInfo.course || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1 flex items-center gap-2"><Building2 size={12} /> Department</p>
                                        <p className="font-bold text-slate-800 uppercase text-sm sm:text-base">{studentInfo.department || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card-premium bg-white p-6 sm:p-8 border-2 border-slate-100 shadow-sm">
                            <h4 className="font-black text-xs sm:text-sm uppercase tracking-[0.2em] text-slate-800 mb-6 sm:mb-8 flex items-center gap-3">
                                <Mail size={18} className="text-blue-600" /> Contact Details
                            </h4>

                            <div className="space-y-4 sm:space-y-6">
                                <div>
                                    <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1">Institutional Email</p>
                                    <p className="font-bold text-slate-800 text-base sm:text-lg break-all">{studentInfo.email || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1 flex items-center gap-2"><Phone size={12} /> Primary Contact</p>
                                    <p className="font-bold text-slate-800 text-base sm:text-lg">{studentInfo.contact_number || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Change Password Card */}
                    <div className="lg:col-span-2">
                        <PasswordChangeSection studentId={studentInfo.student_id} />
                    </div>
                </div>
            </main>
        </div>
    );
};

const PasswordChangeSection = ({ studentId }) => {
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const response = await fetch('/api/students/change_password/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: studentId,
                    current_password: passwords.current,
                    new_password: passwords.new
                })
            });
            const data = await response.json();
            if (response.ok) {
                setMessage({ type: 'success', text: 'Password updated successfully!' });
                setPasswords({ current: '', new: '', confirm: '' });
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to update password' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Connection failure' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card-premium bg-white p-6 sm:p-8 border-2 border-slate-100 shadow-sm mt-6">
            <h4 className="font-black text-xs sm:text-sm uppercase tracking-[0.2em] text-slate-800 mb-6 flex items-center gap-3">
                <Lock size={18} className="text-blue-600" /> Security Settings
            </h4>

            {message.text && (
                <div className={`mb-6 p-4 rounded-lg border text-center font-bold text-[10px] uppercase tracking-widest ${message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
                    <input required type="password" value={passwords.current} onChange={(e) => setPasswords({...passwords, current: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none font-semibold text-slate-700 focus:bg-white focus:border-blue-600 transition-none text-sm" placeholder="••••••••" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                    <input required type="password" value={passwords.new} onChange={(e) => setPasswords({...passwords, new: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none font-semibold text-slate-700 focus:bg-white focus:border-blue-600 transition-none text-sm" placeholder="••••••••" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                    <div className="flex gap-4">
                        <input required type="password" value={passwords.confirm} onChange={(e) => setPasswords({...passwords, confirm: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none font-semibold text-slate-700 focus:bg-white focus:border-blue-600 transition-none text-sm" placeholder="••••••••" />
                        <button type="submit" disabled={loading} className="bg-blue-900 text-white px-6 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-colors whitespace-nowrap shadow-lg shadow-blue-900/10">
                            {loading ? 'Updating...' : 'Update'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default Settings;
