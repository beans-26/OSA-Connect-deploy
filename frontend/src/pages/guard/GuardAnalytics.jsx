import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import BreakdownBars, { BREAKDOWN_COLORS } from '../../components/BreakdownBars';

// Campus-wide violation counts for guards: by department, violation type, gender, year level and course.
// Counts only (GET /api/violations/summary/), no student names; dismissed reports aren't counted.
const PERIODS = [
    { id: 'day', label: 'Today' },
    { id: 'month', label: 'This Month' },
    { id: 'quarter', label: 'This Quarter' },
    { id: 'year', label: 'This Year' },
    { id: 'all', label: 'All Time' },
];
// half: short lists that sit two to a row on phones (gender, year level)
const BREAKDOWNS = [
    { id: 'department', label: 'Department' },
    { id: 'violation_type', label: 'Violation Type' },
    { id: 'gender', label: 'Gender', half: true },
    { id: 'year_level', label: 'Year Level', half: true },
    { id: 'course', label: 'Course' },
];

const GuardAnalytics = () => {
    const [period, setPeriod] = useState('month');
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        const load = () => fetch(`/api/violations/summary/?period=${period}`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error('server'))))
            .then((json) => { if (!cancelled) { setData(json); setError(''); } })
            .catch((e) => { if (!cancelled) setError(e.message === 'server' ? "Couldn't load the analytics." : "Can't reach the server. Check your connection."); });
        setData(null);
        load();
        const poll = setInterval(() => document.visibilityState === 'visible' && load(), 30000);
        return () => { cancelled = true; clearInterval(poll); };
    }, [period]);

    return (
        // Inside the guard / faculty & staff layout (components/ReporterShell.jsx): the title is in its top bar
        <>
            <main className="w-full px-3 py-4 md:px-6 md:py-6">
                {/* Same width and compact style as Violation History */}
                <div className="mx-auto w-full max-w-5xl">
                    <header className="mb-2.5 sm:mb-3">
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">Campus-wide counts of reported violations.</p>
                    </header>

                    {/* The periods on one line (they scroll sideways on narrow phones) */}
                    <div className="-mx-3 px-3 md:mx-0 md:px-0 mb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
                        {PERIODS.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => setPeriod(p.id)}
                                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${period === p.id
                                    ? 'bg-ustp-blue text-white'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {error ? (
                        <p className="rounded-2xl bg-red-50 dark:bg-red-500/10 p-4 text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
                    ) : !data ? (
                        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" size={26} /></div>
                    ) : (
                        <div className="space-y-2 sm:space-y-3 pb-10">
                            <div className="flex items-center justify-between gap-3 rounded-xl sm:rounded-2xl border border-red-100 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-3.5 py-2 sm:px-4 sm:py-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">
                                    Violations reported <span className="font-bold normal-case tracking-normal text-red-500/80 dark:text-red-300/70">· {PERIODS.find((p) => p.id === period)?.label}</span>
                                </p>
                                <p className="text-2xl sm:text-3xl font-black tabular-nums text-red-700 dark:text-red-300">{data.total}</p>
                            </div>
                            {/* Phones: two columns, the long lists across both and gender / year level side by side */}
                            <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3">
                                {BREAKDOWNS.map((b) => (
                                    <div key={b.id} className={`${b.half ? 'col-span-1' : 'col-span-2 md:col-span-1'} ${b.half ? '' : 'xl:col-span-1'} min-w-0 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 sm:px-4 sm:py-3.5 shadow-sm`}>
                                        <h4 className="mb-1.5 sm:mb-2.5 font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[10px]">By {b.label}</h4>
                                        <BreakdownBars rows={data[b.id] || []} total={data.total} color={BREAKDOWN_COLORS[b.id]} compact />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
};

export default GuardAnalytics;
