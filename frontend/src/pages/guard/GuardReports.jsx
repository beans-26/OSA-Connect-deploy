import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ClipboardList, Search, ShieldCheck, ShieldAlert, GraduationCap, X, IdCard, CalendarDays, UserRound } from 'lucide-react';

// The guards' Reports: every report guards and faculty & staff filed lately (backend ViolationViewSet.feed),
// newest first. A caught student claims their ID back from the guard, who opens the report here to check
// the student was really reported, and by whom. The list is loaded by the layout (ReporterShell), which
// also counts the new ones for the menu badge.

const FILTERS = [
    ['all', 'All', () => true],
    ['staff', 'Faculty', (r) => r.reporter_role === 'staff'],
    ['guard', 'Guards', (r) => r.reporter_role === 'guard'],
    ['waiting', 'Waiting for OSA', (r) => waitingForOsa(r)],
];

// A faculty report (no account, email confirmed with a code) that OSA hasn't reviewed yet: OSA still has to
// check the reporter is faculty, so the guard waits before returning the student's ID
function waitingForOsa(r) {
    return r.reporter_role === 'staff' && r.status === 'Pending OSA Review';
}
const WAIT_NOTE = {
    tag: 'Wait for OSA',
    tone: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    box: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-700/40 dark:bg-amber-500/10 dark:text-amber-200',
    title: 'Faculty report: wait for OSA',
    text: "OSA is still checking that the reporter is USTP faculty. Don't return the student's ID until OSA approves the report.",
};

const STATUS = {
    'Pending OSA Review': ['For review', 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'],
    Approved: ['Approved', 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'],
    Completed: ['Approved', 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'],
    Cleared: ['Cleared', 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'],
    Finished: ['Cleared', 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'],
    Dismissed: ['Dismissed', 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'],
};
const statusOf = (s) => STATUS[s] || [s || 'For review', STATUS['Pending OSA Review'][1]];
const ROLE = { staff: ['Faculty', GraduationCap], guard: ['Guard', ShieldCheck] };

// "Sep 30, 8:53 PM"
const shortWhen = (iso) => (iso ? new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
const longWhen = (iso) => (iso ? new Date(iso).toLocaleString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');

const Row = ({ icon: Icon, label, children }) => (
    <div className="flex items-start gap-3 px-4 py-3">
        <Icon size={17} className="mt-0.5 shrink-0 text-slate-400" />
        <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
            <div className="text-sm font-bold text-slate-900 dark:text-white">{children}</div>
        </div>
    </div>
);

// Opened from the list: who reported it, the student and the violation
const ReportDetails = ({ report, onClose }) => {
    const [roleLabel, RoleIcon] = ROLE[report.reporter_role] || ROLE.guard;
    const [statusLabel, statusTone] = statusOf(report.status);
    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-labelledby="report-details" className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Violation report</p>
                        <h2 id="report-details" className="text-lg font-bold leading-tight text-slate-900 dark:text-white">{report.student_name}</h2>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200">
                        <X size={18} />
                    </button>
                </div>
                {waitingForOsa(report) && (
                    <div role="alert" className={`mx-5 mb-3 flex items-start gap-2.5 rounded-2xl border px-4 py-3 ${WAIT_NOTE.box}`}>
                        <ShieldAlert size={18} className="mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-bold">{WAIT_NOTE.title}</p>
                            <p className="mt-0.5 text-xs font-medium leading-5">{WAIT_NOTE.text}</p>
                        </div>
                    </div>
                )}
                <div className="mx-5 divide-y divide-dashed divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
                    <Row icon={RoleIcon} label={`Reported by (${roleLabel})`}>{report.reported_by}</Row>
                    <Row icon={UserRound} label="Student">{report.student_name}</Row>
                    {report.student_id && <Row icon={IdCard} label="Student ID"><span className="font-mono">{report.student_id}</span></Row>}
                    <Row icon={ClipboardList} label="Violation"><span className="text-red-700 dark:text-red-300">{report.violation_type}</span></Row>
                    <Row icon={CalendarDays} label="Reported">{longWhen(report.created_at)}</Row>
                </div>
                <div className="flex items-center justify-between gap-3 px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusTone}`}>{statusLabel}</span>
                    <button onClick={onClose} className="rounded-xl bg-ustp-blue px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-800">Done</button>
                </div>
            </div>
        </div>
    );
};

const GuardReports = () => {
    const { feed, seenAt, markSeen } = useOutletContext();
    // What was new when the page opened stays marked while it's open; the menu badge clears right away
    const [newSince] = useState(seenAt);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');
    const [open, setOpen] = useState(null);

    useEffect(() => { if (feed.loaded) markSeen(); }, [feed.loaded, feed.reports, markSeen]);

    const q = searchTerm.trim().toLowerCase();
    const test = FILTERS.find(([k]) => k === filter)[2];
    const shown = feed.reports.filter((r) => test(r) && (!q
        || r.student_name?.toLowerCase().includes(q)
        || r.student_id?.includes(q)
        || r.reported_by?.toLowerCase().includes(q)
        || r.violation_type?.toLowerCase().includes(q)));
    const counts = Object.fromEntries(FILTERS.map(([key, , t]) => [key, feed.reports.filter(t).length]));
    const isNew = (r) => newSince && Date.parse(r.created_at) > Date.parse(newSince);

    return (
        <main className="w-full px-3 py-4 md:px-6 md:py-6">
            {open && <ReportDetails report={open} onClose={() => setOpen(null)} />}
            <div className="mx-auto w-full max-w-3xl pb-10">
                <p className="mb-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {feed.loaded
                        ? `Reports from guards and faculty in the last ${feed.days} days. Tap one to check it before returning a student's ID.`
                        : 'Loading reports…'}
                </p>

                <div className="relative mb-2.5">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
                    <input
                        type="search"
                        placeholder="Search student, ID, reporter or violation"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-xl border-2 border-slate-100 bg-white py-2.5 pl-10 pr-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-ustp-blue focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    />
                </div>
                <div className="-mx-3 mb-3 flex gap-1.5 overflow-x-auto px-3 no-scrollbar md:mx-0 md:px-0">
                    {FILTERS.map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${filter === key
                                ? 'bg-ustp-blue text-white'
                                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                        >
                            {label} <span className={filter === key ? 'text-white/70' : 'text-slate-400'}>{counts[key]}</span>
                        </button>
                    ))}
                </div>

                {!feed.loaded ? (
                    <div className="py-16 text-center">
                        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-ustp-blue border-t-transparent" />
                    </div>
                ) : feed.error ? (
                    <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">{feed.error}</p>
                ) : shown.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-slate-100 bg-white px-4 py-14 text-center dark:border-slate-700 dark:bg-slate-800">
                        <ClipboardList className="mx-auto mb-3 text-slate-300 dark:text-slate-600" size={40} />
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{feed.reports.length ? 'No reports match.' : 'No reports yet.'}</p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {shown.map((r) => {
                            const [statusLabel, statusTone] = statusOf(r.status);
                            const [roleLabel, RoleIcon] = ROLE[r.reporter_role] || ROLE.guard;
                            return (
                                <li key={r.id}>
                                    <button
                                        onClick={() => setOpen(r)}
                                        className={`w-full rounded-2xl border px-3.5 py-3 text-left shadow-sm transition-colors hover:border-ustp-blue focus:outline-none focus-visible:border-ustp-blue ${isNew(r)
                                            ? 'border-blue-200 bg-blue-50/60 dark:border-blue-500/30 dark:bg-blue-500/10'
                                            : 'border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800'}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="flex items-center gap-2 truncate text-sm font-bold text-slate-900 dark:text-white">
                                                    {r.student_name}
                                                    {isNew(r) && <span className="rounded-full bg-ustp-blue px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">New</span>}
                                                </p>
                                                <p className="truncate font-mono text-xs font-medium text-slate-500 dark:text-slate-400">{r.student_id}</p>
                                            </div>
                                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusTone}`}>{statusLabel}</span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-500/10 dark:text-red-300">{r.violation_type}</span>
                                            <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                                                {shortWhen(r.created_at)} · <RoleIcon size={12} /> {roleLabel}
                                            </span>
                                            {waitingForOsa(r) && (
                                                <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${WAIT_NOTE.tone}`}>
                                                    <ShieldAlert size={11} /> {WAIT_NOTE.tag}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </main>
    );
};

export default GuardReports;
