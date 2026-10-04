import { AlertTriangle, CheckCircle2, Clock, Info } from 'lucide-react';

// One notification row, used by the Notifications page and the bell's panel (StudentShell).
// Mirrors mobile/components/NotificationItem.jsx.
const TONES = {
    info: { icon: Info, className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' },
    warn: { icon: Clock, className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
    good: { icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
    bad: { icon: AlertTriangle, className: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300' },
};

const when = (iso) => {
    const t = Date.parse(iso);
    if (!t) return '';
    const mins = Math.round((Date.now() - t) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    if (mins < 24 * 60) return `${Math.round(mins / 60)} hr ago`;
    return new Date(t).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

export default function NotificationItem({ n, fresh, compact = false }) {
    const { icon: Icon, className } = TONES[n.tone] || TONES.info;
    return (
        <li className={`flex gap-3 ${compact ? 'px-3.5 py-3' : 'px-4 py-3.5'} [&:not(:first-child)]:border-t [&:not(:first-child)]:border-[var(--s-border)] ${fresh ? 'bg-[var(--s-accent-soft)]' : ''}`}>
            <span className={`mt-0.5 flex ${compact ? 'h-8 w-8' : 'h-9 w-9'} shrink-0 items-center justify-center rounded-full ${className}`}><Icon size={compact ? 15 : 17} /></span>
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-bold text-[var(--s-text)]">{n.title}</p>
                    <span className="shrink-0 text-[11px] text-[var(--s-muted)]">{when(n.at)}</span>
                </div>
                <p className={`mt-0.5 text-xs leading-5 text-[var(--s-muted)] ${compact ? 'line-clamp-2' : ''}`}>{n.body}</p>
            </div>
            {fresh && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--s-accent)]" aria-label="New" />}
        </li>
    );
}
