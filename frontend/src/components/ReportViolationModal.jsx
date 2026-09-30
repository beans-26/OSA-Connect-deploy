import { useMemo, useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { ServiceSiteOptions, postAssignment } from './useServiceSites';
import { EVENT_VIOLATION } from '../lib/violationTypes';

// The admin's "Report Violation" (Students page), for students who missed a mandatory event: add one or
// more students by typing or pasting their IDs (new lines, commas or spaces between them), choose the
// building and the hours, check the summary, and report. An ID without an account needs nothing more (just the ID); the report is
// saved under the ID and shows up on their account when they register (bulk_create in backend core/views.py).

const STUDENT_ID = /^\d{10}$/;
// Longer lists fold into a dropdown on the confirmation
const OPEN_LIST_UP_TO = 3;
const label = 'text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block';
const field = 'w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-ustp-blue text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-medium';

const ReportViolationModal = ({ students, serviceSites, onClose, onReported }) => {
    const byId = useMemo(() => new Map(students.map((s) => [s.student_id, s])), [students]);
    // [{ student_id, name, hasAccount }]; IDs without an account show only the ID
    const [rows, setRows] = useState([]);
    const [idText, setIdText] = useState('');
    const [idNote, setIdNote] = useState('');
    const [form, setForm] = useState({ violation_type: EVENT_VIOLATION, assigned_building: '', custom_hours: '' });
    const [confirming, setConfirming] = useState(false);
    const [listOpen, setListOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [problems, setProblems] = useState({}); // student_id -> error from the server
    const [result, setResult] = useState(null);

    // Adds IDs that aren't in the list yet; returns the ones that already were (each named once)
    const addIds = (ids) => {
        const have = new Set(rows.map((r) => r.student_id));
        const fresh = [...new Set(ids)].filter((sid) => !have.has(sid));
        setRows([...rows, ...fresh.map((sid) => {
            const s = byId.get(sid);
            return { student_id: sid, name: s?.name && s.name.toLowerCase() !== 'unregistered student' ? s.name : '', hasAccount: !!s?.has_account };
        })]);
        const repeated = ids.filter((sid, i) => have.has(sid) || ids.indexOf(sid) !== i);
        return [...new Set(repeated)];
    };

    // The typed/pasted IDs: valid ones are added, anything else stays in the box to fix
    const addFromText = () => {
        const tokens = idText.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean);
        if (!tokens.length) return;
        const valid = tokens.filter((t) => STUDENT_ID.test(t));
        const invalid = tokens.filter((t) => !STUDENT_ID.test(t));
        const already = addIds(valid); // IDs typed twice in the same paste count too; they're added once
        setIdText(invalid.join('\n'));
        const notes = [];
        if (already.length) notes.push(`${already.length === 1 ? 'ID' : 'IDs'} already added: ${already.join(', ')}.`);
        if (invalid.length) notes.push(`Not a student ID (10 numbers): ${invalid.join(', ')}`);
        setIdNote(notes.join(' '));
    };

    const remove = (sid) => setRows((prev) => prev.filter((r) => r.student_id !== sid));

    const hours = form.custom_hours === '' ? NaN : Number(form.custom_hours);
    const hoursOk = Number.isFinite(hours) && hours >= 0 && hours <= 100;
    const ready = rows.length > 0 && form.assigned_building && hoursOk;
    const missing = !rows.length ? 'Add at least one student ID.'
        : !form.assigned_building ? 'Choose a building.' : !hoursOk ? 'Input the hours (0 to 100).' : '';
    const site = serviceSites.sites?.find((s) => s.site_code === form.assigned_building);
    const hoursText = `${hours} hour${hours === 1 ? '' : 's'}`;
    const displayName = (r) => (r.hasAccount ? r.name : 'Not registered yet');

    // "Report students": check everything on the confirmation first
    const review = (e) => {
        e.preventDefault();
        if (!ready) return;
        setError('');
        setListOpen(rows.length <= OPEN_LIST_UP_TO);
        setConfirming(true);
    };

    const submit = async () => {
        setSaving(true);
        setError('');
        setProblems({});
        try {
            const { ok, cancelled, data } = await postAssignment('/api/violations/bulk_create/', {
                ...form,
                // Only the IDs: accounts keep their names, and IDs without one keep what's on record
                students: rows.map((r) => ({ student_id: r.student_id })),
            });
            if (cancelled) return;
            if (!ok) {
                setError(data.error || "Couldn't report. Try again.");
                setProblems(Object.fromEntries((data.results || []).map((r) => [r.student_id, r.error])));
                setConfirming(false);
                return;
            }
            setResult(data);
            onReported?.();
        } catch {
            setError("Can't reach the server. Check your connection and try again.");
        } finally {
            setSaving(false);
        }
    };

    const subtitle = result ? 'Done' : confirming ? 'Check before reporting'
        : rows.length ? `${rows.length} student${rows.length === 1 ? '' : 's'}` : 'Add the students, then the violation';

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="report-title">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[92vh]">
                <div className="flex justify-between items-start gap-4 mb-5">
                    <div>
                        <h2 id="report-title" className="text-lg font-black text-slate-900 dark:text-white leading-tight">Report Violation</h2>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{subtitle}</p>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 flex items-center justify-center shrink-0">
                        <X size={18} />
                    </button>
                </div>

                {result ? (
                    <div className="space-y-4">
                        <p className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-400">{result.message}</p>
                        <ul className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 rounded-xl border border-slate-100 dark:border-slate-700">
                            {(result.results || []).map((r) => (
                                <li key={r.student_id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                                    <span className="min-w-0">
                                        <span className={`block font-bold text-slate-800 dark:text-slate-200 truncate ${r.has_account ? '' : 'font-mono'}`}>{r.has_account ? r.name : r.student_id}</span>
                                        <span className="text-xs font-semibold text-slate-500">
                                            {r.has_account ? r.student_id : r.status === 'success' ? 'Shows on their account when they register' : ''}
                                        </span>
                                    </span>
                                    <span className={`shrink-0 text-xs font-bold ${r.status === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>{r.status === 'success' ? 'Reported' : r.error}</span>
                                </li>
                            ))}
                        </ul>
                        <button onClick={onClose} className="w-full py-3 rounded-xl font-bold text-sm bg-ustp-blue text-white hover:bg-blue-800">Close</button>
                    </div>
                ) : confirming ? (
                    // The confirmation: everything that will be saved, like a receipt
                    <div className="space-y-4">
                        <dl className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-dashed divide-slate-200 dark:divide-slate-700 text-sm">
                            {[
                                ['Violation', form.violation_type, 'text-red-600 dark:text-red-400'],
                                ['Building', site?.name || form.assigned_building],
                                ['Hours', `${hoursText} each`],
                                ['Status', 'Approved right away'],
                            ].map(([term, value, tone]) => (
                                <div key={term} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
                                    <dt className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">{term}</dt>
                                    <dd className={`min-w-0 text-right font-bold ${tone || 'text-slate-900 dark:text-white'}`}>{value}</dd>
                                </div>
                            ))}
                        </dl>

                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <button type="button" onClick={() => setListOpen((o) => !o)} aria-expanded={listOpen}
                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                    {rows.length} student{rows.length === 1 ? '' : 's'}
                                    {rows.some((r) => !r.hasAccount) && (
                                        <span className="ml-1.5 text-xs font-semibold text-amber-600">· {rows.filter((r) => !r.hasAccount).length} not registered yet</span>
                                    )}
                                </span>
                                <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${listOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {listOpen && (
                                <ul className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 border-t border-slate-200 dark:border-slate-700">
                                    {rows.map((r) => (
                                        <li key={r.student_id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                                            <span className={`min-w-0 truncate font-semibold ${r.hasAccount ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 italic'}`}>{displayName(r)}</span>
                                            <span className="shrink-0 font-mono text-xs font-semibold text-slate-500">{r.student_id}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {error && <p className="rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400">{error}</p>}

                        <div className="grid grid-cols-2 gap-3">
                            <button type="button" onClick={() => setConfirming(false)} disabled={saving}
                                className="py-3.5 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-200 disabled:opacity-50">
                                Back
                            </button>
                            <button type="button" onClick={submit} disabled={saving}
                                className="py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
                                {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Reporting…</> : 'Confirm & report'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={review} className="space-y-5">
                        {/* 1. Students */}
                        <div className="space-y-3">
                            <div>
                                <label className={label} htmlFor="rv-ids">Student IDs</label>
                                <div className="flex gap-2">
                                    <textarea
                                        id="rv-ids"
                                        rows={2}
                                        value={idText}
                                        onChange={(e) => { setIdText(e.target.value); setIdNote(''); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addFromText(); } }}
                                        placeholder="Type or paste IDs, e.g. 2023303188, 2023303189"
                                        className={`${field} font-mono resize-y min-h-[46px]`}
                                    />
                                    {/* Green once there's an ID to add, grey while the box is empty */}
                                    <button type="button" onClick={addFromText} disabled={!idText.trim()} className="shrink-0 self-start px-4 py-2.5 rounded-xl text-sm font-bold transition-colors bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-900 disabled:cursor-not-allowed">
                                        Add
                                    </button>
                                </div>
                                <p className={`mt-1 text-xs ${idNote.includes('Not a student ID') ? 'font-semibold text-red-600 dark:text-red-400' : idNote ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                                    {idNote || 'Separate IDs with new lines, commas or spaces.'}
                                </p>
                            </div>

                            {rows.length > 0 && (
                                <ul className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 rounded-xl border border-slate-200 dark:border-slate-700">
                                    {rows.map((r) => (
                                        <li key={r.student_id} className="flex items-center gap-3 px-3.5 py-2.5">
                                            <div className="min-w-0 flex-1">
                                                {/* With an account: the name, then the ID. Without one: only the ID */}
                                                <p className={`text-sm font-bold text-slate-800 dark:text-slate-200 truncate ${r.hasAccount ? '' : 'font-mono'}`}>
                                                    {r.hasAccount ? r.name : r.student_id}
                                                </p>
                                                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                                                    {r.hasAccount && `${r.student_id} · `}
                                                    <span className={r.hasAccount ? 'text-emerald-600' : 'text-amber-600'}>{r.hasAccount ? 'Has an account' : 'Not registered yet'}</span>
                                                </p>
                                                {problems[r.student_id] && <p className="mt-0.5 text-xs font-bold text-red-600">{problems[r.student_id]}</p>}
                                            </div>
                                            <button type="button" onClick={() => remove(r.student_id)} aria-label={`Remove ${r.student_id}`} className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                                                <X size={15} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* 2. The violation, the same for everyone listed */}
                        <div className="space-y-3 border-t border-slate-100 dark:border-slate-700 pt-5">
                            <div>
                                <span className={label}>Violation</span>
                                <p className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 px-3.5 py-2.5 text-sm font-bold text-red-600 dark:text-red-400">
                                    {EVENT_VIOLATION}
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                    <label className={label} htmlFor="rv-building">Building for their community service</label>
                                    <select id="rv-building" required value={form.assigned_building} onChange={(e) => setForm({ ...form, assigned_building: e.target.value })} className={field}>
                                        <ServiceSiteOptions {...serviceSites} placeholder="Choose a building" />
                                    </select>
                                </div>
                                <div>
                                    <label className={label} htmlFor="rv-hours">Hours</label>
                                    <input id="rv-hours" type="number" required min="0" max="100" step="0.5" inputMode="decimal" value={form.custom_hours}
                                        onChange={(e) => setForm({ ...form, custom_hours: e.target.value })} placeholder="Input hours" className={field} />
                                </div>
                            </div>
                        </div>

                        {error && <p className="rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400">{error}</p>}

                        <button type="submit" disabled={!ready} className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors bg-red-600 text-white hover:bg-red-700 disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-700 disabled:cursor-not-allowed">
                            {rows.length > 1 ? `Report ${rows.length} students` : 'Report student'}
                        </button>
                        {!ready && rows.length > 0 && <p className="-mt-3 text-center text-xs font-semibold text-slate-400">{missing}</p>}
                    </form>
                )}
            </div>
        </div>
    );
};

export default ReportViolationModal;
