import { departmentShort } from '../lib/academics';

// Colors per breakdown, shared by the admin reports and the guard analytics
export const BREAKDOWN_COLORS = { violation_type: '#ef4444', department: '#1e3a8a', gender: '#8b5cf6', year_level: '#f59e0b', course: '#10b981' };

// Horizontal bars for one breakdown (most first), like the Top Violations chart.
// compact: tighter rows and slimmer bars (the guards' Analytics on phones)
const BreakdownBars = ({ rows, total, color, compact = false }) => {
    if (!rows.length) {
        return <p className={`${compact ? 'py-3' : 'py-6'} text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500`}>No data</p>;
    }
    const top = rows.slice(0, 8);
    const bar = compact ? 'h-1.5' : 'h-2';
    return (
        <div className={compact ? 'space-y-1.5' : 'space-y-2.5'}>
            {top.map((r) => (
                <div key={r.label}>
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                        <span className="min-w-0 truncate font-semibold text-slate-700 dark:text-slate-300" title={r.label}>{departmentShort(r.label)}</span>
                        <span className="shrink-0 font-black tabular-nums text-slate-800 dark:text-slate-200">
                            {r.count} <span className="font-semibold text-slate-400">{total ? Math.round((r.count / total) * 100) : 0}%</span>
                        </span>
                    </div>
                    <div className={`${compact ? 'mt-0.5' : 'mt-1'} ${bar} rounded-full bg-slate-100 dark:bg-slate-700/60`}>
                        <div className={`${bar} rounded-full`} style={{ width: `${total ? (r.count / total) * 100 : 0}%`, background: color }} />
                    </div>
                </div>
            ))}
            {rows.length > top.length && <p className="text-[10px] font-semibold text-slate-400">+{rows.length - top.length} more</p>}
        </div>
    );
};

export default BreakdownBars;
