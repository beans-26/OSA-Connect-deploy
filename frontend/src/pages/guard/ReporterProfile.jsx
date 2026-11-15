import { useNavigate, useOutletContext } from 'react-router-dom';
import { BadgeCheck, ChevronRight, CircleHelp, LogOut, Mail, User } from 'lucide-react';

const ROLE_LABEL = { guard: 'Guard', staff: 'Faculty', admin: 'OSA Admin' };

// The Profile tab of the guard and faculty & staff pages (inside components/ReporterShell.jsx): the account,
// Help (faculty & staff) and Log out, the same way students reach theirs from their Profile.
export default function ReporterProfile() {
    const navigate = useNavigate();
    const { area, openLogout } = useOutletContext();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const name = user.full_name || user.name || user.username || 'Account';
    const rows = [
        { icon: User, label: 'Name', value: name },
        { icon: BadgeCheck, label: 'Role', value: ROLE_LABEL[user.role] || ROLE_LABEL[area] },
        { icon: Mail, label: user.username?.includes('@') ? 'Email' : 'Username', value: user.username || '—' },
    ];

    return (
        <main className="mx-auto w-full max-w-xl px-4 pb-10 pt-4">
            <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-[1px] text-slate-500 dark:text-slate-400">Account</h2>
            <div className="overflow-hidden rounded-[22px] border border-slate-100 bg-white shadow-[0_10px_30px_-12px_rgba(16,26,75,0.14)] dark:border-slate-700 dark:bg-slate-800">
                {rows.map(({ icon: Icon, label, value }, i) => (
                    <div key={label} className="relative flex items-center gap-3 px-4 py-3.5">
                        {i > 0 && <span aria-hidden="true" className="absolute inset-x-4 top-0 h-px bg-slate-100 dark:bg-slate-700" />}
                        <Icon size={20} className="shrink-0 text-slate-400" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                            <span className="block text-xs text-slate-500 dark:text-slate-400">{label}</span>
                            <span className="mt-0.5 block break-words text-[15px] font-semibold text-slate-900 dark:text-white">{value}</span>
                        </span>
                    </div>
                ))}
            </div>

            {area === 'staff' && (
                <>
                    <h2 className="mb-2 mt-5 px-1 text-xs font-bold uppercase tracking-[1px] text-slate-500 dark:text-slate-400">Support</h2>
                    <button onClick={() => navigate('/faculty/help')} className="flex w-full items-center gap-3 rounded-[22px] border border-slate-100 bg-white px-4 py-3.5 text-left shadow-[0_10px_30px_-12px_rgba(16,26,75,0.14)] hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/60">
                        <CircleHelp size={20} className="shrink-0 text-slate-400" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-semibold text-slate-900 dark:text-white">Help &amp; Support</span>
                            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">How to file a violation report</span>
                        </span>
                        <ChevronRight size={18} className="shrink-0 text-slate-400" />
                    </button>
                </>
            )}

            <button onClick={openLogout} className="mt-5 flex w-full items-center justify-center gap-2 rounded-[22px] border border-slate-100 bg-white p-4 text-[15px] font-semibold text-red-600 shadow-[0_10px_30px_-12px_rgba(16,26,75,0.14)] hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-950/30">
                <LogOut size={18} /> Log out
            </button>
        </main>
    );
}
