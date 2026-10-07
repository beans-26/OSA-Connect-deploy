import { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import ThemeToggle from '../../components/ThemeToggle';
import usePolling from '../../lib/usePolling';
import { Check, GraduationCap, Loader2, Mail, MailPlus, Search, UserPlus, UserX } from 'lucide-react';

// Admin > Faculty Accounts: OSA confirms who is really USTP faculty (backend faculty_accounts).
//  - Reported without an account: confirming the email sends them a link to finish an account (active at once).
//  - Created an account: confirming activates it (they can log in; an email tells them).

const TONE = {
    unconfirmed: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    invited: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
    verified: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
};
const LABEL = { unconfirmed: 'To confirm', pending: 'To confirm', invited: 'Link sent', verified: 'Active', rejected: 'Rejected' };
const when = (iso) => (iso ? new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
const fullName = (r) => [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email;

const Row = ({ row, sub, actions }) => (
    <li className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                <GraduationCap size={18} />
            </div>
            <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                    {fullName(row)}
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${TONE[row.status]}`}>{LABEL[row.status]}</span>
                </p>
                <p className="flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400"><Mail size={12} /> {row.email}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">{sub} · {row.reports} report{row.reports === 1 ? '' : 's'} filed</p>
            </div>
        </div>
        <div className="flex shrink-0 gap-2">{actions}</div>
    </li>
);

const Section = ({ icon: Icon, title, hint, children, empty }) => (
    <section className="card-premium p-4 md:p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200"><Icon size={16} className="text-ustp-blue" /> {title}</h2>
        <p className="mb-4 mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
        {empty ? <p className="rounded-xl border-2 border-dashed border-slate-100 py-8 text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:border-slate-700">{empty}</p> : <ul className="space-y-2">{children}</ul>}
    </section>
);

export default function FacultyAccounts() {
    const [data, setData] = useState({ accounts: [], emails: [] });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [busy, setBusy] = useState(null);

    const load = async () => {
        try {
            const r = await fetch('/api/admin/faculty/');
            if (r.ok) setData(await r.json());
        } catch { /* keeps the last list */ } finally {
            setLoading(false);
        }
    };
    usePolling(load, 30000);

    const decide = async (key, url, body, done) => {
        setBusy(key);
        try {
            const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const res = await r.json().catch(() => ({}));
            if (!r.ok) { alert(res.error || 'Something went wrong. Please try again.'); return; }
            if (done) done(res);
            await load();
        } catch {
            alert("Can't reach the server. Please try again.");
        } finally {
            setBusy(null);
        }
    };
    const confirmEmail = (row) => decide(row.email, '/api/admin/faculty/email/', { email: row.email, decision: 'confirm' },
        (res) => !res.emailed && alert(`Confirmed, but the email to ${row.email} couldn't be sent. Check the email settings.`));
    // Rejecting is how cases get dismissed: that person's reports still waiting for review go to Archives > Dismissed
    const dismissedNote = (res) => res.dismissed && alert(`${res.dismissed} pending report${res.dismissed === 1 ? ' was' : 's were'} dismissed and moved to Archives → Dismissed.`);
    const rejectEmail = (row) => window.confirm(`Reject ${row.email}? They won't get a link to make an account, and their pending reports are dismissed.`)
        && decide(row.email, '/api/admin/faculty/email/', { email: row.email, decision: 'reject' }, dismissedNote);
    const decideAccount = (row, decision) => (decision === 'verify' || window.confirm(`Reject ${fullName(row)}? They won't be able to log in, and their pending reports are dismissed.`))
        && decide(row.username, `/api/admin/faculty/${encodeURIComponent(row.username)}/decision/`, { decision }, dismissedNote);

    const q = search.trim().toLowerCase();
    const match = (r) => !q || fullName(r).toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
    const emails = data.emails.filter(match);
    const accounts = data.accounts.filter(match);
    const button = 'flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-60';

    return (
        <div className="flex bg-slate-50 dark:bg-slate-900 min-h-screen relative font-sans">
            <Sidebar role="admin" />
            <div className="flex-1 h-screen overflow-y-auto custom-scrollbar w-full">
                <main className="page-enter flex-1 px-4 pt-[76px] pb-8 md:p-10 lg:pt-10 w-full max-w-full space-y-6">
                    <header className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Faculty Accounts</h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium text-sm">Check each person against your faculty records, then confirm or reject them.</p>
                        </div>
                        <ThemeToggle />
                    </header>

                    <div className="relative w-full md:max-w-sm">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email"
                            className="w-full rounded-xl border-2 border-slate-100 bg-white py-2.5 pl-10 pr-3 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:border-ustp-blue focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                    </div>

                    {loading ? (
                        <div className="py-16 text-center"><Loader2 className="mx-auto animate-spin text-ustp-blue" size={32} /></div>
                    ) : (
                        <>
                            <Section icon={MailPlus} title="Reported without an account"
                                hint="The name is read from the email. Their reports are on hold until you decide: Confirm sends them a link to finish an account; Reject dismisses their pending reports."
                                empty={emails.length ? null : (q ? 'No emails match' : 'No emails to confirm')}>
                                {emails.map((row) => (
                                    <Row key={row.email} row={row} sub={`First report ${when(row.first_report_at)}`} actions={(
                                        <>
                                            {row.status !== 'invited' && (
                                                <button onClick={() => confirmEmail(row)} disabled={busy === row.email} className={`${button} bg-emerald-500 text-white hover:bg-emerald-600`}>
                                                    {busy === row.email ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Confirm
                                                </button>
                                            )}
                                            {row.status === 'invited' && (
                                                <button onClick={() => confirmEmail(row)} disabled={busy === row.email} className={`${button} bg-blue-50 text-ustp-blue hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300`}>
                                                    <MailPlus size={14} /> Send link again
                                                </button>
                                            )}
                                            {row.status !== 'rejected' && (
                                                <button onClick={() => rejectEmail(row)} disabled={busy === row.email} className={`${button} bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400`}>
                                                    <UserX size={14} /> Reject
                                                </button>
                                            )}
                                        </>
                                    )} />
                                ))}
                            </Section>

                            <Section icon={UserPlus} title="Created an account"
                                hint="These accounts can't log in until you confirm them. Confirm emails them that their account is active; Reject dismisses their pending reports."
                                empty={accounts.length ? null : (q ? 'No accounts match' : 'No faculty accounts yet')}>
                                {accounts.map((row) => (
                                    <Row key={row.username} row={row} sub={`Signed up ${when(row.registered_at)}`} actions={(
                                        <>
                                            {row.status !== 'verified' && (
                                                <button onClick={() => decideAccount(row, 'verify')} disabled={busy === row.username} className={`${button} bg-emerald-500 text-white hover:bg-emerald-600`}>
                                                    {busy === row.username ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Confirm
                                                </button>
                                            )}
                                            {row.status !== 'rejected' && (
                                                <button onClick={() => decideAccount(row, 'reject')} disabled={busy === row.username} className={`${button} bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400`}>
                                                    <UserX size={14} /> Reject
                                                </button>
                                            )}
                                        </>
                                    )} />
                                ))}
                            </Section>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
