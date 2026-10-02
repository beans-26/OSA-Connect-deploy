import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useStudentShell } from '../../components/StudentShell';

// Settings > Change password (mirrors mobile/app/student/change-password.jsx)
const PasswordForm = () => {
    const { user } = useStudentShell();
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const submit = async (e) => {
        e.preventDefault();
        if (passwords.new.length < 8) return setMessage({ type: 'error', text: 'The new password needs at least 8 characters.' });
        if (passwords.new !== passwords.confirm) return setMessage({ type: 'error', text: "The new passwords don't match." });
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const response = await fetch('/api/students/change_password/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_id: user.username, current_password: passwords.current, new_password: passwords.new }),
            });
            const data = await response.json().catch(() => ({}));
            if (response.ok) {
                setMessage({ type: 'success', text: 'Password updated.' });
                setPasswords({ current: '', new: '', confirm: '' });
            } else {
                setMessage({ type: 'error', text: data.error || "Couldn't update the password." });
            }
        } catch {
            setMessage({ type: 'error', text: "Can't reach the server. Check your connection." });
        } finally {
            setLoading(false);
        }
    };

    const fields = [
        ['current', 'Current password', 'current-password'],
        ['new', 'New password (at least 8 characters)', 'new-password'],
        ['confirm', 'Confirm new password', 'new-password'],
    ];
    return (
        <main className="mx-auto w-full max-w-xl px-4 pb-10 pt-4">
            <form onSubmit={submit} className="rounded-2xl border border-[var(--s-border)] bg-[var(--s-card)] p-4">
                {message.text && (
                    <p role="status" className={`mb-3 rounded-lg px-3 py-2.5 text-center text-xs font-bold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{message.text}</p>
                )}
                {fields.map(([key, label, autoComplete]) => (
                    <label key={key} className="mb-3 block">
                        <span className="mb-1 block text-xs text-[var(--s-muted)]">{label}</span>
                        <input
                            required
                            type={show ? 'text' : 'password'}
                            autoComplete={autoComplete}
                            value={passwords[key]}
                            onChange={(e) => setPasswords({ ...passwords, [key]: e.target.value })}
                            className="w-full rounded-xl border border-[var(--s-border)] bg-[var(--s-bg)] px-3 py-3 text-[15px] text-[var(--s-text)] outline-none focus:border-[var(--s-accent)]"
                        />
                    </label>
                ))}
                <button type="button" onClick={() => setShow(!show)} className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-[var(--s-accent)]">
                    {show ? <EyeOff size={14} /> : <Eye size={14} />} {show ? 'Hide passwords' : 'Show passwords'}
                </button>
                <button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-[var(--s-accent)] text-sm font-bold text-white disabled:opacity-60">
                    {loading ? 'Updating…' : 'Update password'}
                </button>
            </form>
        </main>
    );
};

export default PasswordForm;
