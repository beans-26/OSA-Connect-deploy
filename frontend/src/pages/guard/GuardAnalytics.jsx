import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { BarChart3, Loader2 } from 'lucide-react';
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
const BREAKDOWNS = [
    { id: 'department', label: 'Department' },
    { id: 'violation_type', label: 'Violation Type' },
    { id: 'gender', label: 'Gender' },
    { id: 'year_level', label: 'Year Level' },
    { id: 'course', label: 'Course' },
];

const GuardAnalytics = () => {
    const userRole = JSON.parse(localStorage.getItem('user') || '{}').role || 'guard';
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
        const poll = setInterval(load, 30000);
        return () => { cancelled = true; clearInterval(poll); };
    }, [period]);

    return (
        <div className="flex bg-slate-50 dark:bg-slate-900 min-h-screen relative">
            <Sidebar role={userRole} />
            <main className="page-enter flex-1 p-3 md:p-6 pt-20 md:pt-20 lg:pt-6 w-full max-w-full h-screen overflow-y-auto custom-scrollbar">
                <header className="mb-4">
                    <h1 className="flex items-center gap-2 text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        <BarChart3 className="text-ustp-blue dark:text-blue-400" size={24} /> Violation Analytics
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium text-xs">Campus-wide counts of reported violations.</p>
                </header>

                <div className="mb-4 flex flex-wrap gap-2">
                    {PERIODS.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setPeriod(p.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${period === p.id ? 'bg-ustp-blue text-white shadow-md' : 'bg-white text-slate-600 border-2 border-slate-100 hover:border-ustp-blue dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {error ? (
                    <p className="rounded-2xl bg-red-50 dark:bg-red-500/10 p-4 text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
                ) : !data ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-400" size={28} /></div>
                ) : (
                    <div className="space-y-4 pb-10">
                        <div className="rounded-2xl border-2 border-red-100 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">Violations reported</p>
                            <p className="mt-1 text-4xl font-black text-red-700 dark:text-red-300">{data.total}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {BREAKDOWNS.map((b) => (
                                <div key={b.id} className="card-premium p-4 md:p-6">
                                    <h4 className="mb-4 font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-xs">By {b.label}</h4>
                                    <BreakdownBars rows={data[b.id] || []} total={data.total} color={BREAKDOWN_COLORS[b.id]} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default GuardAnalytics;
