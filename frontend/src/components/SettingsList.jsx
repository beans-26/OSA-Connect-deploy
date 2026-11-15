import { ChevronRight } from 'lucide-react';

// The grouped-list look of the student Settings and Personal Info pages (mirrors the mobile app):
// an uppercase section label over a rounded card of rows. Rows can start with an icon (`icon`, a lucide icon).
export const Group = ({ label, children }) => (
    <section className="mb-4">
        {label && <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-[1px] text-[var(--s-muted)]">{label}</h2>}
        <div className="s-card overflow-hidden rounded-[22px]">{children}</div>
    </section>
);

// The line between rows stops 16 px short of the card's edges on both sides
export const insetDivider = "relative before:pointer-events-none before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-[var(--s-border)] before:content-['']";
const rowClass = "relative flex w-full items-center gap-3 px-4 py-3.5 text-left [&:not(:first-child)]:before:pointer-events-none [&:not(:first-child)]:before:absolute [&:not(:first-child)]:before:inset-x-4 [&:not(:first-child)]:before:top-0 [&:not(:first-child)]:before:h-px [&:not(:first-child)]:before:bg-[var(--s-border)] [&:not(:first-child)]:before:content-['']";

const Icon = ({ icon: IconComponent }) => (IconComponent
    ? <IconComponent size={20} className="shrink-0 text-[var(--s-muted)]" aria-hidden="true" />
    : null);

const Text = ({ title, subtitle }) => (
    <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-[var(--s-text)]">{title}</span>
        {subtitle && <span className="mt-0.5 block text-xs text-[var(--s-muted)]">{subtitle}</span>}
    </span>
);

/** A row that opens something (chevron), or shows a value on the right. */
export const Row = ({ icon, title, subtitle, value, onClick }) => (onClick ? (
    <button type="button" onClick={onClick} className={`${rowClass} hover:bg-[var(--s-bg)]`}>
        <Icon icon={icon} />
        <Text title={title} subtitle={subtitle} />
        {value && <span className="shrink-0 text-sm text-[var(--s-muted)]">{value}</span>}
        <ChevronRight size={18} className="shrink-0 text-[var(--s-muted)]" />
    </button>
) : (
    <div className={rowClass}>
        <Icon icon={icon} />
        <Text title={title} subtitle={subtitle} />
        {value && <span className="shrink-0 text-sm text-[var(--s-muted)]">{value}</span>}
    </div>
));

/** A row with an on/off switch. */
export const ToggleRow = ({ icon, title, subtitle, checked, onChange }) => (
    <label className={`${rowClass} cursor-pointer`}>
        <Icon icon={icon} />
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
export const InfoRow = ({ icon, label, value, action }) => (
    <div className={rowClass}>
        <Icon icon={icon} />
        <span className="min-w-0 flex-1">
            <span className="block text-xs text-[var(--s-muted)]">{label}</span>
            <span className="mt-0.5 block break-words text-[15px] font-semibold text-[var(--s-text)]">{value || '—'}</span>
        </span>
        {action}
    </div>
);
