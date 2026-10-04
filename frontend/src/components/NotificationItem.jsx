import { AlertTriangle, CheckCircle2, Clock, Info } from 'lucide-react';

// One notification row, used by the Notifications page and the bell's panel (StudentShell).
// Mirrors mobile/components/NotificationItem.jsx.
// Line icon in the tone's colour (no filled circle), like a settings list
const TONES = {
    info: { icon: Info, className: 'text-blue-600 dark:text-blue-300' },
    warn: { icon: Clock, className: 'text-amber-600 dark:text-amber-300' },
    good: { icon: CheckCircle2, className: 'text-emerald-600 dark:text-emerald-300' },
    bad: { icon: AlertTriangle, className: 'text-red-600 dark:text-red-300' },
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
        <li className={`s-row flex pl-4 ${fresh ? 'bg-[var(--s-accent-soft)]' : ''}`}>
            <Icon size={24} className={`mr-4 mt-3.5 shrink-0 ${className}`} aria-hidden="true" />
            <div className={`s-row-body flex min-w-0 flex-1 gap-3 pr-4 ${compact ? 'py-3' : 'py-3.5'}`}>
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[16px] font-medium text-[var(--s-text)]">{n.title}</p>
                        <span className="shrink-0 text-[12px] text-[var(--s-muted)]">{when(n.at)}</span>
                    </div>
                    <p className={`mt-0.5 text-[14px] leading-5 text-[var(--s-muted)] ${compact ? 'line-clamp-2' : ''}`}>{n.body}</p>
                </div>
                {fresh && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--s-accent)]" aria-label="New" />}
            </div>
        </li>
    );
}
