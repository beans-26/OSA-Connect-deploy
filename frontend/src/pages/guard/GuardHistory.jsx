import { useState } from 'react';
import usePolling from '../../lib/usePolling';
import { ClipboardList, Search } from 'lucide-react';
import { departmentShort } from '../../lib/academics';

// The reports a guard (or faculty & staff) filed, newest first, with where each one is in OSA's process.
// Compact cards so a phone shows several at once: name + status, ID · course, then violation · when · who.

// Filters: "Approved" covers every accepted case (serving, hours done, cleared)
const FILTERS = [
    ['all', 'All', () => true],
    ['pending', 'For review', (s) => s === 'Pending OSA Review'],
    ['approved', 'Approved', (s) => ['Approved', 'Completed', 'Cleared', 'Finished'].includes(s)],
    ['dismissed', 'Dismissed', (s) => s === 'Dismissed'],
];

// Penalties with no hours to serve (backend PUNISHMENT_SYSTEM's no-entry sanction; a 0-hour event report)
const NO_SERVICE = ['No Entry into the Campus', 'No community service'];

// What each database status is called here, and its colours
const STATUS = {
    'Pending OSA Review': ['For review', 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'],
    Approved: ['Approved', 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'],
    Completed: ['Hours done', 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'],
    Cleared: ['Cleared', 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'],
    Finished: ['Cleared', 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'],
    Dismissed: ['Dismissed', 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'],
};

// "Sep 30, 8:53 PM"; the year only when it isn't this year
const shortWhen = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return d.toLocaleString('en-PH', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }), hour: 'numeric', minute: '2-digit' });
};

const GuardHistory = () => {

    const [violations, setViolations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');

    // Every 30 s, only while the tab is visible (was every 5 s, even in a hidden tab)
    usePolling(() => fetchViolations(), 30000);

    const fetchViolations = async () => {
        try {
            const response = await fetch('/api/violations/');
            if (response.ok) {
                const data = await response.json();
                setViolations(data.reverse());
            }
        } catch (error) {
            console.error('Failed to fetch violations:', error);
        } finally {
            setLoading(false);
        }
    };

    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = (v) => !q
        || v.student_details?.name?.toLowerCase().includes(q)
        || v.student_details?.student_id?.toLowerCase().includes(q)
        || v.violation_type?.toLowerCase().includes(q);
    const inFilter = (key) => FILTERS.find(([k]) => k === key)[2];
    const filteredViolations = violations.filter((v) => matchesSearch(v) && inFilter(filter)(v.status));
    const counts = Object.fromEntries(FILTERS.map(([key, , test]) => [key, violations.filter((v) => test(v.status)).length]));

    return (
        // Inside the guard / faculty & staff layout (components/ReporterShell.jsx): the title is in its top bar
        <>
            <main className="w-full px-3 py-4 md:px-6 md:py-6">
                <header className="mb-3 mx-auto w-full max-w-3xl">
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">
                        {loading ? 'Loading your reports…' : `${filteredViolations.length} of ${violations.length} report${violations.length === 1 ? '' : 's'}`}
                    </p>
                </header>

                <div className="pb-10">
                    <div className="mx-auto w-full max-w-3xl">
                        {/* Search, then the status filters on one line (they scroll sideways on narrow phones) */}
                        <div className="relative mb-2.5">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
                            <input
                                type="search"
                                placeholder="Search name, ID or violation"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-3 py-2.5 text-sm font-medium bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:border-ustp-blue focus:outline-none"
                            />
                        </div>
                        <div className="-mx-3 px-3 md:mx-0 md:px-0 mb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
                            {FILTERS.map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => setFilter(key)}
                                    className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${filter === key
                                        ? 'bg-ustp-blue text-white'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                >
                                    {label} <span className={filter === key ? 'text-white/70' : 'text-slate-400'}>{counts[key]}</span>
                                </button>
                            ))}
                        </div>

                        {loading ? (
                            <div className="text-center py-16">
                                <div className="animate-spin w-10 h-10 border-4 border-ustp-blue border-t-transparent rounded-full mx-auto"></div>
                                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 font-medium">Loading your reports…</p>
                            </div>
                        ) : filteredViolations.length === 0 ? (
                            <div className="text-center py-14 px-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-700">
                                <ClipboardList className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={40} />
                                <p className="font-bold text-slate-500 dark:text-slate-400 text-sm">
                                    {violations.length ? 'No reports match.' : "You haven't filed any reports yet."}
                                </p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {filteredViolations.map((report) => {
                                    // Approved with nothing to serve (e.g. no entry into the campus) is closed as Completed,
                                    // but no hours were served: show it as Approved
                                    const shownStatus = report.status === 'Completed' && NO_SERVICE.includes(report.punishment) ? 'Approved' : report.status;
                                    const [statusLabel, statusTone] = STATUS[shownStatus] || [shownStatus || 'For review', STATUS['Pending OSA Review'][1]];
                                    const s = report.student_details || {};
                                    return (
                                        <li key={report.id} className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-3 shadow-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{s.name || 'Unknown student'}</p>
                                                    <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                                                        <span className="font-mono">{s.student_id || report.student_id || '—'}</span>
                                                        {/* College first: it's short, so a long course name is what gets cut off */}
                                                        {s.department && s.department !== 'Unknown' && ` · ${departmentShort(s.department)}`}
                                                        {s.course && s.course !== 'Unknown' && ` · ${s.course}`}
                                                    </p>
                                                </div>
                                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusTone}`}>{statusLabel}</span>
                                            </div>
                                            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <span className="inline-flex items-center gap-1 rounded-md bg-red-50 dark:bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-700 dark:text-red-300">
                                                    {report.violation_type}
                                                </span>
                                                <span className="text-xs text-slate-400 dark:text-slate-500">
                                                    {shortWhen(report.created_at)}{report.reporting_guard ? ` · ${report.reporting_guard}` : ''}
                                                </span>
                                            </div>
                                            {report.description && (
                                                <p className="mt-2 border-t border-slate-100 dark:border-slate-700 pt-2 text-xs text-slate-600 dark:text-slate-400">{report.description}</p>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
};

export default GuardHistory;
