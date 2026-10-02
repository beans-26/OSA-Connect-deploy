import { ChevronRight } from 'lucide-react';

// The grouped-list look of the student Settings and Personal Info pages (mirrors the mobile app):
// an uppercase section label over a rounded card of rows.
export const Group = ({ label, children }) => (
    <section className="mb-4">
        {label && <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-[1px] text-[var(--s-muted)]">{label}</h2>}
        <div className="overflow-hidden rounded-2xl border border-[var(--s-border)] bg-[var(--s-card)]">{children}</div>
    </section>
);

const rowClass = 'flex w-full items-center gap-3 px-4 py-3.5 text-left [&:not(:first-child)]:border-t [&:not(:first-child)]:border-[var(--s-border)]';

const Text = ({ title, subtitle }) => (
    <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-[var(--s-text)]">{title}</span>
        {subtitle && <span className="mt-0.5 block text-xs text-[var(--s-muted)]">{subtitle}</span>}
    </span>
);

/** A row that opens something (chevron), or shows a value on the right. */
export const Row = ({ title, subtitle, value, onClick }) => (onClick ? (
    <button type="button" onClick={onClick} className={`${rowClass} hover:bg-[var(--s-bg)]`}>
        <Text title={title} subtitle={subtitle} />
        {value && <span className="shrink-0 text-sm text-[var(--s-muted)]">{value}</span>}
        <ChevronRight size={18} className="shrink-0 text-[var(--s-muted)]" />
    </button>
) : (
    <div className={rowClass}>
        <Text title={title} subtitle={subtitle} />
        {value && <span className="shrink-0 text-sm text-[var(--s-muted)]">{value}</span>}
    </div>
));

/** A row with an on/off switch. */
export const ToggleRow = ({ title, subtitle, checked, onChange }) => (
    <label className={`${rowClass} cursor-pointer`}>
        <Text title={title} subtitle={subtitle} />
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={title}
            onClick={() => onChange(!checked)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-[var(--s-accent)]' : 'bg-[var(--s-border)]'}`}
        >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow ${checked ? 'left-[22px]' : 'left-0.5'}`} style={{ transition: 'left 200ms ease-out' }} />
        </button>
    </label>
);

/** A label over a value (Personal Info). */
export const InfoRow = ({ label, value, action }) => (
    <div className={rowClass}>
        <span className="min-w-0 flex-1">
            <span className="block text-xs text-[var(--s-muted)]">{label}</span>
            <span className="mt-0.5 block break-words text-[15px] font-semibold text-[var(--s-text)]">{value || '—'}</span>
        </span>
        {action}
    </div>
);
