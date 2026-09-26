import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { User, Mail, Phone, BookOpen, Building2, Lock, ArrowLeft, LogOut, AlertTriangle, Moon, CircleHelp, ChevronRight } from 'lucide-react';
import { useStudentTheme } from '../../components/useStudentTheme';
import { logoutStudent } from '../../components/studentSession';

// Mirrors mobile/app/student/settings.jsx
const Settings = () => {
    const navigate = useNavigate();
    const { isDarkMode, themeMode, changeTheme } = useStudentTheme();
    const [studentInfo, setStudentInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
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

    // Stops a running service timer first (hours served so far are kept)
    const logout = async () => {
        setLoggingOut(true);
        await logoutStudent(navigate);
    };

    const theme = isDarkMode ? 'dark' : 'light';

    if (loading) {
        return (
            <div className="student-ui flex items-center justify-center" data-theme={theme}>
                <span className="h-9 w-9 animate-spin rounded-full border-4 border-[var(--s-primary)] border-t-transparent" />
            </div>
        );
    }

    if (!studentInfo) {
        return (
            <div className="student-ui flex items-center justify-center" data-theme={theme}>
                <p className="text-sm font-bold text-[var(--s-muted)]">Profile not found. Please contact administration.</p>
            </div>
        );
    }

    const cardTitle = 'ml-3 text-xs font-black uppercase tracking-[2px] text-[var(--s-primary)]';
    const infoLabel = 'mb-1 text-[10px] font-black uppercase tracking-[1px] text-[var(--s-muted)]';
    const infoValue = 'text-lg font-bold text-[var(--s-text)] break-words';
    const infoValueSmall = 'text-sm font-bold uppercase text-[var(--s-text)]';

    return (
        <div className="student-ui" data-theme={theme}>
            <div className="mx-auto w-full max-w-xl">
                {/* Header */}
                <header className="flex items-center justify-between px-5 py-4">
                    <button onClick={() => navigate('/student/dashboard')} aria-label="Back" className="p-1 text-[var(--s-text)]">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-lg font-bold text-[var(--s-text)]">Profile Settings</h1>
                    <span className="w-6" />
                </header>

                <main className="px-4 pb-10">
                    {/* QR Code Card */}
                    <section className="mb-5 flex flex-col items-center rounded-3xl border-2 border-[var(--s-bg)] bg-[var(--s-card)] p-6 text-center shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
                        <div className="mb-5 rounded-3xl bg-white p-3 shadow-[0_4px_12px_rgba(30,58,138,0.15)]">
                            <QRCode value={studentInfo.student_id} size={160} fgColor={isDarkMode ? '#0f172a' : '#000'} bgColor="#fff" />
                        </div>
                        <h2 className="mb-1 text-2xl font-black text-[var(--s-text)]">{studentInfo.name}</h2>
                        <p className="mb-4 text-sm font-black uppercase tracking-[2px] text-[var(--s-primary)]">{studentInfo.student_id}</p>
                        <p className="px-2 text-xs text-[var(--s-muted)]">
                            Present this personalized QR code to campus guards for instant violation registration or service hub scanning.
                        </p>
                    </section>

                    {/* Basic Information */}
                    <section className="mb-4 rounded-2xl border-2 border-[var(--s-border)] bg-[var(--s-card)] p-5">
                        <div className="mb-5 flex items-center">
                            <User size={18} className="text-[var(--s-primary)]" />
                            <span className={cardTitle}>Basic Information</span>
                        </div>
                        <div className="mb-4">
                            <p className={infoLabel}>Full Identity Name</p>
                            <p className={infoValue}>{studentInfo.name}</p>
                        </div>
                        <div className="flex justify-between gap-4">
                            <div className="mb-4 flex-1">
                                <p className={`${infoLabel} flex items-center gap-1.5`}><BookOpen size={12} /> Course</p>
                                <p className={infoValueSmall}>{studentInfo.course || 'N/A'}</p>
                            </div>
                            <div className="mb-4 flex-1">
                                <p className={`${infoLabel} flex items-center gap-1.5`}><Building2 size={12} /> Department</p>
                                <p className={infoValueSmall}>{studentInfo.department || 'N/A'}</p>
                            </div>
                        </div>
                    </section>

                    {/* Contact Details */}
                    <section className="mb-4 rounded-2xl border-2 border-[var(--s-border)] bg-[var(--s-card)] p-5">
                        <div className="mb-5 flex items-center">
                            <Mail size={18} className="text-[var(--s-primary)]" />
                            <span className={cardTitle}>Contact Details</span>
                        </div>
                        <div className="mb-4">
                            <p className={infoLabel}>Institutional Email</p>
                            <p className={infoValue}>{studentInfo.email || 'N/A'}</p>
                        </div>
                        <div className="mb-4">
                            <p className={`${infoLabel} flex items-center gap-1.5`}><Phone size={12} /> Primary Contact</p>
                            <p className={infoValue}>{studentInfo.contact_number || 'N/A'}</p>
                        </div>
                    </section>

                    {/* Appearance */}
                    <section className="mb-4 rounded-2xl border-2 border-[var(--s-border)] bg-[var(--s-card)] p-5">
                        <div className="mb-5 flex items-center">
                            <Moon size={18} className="text-[var(--s-primary)]" />
                            <span className={cardTitle}>Appearance</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className={infoValueSmall}>Dark Mode</p>
                                <p className="mt-0.5 text-[10px] font-black tracking-[1px] text-[var(--s-muted)]">
                                    {themeMode === 'system' ? 'Syncs with system settings' : 'Manually enabled'}
                                </p>
                            </div>
                            <button
                                role="switch"
                                aria-checked={isDarkMode}
                                aria-label="Dark mode"
                                onClick={() => changeTheme(isDarkMode ? 'light' : 'dark')}
                                className={`relative h-[31px] w-[51px] rounded-full transition-colors ${isDarkMode ? 'bg-[var(--s-success)]' : 'bg-[var(--s-border)]'}`}
                            >
                                <span className={`absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-all ${isDarkMode ? 'left-[22px]' : 'left-[2px]'}`} />
                            </button>
                        </div>
                    </section>

                    <PasswordChangeSection studentId={studentInfo.student_id} cardTitle={cardTitle} infoLabel={infoLabel} />

                    {/* Same "Help & Support" row as the mobile app's Profile Settings */}
                    <button
                        onClick={() => navigate('/help')}
                        className="mb-4 flex w-full items-center rounded-2xl border-2 border-[var(--s-border)] bg-[var(--s-card)] p-4 text-left"
                    >
                        <CircleHelp size={20} className="shrink-0 text-[var(--s-primary)]" />
                        <span className="ml-3 flex-1">
                            <span className="block text-sm font-bold text-[var(--s-text)]">Help &amp; Support</span>
                            <span className="mt-0.5 block text-xs text-[var(--s-muted)]">FAQ, penalties, troubleshooting, and contact info</span>
                        </span>
                        <ChevronRight size={18} className="shrink-0 text-[var(--s-muted)]" />
                    </button>

                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="mt-2 flex w-full items-center justify-center rounded-2xl border-2 border-[var(--s-danger)] bg-[var(--s-card)] p-4"
                    >
                        <LogOut size={20} className="text-[var(--s-danger)]" />
                        <span className="ml-2 text-sm font-black uppercase tracking-[1px] text-[var(--s-danger)]">Log Out</span>
                    </button>
                </main>
            </div>

            {showLogoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5">
                    <div className="w-full max-w-[400px] rounded-3xl bg-[var(--s-card)] p-6">
                        <div className="mb-3 flex items-center">
                            <AlertTriangle size={24} className="text-[var(--s-danger)]" />
                            <h3 className="ml-2 text-lg font-black uppercase tracking-[1px] text-[var(--s-danger)]">Log Out</h3>
                        </div>
                        <p className="mb-6 text-sm leading-5 text-[var(--s-text)]">Are you sure you want to log out? A running service timer will stop.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowLogoutModal(false)} className="flex-1 rounded-xl bg-[var(--s-bg)] p-3.5 font-bold text-[var(--s-muted)]">
                                Cancel
                            </button>
                            <button onClick={logout} disabled={loggingOut} className="flex-1 rounded-xl bg-[var(--s-danger)] p-3.5 text-sm font-bold text-white disabled:opacity-60">
                                {loggingOut ? 'Logging out…' : 'Log Out'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const PasswordChangeSection = ({ studentId, cardTitle, infoLabel }) => {
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
        } catch {
            setMessage({ type: 'error', text: 'Connection failure' });
        } finally {
            setLoading(false);
        }
    };

    const input = 'w-full rounded-lg border border-[var(--s-border)] bg-[var(--s-bg)] p-3 font-semibold text-[var(--s-text)] outline-none placeholder:text-[var(--s-muted)] focus:border-[var(--s-primary)]';
    const fields = [
        ['current', 'Current Password'],
        ['new', 'New Password'],
        ['confirm', 'Confirm New Password'],
    ];

    return (
        <section className="mb-4 rounded-2xl border-2 border-[var(--s-border)] bg-[var(--s-card)] p-5">
            <div className="mb-5 flex items-center">
                <Lock size={18} className="text-[var(--s-primary)]" />
                <span className={cardTitle}>Security Settings</span>
            </div>

            {message.text && (
                <div className={`mb-4 rounded-lg border p-3 text-center text-xs font-bold ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-red-200 bg-red-50 text-red-600'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleChangePassword}>
                {fields.map(([key, label]) => (
                    <div key={key} className="mb-4">
                        <label className={`${infoLabel} block`}>{label}</label>
                        <input
                            required
                            type="password"
                            value={passwords[key]}
                            onChange={(e) => setPasswords({ ...passwords, [key]: e.target.value })}
                            className={input}
                            placeholder="••••••••"
                        />
                    </div>
                ))}
                <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 h-12 w-full rounded-lg bg-[var(--s-secondary)] text-[10px] font-bold uppercase tracking-[2px] text-white disabled:opacity-70"
                >
                    {loading ? 'Updating...' : 'Update Password'}
                </button>
            </form>
        </section>
    );
};

export default Settings;
