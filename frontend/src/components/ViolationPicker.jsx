import { useState } from 'react';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
import { useViolationTypes } from '../lib/violationTypes';

// The violations on the report forms (guard / faculty ReportViolation, admin ReportViolationModal): one dropdown
// per group (Less Grave, Light), one open at a time, each violation with a + to add it (a check once added; tap
// again to remove). The added ones show as chips underneath, each with an x.
// value: the chosen violations; onToggle(v): add or remove one; groups: defaults to the table's Light and Less
// Grave lists (lib/violationTypes.js).
export default function ViolationPicker({ value, onToggle, groups: given }) {
    const [openId, setOpenId] = useState(null);
    const types = useViolationTypes();
    const groups = given || types.groups;
    return (
        <div className="space-y-2">
            {groups.map((g) => {
                const open = openId === g.id;
                const count = g.items.filter((v) => value.includes(v)).length;
                return (
                    <div key={g.id} className="overflow-hidden rounded-xl border-2 border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                        <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => setOpenId(open ? null : g.id)}
                            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-800 dark:text-slate-100"
                        >
                            <span>{g.label}</span>
                            <span className="flex items-center gap-2">
                                {count > 0 && <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">{count}</span>}
                                <ChevronDown size={18} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                            </span>
                        </button>
                        {open && (
                            <ul className="max-h-44 overflow-y-auto border-t border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800">
                                {g.items.map((v) => {
                                    const on = value.includes(v);
                                    return (
                                        <li key={v}>
                                            <button
                                                type="button"
                                                onClick={() => onToggle(v)}
                                                aria-pressed={on}
                                                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${on ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50'}`}
                                            >
                                                <span className="min-w-0 font-semibold">{v}</span>
                                                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${on ? 'bg-red-600 text-white' : 'border-2 border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-300'}`}>
                                                    {on ? <Check size={15} strokeWidth={3} /> : <Plus size={15} strokeWidth={3} />}
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                );
            })}
            {value.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {value.map((v) => (
                        <button key={v} type="button" onClick={() => onToggle(v)} aria-label={`Remove ${v}`} className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">
                            {v} <X size={12} />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
