import { ChevronRight } from 'lucide-react';

// The grouped-list look of the student Settings and Personal Info pages (mirrors the mobile app):
// a small section label over a rounded card of rows. Rows can start with a line icon (lucide, thin stroke);
// the divider between rows starts after the icon (.s-row in index.css).
export const Group = ({ label, children }) => (
    <section className="mb-5">
        {label && <h2 className="mb-2 px-1 text-[13px] font-medium text-[var(--s-muted)]">{label}</h2>}
        <div className="overflow-hidden rounded-[20px] bg-[var(--s-card)] shadow-[0_1px_3px_rgba(15,23,42,0.06)]">{children}</div>
    </section>
);

const rowClass = 's-row flex w-full items-center pl-4 text-left';
const bodyClass = 's-row-body flex min-w-0 flex-1 items-center gap-3 py-4 pr-4';

const Icon = ({ icon: IconComponent }) => (IconComponent
    ? <IconComponent size={24} strokeWidth={1.6} className="mr-4 shrink-0 text-[var(--s-text)]" aria-hidden="true" />
    : null);

const Text = ({ title, subtitle }) => (
    <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-normal leading-snug text-[var(--s-text)]">{title}</span>
        {subtitle && <span className="mt-0.5 block text-[13px] text-[var(--s-muted)]">{subtitle}</span>}
    </span>
);

/** A row that opens something (chevron), or shows a value on the right. */
export const Row = ({ icon, title, subtitle, value, onClick }) => {
    const body = (
        <span className={bodyClass}>
            <Text title={title} subtitle={subtitle} />
            {value && <span className="shrink-0 text-[15px] text-[var(--s-muted)]">{value}</span>}
            {onClick && <ChevronRight size={20} strokeWidth={1.6} className="shrink-0 text-[var(--s-muted)]" />}
        </span>
    );
    return onClick ? (
        <button type="button" onClick={onClick} className={`${rowClass} hover:bg-[var(--s-bg)]`}>
            <Icon icon={icon} />
            {body}
        </button>
    ) : (
        <div className={rowClass}>
            <Icon icon={icon} />
            {body}
        </div>
    );
};

/** A row with an on/off switch. */
export const ToggleRow = ({ icon, title, subtitle, checked, onChange }) => (
    <label className={`${rowClass} cursor-pointer`}>
        <Icon icon={icon} />
        <span className={bodyClass}>
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
        </span>
    </label>
);

/** A label over a value (Personal Info). */
export const InfoRow = ({ icon, label, value, action }) => (
    <div className={rowClass}>
        <Icon icon={icon} />
        <span className={bodyClass}>
            <span className="min-w-0 flex-1">
                <span className="block text-[13px] text-[var(--s-muted)]">{label}</span>
                <span className="mt-0.5 block break-words text-[17px] font-normal text-[var(--s-text)]">{value || '—'}</span>
            </span>
            {action}
        </span>
    </div>
);
