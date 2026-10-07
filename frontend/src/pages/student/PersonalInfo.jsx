import { useState } from 'react';
import { useStudentShell } from '../../components/StudentShell';
import { Mail, Phone, UserRound, IdCard, GraduationCap, Building2, Layers, User } from 'lucide-react';
import { studentName } from '../../lib/names';
import { Group, InfoRow } from '../../components/SettingsList';

const postJson = async (url, body) => {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
};

const input = 'w-full rounded-xl border border-[var(--s-border)] bg-[var(--s-bg)] px-3 py-3 text-[15px] text-[var(--s-text)] outline-none placeholder:text-[var(--s-muted)]/60 focus:border-[var(--s-accent)]';
const primaryBtn = 'h-11 flex-1 rounded-xl bg-[var(--s-accent)] text-sm font-bold text-white disabled:opacity-60';
const cancelBtn = 'h-11 flex-1 rounded-xl border border-[var(--s-border)] text-sm font-semibold text-[var(--s-muted)]';
const yearText = (y) => {
    if (!/^\d+$/.test(y || '')) return y;
    const n = Number(y);
    return `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] || 'th'} Year`;
};
const changeBtn = 'shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-[var(--s-accent)] hover:bg-[var(--s-accent-soft)]';

// Email and contact number, each with a "Change" form. A new email only saves after the 6-digit code sent
// to it is entered. Both ask for the current password. Mirrors mobile/app/student/personal-info.jsx.
const ContactDetails = ({ studentInfo, onUpdated }) => {
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

    return (
        <Group label="Contact details">
            {message.text && (
                <p role="status" className={`mx-4 mt-3 rounded-lg px-3 py-2.5 text-center text-xs font-bold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{message.text}</p>
            )}
            <div>
                <InfoRow icon={Mail} label="Email" value={studentInfo.email} action={editing !== 'email' && <button onClick={() => open('email')} className={changeBtn}>Change</button>} />
                {editing === 'email' && (
                    !codeSentTo ? (
                        <form onSubmit={sendEmailCode} className="space-y-3 px-4 pb-4">
                            <input required type="email" autoComplete="email" placeholder="New email" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={input} />
                            <input required type="password" autoComplete="current-password" placeholder="Current password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={input} />
                            <div className="flex gap-2">
                                <button type="button" onClick={close} className={cancelBtn}>Cancel</button>
                                <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'Sending…' : 'Send code'}</button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={confirmEmail} className="space-y-3 px-4 pb-4">
                            <p className="text-xs text-[var(--s-muted)]">Enter the 6-digit code sent to <span className="font-bold text-[var(--s-text)]">{codeSentTo}</span>. It expires in 5 minutes. Check Spam / Junk too.</p>
                            <input required inputMode="numeric" maxLength={6} placeholder="6-digit code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.replace(/\D/g, '') })} className={`${input} text-center tracking-[0.4em]`} />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setCodeSentTo('')} className={cancelBtn}>Back</button>
                                <button type="submit" disabled={busy || form.code.length < 6} className={primaryBtn}>{busy ? 'Verifying…' : 'Verify & save'}</button>
                            </div>
                        </form>
                    )
                )}
            </div>
            <div className="border-t border-[var(--s-border)]">
                <InfoRow icon={Phone} label="Contact number" value={studentInfo.contact_number} action={editing !== 'contact' && <button onClick={() => open('contact')} className={changeBtn}>Change</button>} />
                {editing === 'contact' && (
                    <form onSubmit={saveContact} className="space-y-3 px-4 pb-4">
                        <input required type="tel" inputMode="numeric" maxLength={11} placeholder="New contact number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value.replace(/\D/g, '').slice(0, 11) })} className={input} />
                        <input required type="password" autoComplete="current-password" placeholder="Current password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={input} />
                        <div className="flex gap-2">
                            <button type="button" onClick={close} className={cancelBtn}>Cancel</button>
                            <button type="submit" disabled={busy || form.value.length !== 11} className={primaryBtn}>{busy ? 'Saving…' : 'Save'}</button>
                        </div>
                    </form>
                )}
            </div>
        </Group>
    );
};

const PersonalInfoBody = () => {
    const { profile, setProfile } = useStudentShell();
    if (!profile) {
        return (
            <div className="flex justify-center py-20">
                <span className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--s-accent)] border-t-transparent" />
            </div>
        );
    }
    return (
        <main className="mx-auto w-full max-w-xl px-4 pb-10 pt-4">
            <Group label="Basic information">
                <InfoRow icon={UserRound} label="Name" value={studentName(profile)} />
                <InfoRow icon={IdCard} label="Student ID" value={profile.student_id} />
                <InfoRow icon={GraduationCap} label="Course" value={profile.course} />
                <InfoRow icon={Building2} label="College" value={profile.department} />
                <InfoRow icon={Layers} label="Year level" value={yearText(profile.year_level)} />
                <InfoRow icon={User} label="Gender" value={profile.gender} />
            </Group>
            <ContactDetails studentInfo={profile} onUpdated={(changes) => setProfile((p) => ({ ...p, ...changes }))} />
            <p className="px-1 text-xs text-[var(--s-muted)]">Wrong name, course or college? Visit the OSA office to have it corrected.</p>
        </main>
    );
};

export default PersonalInfoBody;
