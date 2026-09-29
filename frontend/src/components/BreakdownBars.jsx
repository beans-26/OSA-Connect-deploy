import { departmentShort } from '../lib/academics';

// Colors per breakdown, shared by the admin reports and the guard analytics
export const BREAKDOWN_COLORS = { violation_type: '#ef4444', department: '#1e3a8a', gender: '#8b5cf6', year_level: '#f59e0b', course: '#10b981' };

// Horizontal bars for one breakdown (most first), like the Top Violations chart
const BreakdownBars = ({ rows, total, color }) => {
    if (!rows.length) {
        return <p className="py-6 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">No data</p>;
    }
    const top = rows.slice(0, 8);
    return (
        <div className="space-y-2.5">
            {top.map((r) => (
                <div key={r.label}>
                    <div className="flex items-baseline justify-between gap-3 text-xs">
                        <span className="min-w-0 truncate font-semibold text-slate-700 dark:text-slate-300" title={r.label}>{departmentShort(r.label)}</span>
                        <span className="shrink-0 font-black tabular-nums text-slate-800 dark:text-slate-200">
                            {r.count} <span className="font-semibold text-slate-400">{total ? Math.round((r.count / total) * 100) : 0}%</span>
                        </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700/60">
                        <div className="h-2 rounded-full" style={{ width: `${total ? (r.count / total) * 100 : 0}%`, background: color }} />
                    </div>
                </div>
            ))}
            {rows.length > top.length && <p className="text-[10px] font-semibold text-slate-400">+{rows.length - top.length} more</p>}
        </div>
    );
};

export default BreakdownBars;
