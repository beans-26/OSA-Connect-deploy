import { offenseCells } from '../lib/violationTypes';

// One category of the handbook's violations as a table: Violation | 1st | 2nd | 3rd offense. Used by the student
// Help (student colours) and the faculty Help (slate colours); `tone` picks which.
const TONES = {
    student: { head: 'text-[var(--s-muted)]', name: 'text-[var(--s-text)]', cell: 'text-[var(--s-muted)]', line: 'border-[var(--s-border)]', noEntry: 'text-red-600 dark:text-red-400' },
    staff: { head: 'text-slate-400 dark:text-slate-500', name: 'text-slate-700 dark:text-slate-200', cell: 'text-slate-500 dark:text-slate-400', line: 'border-slate-100 dark:border-slate-700', noEntry: 'text-red-600 dark:text-red-400' },
};

const ViolationsTable = ({ items, rules, tone = 'student' }) => {
    const t = TONES[tone];
    return (
        <table className="w-full table-fixed border-collapse text-left">
            <thead>
                <tr className={`text-[10px] font-black uppercase tracking-wider ${t.head}`}>
                    <th className="pb-2 pr-2 font-black">Violation</th>
                    <th className="w-[19%] pb-2 text-center font-black">1st</th>
                    <th className="w-[19%] pb-2 text-center font-black">2nd</th>
                    <th className="w-[19%] pb-2 text-center font-black">3rd</th>
                </tr>
            </thead>
            <tbody>
                {items.map((v) => (
                    <tr key={v} className={`border-t ${t.line}`}>
                        <td className={`py-2 pr-2 text-[13px] font-semibold leading-snug ${t.name}`}>{v}</td>
                        {offenseCells(rules?.[v]).map((c, i) => (
                            <td key={i} className={`py-2 text-center text-xs font-medium ${c === 'No entry' ? `font-bold ${t.noEntry}` : t.cell}`}>{c}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default ViolationsTable;
