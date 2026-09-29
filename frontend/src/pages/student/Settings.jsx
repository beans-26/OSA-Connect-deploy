import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    // Whether a service timer is running: only then does the log-out question mention it
    const [timerRunning, setTimerRunning] = useState(false);
    const openLogout = async () => {
        let running = true; // can't check (offline): keep the warning
        try {
            const response = await fetch(`/api/etickets/?student_id=${encodeURIComponent(user.username)}`);
            if (response.ok) running = (await response.json()).some((t) => t.status === 'Ongoing');
        } catch { /* keep the warning */ }
        setTimerRunning(running);
        setShowLogoutModal(true);
    };
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
                        <div className="mb-4">
                            <p className={infoLabel}>Student ID</p>
                            <p className={infoValue}>{studentInfo.student_id}</p>
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

                    <ContactDetailsSection
                        studentInfo={studentInfo}
                        onUpdated={(changes) => setStudentInfo((prev) => ({ ...prev, ...changes }))}
                        cardTitle={cardTitle}
                        infoLabel={infoLabel}
                        infoValue={infoValue}
                    />

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
                        onClick={openLogout}
                        className="mt-2 flex w-full items-center justify-center rounded-2xl border-2 border-[var(--s-danger)] bg-[var(--s-card)] p-4"
                    >
                        <LogOut size={20} className="text-[var(--s-danger)]" />
                        <span className="ml-2 text-sm font-black uppercase tracking-[1px] text-[var(--s-danger)]">Log Out</span>
                    </button>
                </main>
            </div>

            {showLogoutModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]"
                    onClick={() => setShowLogoutModal(false)}
                >
                    <div 
                        className="w-full max-w-[260px] rounded-xl bg-[var(--s-card)] p-4 shadow-lg border border-[var(--s-border)] text-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="text-sm font-semibold text-[var(--s-text)]">Log out?</p>
                        <p className="mt-1 text-xs text-[var(--s-muted)]">
                            {timerRunning ? 'Your running service timer will stop.' : 'Are you sure you want to log out of your account?'}
                        </p>
                        <div className="mt-3 flex gap-2">
                            <button 
                                onClick={() => setShowLogoutModal(false)} 
                                className="flex-1 rounded-lg border border-[var(--s-border)] py-2 text-xs font-medium text-[var(--s-muted)] hover:bg-[var(--s-bg)] transition-colors active:scale-95 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={logout} 
                                disabled={loggingOut} 
                                className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-700 py-2 text-xs font-medium text-white active:scale-95 transition-colors disabled:opacity-60 cursor-pointer"
                            >
                                {loggingOut ? 'Logging out…' : 'Log Out'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const postJson = async (url, body) => {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
};

// Email and contact number, each with a "Change" form. A new email only saves after the 6-digit
// code sent to it is entered. Both ask for the current password. Mirrors mobile/app/student/settings.jsx.
const ContactDetailsSection = ({ studentInfo, onUpdated, cardTitle, infoLabel, infoValue }) => {
    const [editing, setEditing] = useState(null); // 'email' | 'contact' | null
    const [form, setForm] = useState({ value: '', password: '', code: '' });
    const [codeSentTo, setCodeSentTo] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const open = (field) => {
        setEditing(field);
        setForm({ value: '', password: '', code: '' });
        setCodeSentTo('');
        setMessage({ type: '', text: '' });
    };
    const close = () => setEditing(null);

    const run = async (action) => {
        setBusy(true);
        setMessage({ type: '', text: '' });
        try {
            await action();
        } catch {
            setMessage({ type: 'error', text: "Can't reach the server. Check your connection." });
        } finally {
            setBusy(false);
        }
    };

    const sendEmailCode = (e) => {
        e.preventDefault();
        run(async () => {
            const { ok, data } = await postJson('/api/students/request_email_change/', {
                student_id: studentInfo.student_id, current_password: form.password, new_email: form.value.trim(),
            });
            if (!ok) return setMessage({ type: 'error', text: data.error || "Couldn't send the code." });
            setCodeSentTo(form.value.trim().toLowerCase());
            setMessage({ type: 'success', text: data.message || 'Code sent.' });
        });
    };

    const confirmEmail = (e) => {
        e.preventDefault();
        run(async () => {
            const { ok, data } = await postJson('/api/students/confirm_email_change/', {
                student_id: studentInfo.student_id, new_email: codeSentTo, otp: form.code.trim(),
            });
            if (!ok) return setMessage({ type: 'error', text: data.error || "Couldn't verify the code." });
            onUpdated({ email: data.email });
            close();
            setMessage({ type: 'success', text: 'Email updated.' });
        });
    };

    const saveContact = (e) => {
        e.preventDefault();
        run(async () => {
            const { ok, data } = await postJson('/api/students/update_contact/', {
                student_id: studentInfo.student_id, current_password: form.password, contact_number: form.value,
            });
            if (!ok) return setMessage({ type: 'error', text: data.error || "Couldn't update the number." });
            onUpdated({ contact_number: data.contact_number });
            close();
            setMessage({ type: 'success', text: 'Contact number updated.' });
        });
    };

    const input = 'w-full rounded-lg border border-[var(--s-border)] bg-[var(--s-bg)] p-3 font-semibold text-[var(--s-text)] outline-none placeholder:text-slate-400/40 focus:border-[var(--s-primary)]';
    const primaryBtn = 'h-11 flex-1 rounded-lg bg-[var(--s-primary)] text-[10px] font-bold uppercase tracking-[2px] text-white disabled:opacity-60';
    const cancelBtn = 'h-11 flex-1 rounded-lg bg-[var(--s-bg)] text-[10px] font-bold uppercase tracking-[2px] text-[var(--s-muted)]';
    const changeBtn = 'shrink-0 rounded-lg border border-[var(--s-border)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[1px] text-[var(--s-primary)]';

    return (
        <section className="mb-4 rounded-2xl border-2 border-[var(--s-border)] bg-[var(--s-card)] p-5">
            <div className="mb-5 flex items-center">
                <Mail size={18} className="text-[var(--s-primary)]" />
                <span className={cardTitle}>Contact Details</span>
            </div>

            {message.text && (
                <div className={`mb-4 rounded-lg border p-3 text-center text-xs font-bold ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-red-200 bg-red-50 text-red-600'}`}>
                    {message.text}
                </div>
            )}

            <div className="mb-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className={infoLabel}>Institutional Email</p>
                        <p className={infoValue}>{studentInfo.email || 'N/A'}</p>
                    </div>
                    {editing !== 'email' && <button onClick={() => open('email')} className={changeBtn}>Change</button>}
                </div>
                {editing === 'email' && (
                    !codeSentTo ? (
                        <form onSubmit={sendEmailCode} className="mt-3 space-y-3">
                            <input required type="email" autoComplete="email" placeholder="New Email" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={input} />
                            <input required type="password" autoComplete="current-password" placeholder="Current Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={input} />
                            <div className="flex gap-2">
                                <button type="button" onClick={close} className={cancelBtn}>Cancel</button>
                                <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'Sending…' : 'Send Code'}</button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={confirmEmail} className="mt-3 space-y-3">
                            <p className="text-xs text-[var(--s-muted)]">Enter the 6-digit code sent to <span className="font-bold text-[var(--s-text)]">{codeSentTo}</span>. It expires in 5 minutes.</p>
                            <input required inputMode="numeric" maxLength={6} placeholder="6-Digit Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.replace(/\D/g, '') })} className={`${input} text-center tracking-[0.4em]`} />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setCodeSentTo('')} className={cancelBtn}>Back</button>
                                <button type="submit" disabled={busy || form.code.length < 6} className={primaryBtn}>{busy ? 'Verifying…' : 'Verify & Save'}</button>
                            </div>
                        </form>
                    )
                )}
            </div>

            <div>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className={`${infoLabel} flex items-center gap-1.5`}><Phone size={12} /> Primary Contact</p>
                        <p className={infoValue}>{studentInfo.contact_number || 'N/A'}</p>
                    </div>
                    {editing !== 'contact' && <button onClick={() => open('contact')} className={changeBtn}>Change</button>}
                </div>
                {editing === 'contact' && (
                    <form onSubmit={saveContact} className="mt-3 space-y-3">
                        <input required type="tel" inputMode="numeric" maxLength={11} placeholder="New Contact Number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value.replace(/\D/g, '').slice(0, 11) })} className={input} />
                        <input required type="password" autoComplete="current-password" placeholder="Current Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={input} />
                        <div className="flex gap-2">
                            <button type="button" onClick={close} className={cancelBtn}>Cancel</button>
                            <button type="submit" disabled={busy || form.value.length !== 11} className={primaryBtn}>{busy ? 'Saving…' : 'Save'}</button>
                        </div>
                    </form>
                )}
            </div>
        </section>
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
