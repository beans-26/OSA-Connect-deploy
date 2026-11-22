import { useEffect, useState } from 'react';
import { X, ChevronDown, LogIn, CheckCircle2, Clock, FileText, Download, Loader2, MapPin, CalendarClock, ScanFace } from 'lucide-react';
import { ticketReceipt } from '../lib/ticketStatus';
import { SessionReceiptBody, receiptDate, formatDuration, FLAGGED_ENDS } from './SessionReceipt';
import DigitalTicket from './DigitalTicket';

// Opened by tapping an e-ticket on the student dashboard: the ticket, then its service log grouped by
// date. Each date is a toggle listing that day's sessions (Session 1, 2, ...); tapping one opens its
// receipt (several can be open at once). Mirrors mobile/components/TicketDetails.jsx.
// The admin Archives open it too (forAdmin), with `children` shown under the ticket (the clearance photos).
// The title bar stays at the top while the receipt scrolls. Students also get the two blank forms to bring
// to OSA (FM-USTP-OSA-013 ISO form, FM-USTP-OSA-14 reflection form) while the ticket isn't cleared.
// "28h 05m"
const hoursMinutes = (hours) => {
    const mins = Math.max(0, Math.round((hours || 0) * 60));
    return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
};

const TicketDetails = ({ ticket, onClose, children, forAdmin = false }) => {
    const [receipts, setReceipts] = useState(null);
    // The full receipt (violation, sanction, buildings...) is folded away for students so the essentials come first;
    // the admin Archives see it open
    const [showDetails, setShowDetails] = useState(forAdmin);
    // Closing: the sheet slides back down (and the background fades) before it's removed
    const [closing, setClosing] = useState(false);
    useEffect(() => { setClosing(false); }, [ticket?.id]);
    const close = () => {
        if (closing) return;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { onClose(); return; }
        setClosing(true);
        setTimeout(onClose, 260);
    };
    const [error, setError] = useState('');
    // The digital e-ticket the student shows a guard
    const [showDigital, setShowDigital] = useState(false);
    useEffect(() => { setShowDigital(false); }, [ticket?.id]);
    const [openDate, setOpenDate] = useState(null);
    const [openSessions, setOpenSessions] = useState(() => new Set());

    const toggleSession = (id) => setOpenSessions((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });

    const [formBusy, setFormBusy] = useState(null);
    const downloadForm = async (kind) => {
        if (formBusy) return;
        setFormBusy(kind);
        try {
            const { isoFormPdf, reflectionFormPdf } = await import('../lib/isoFormPdf');
            const pdf = await (kind === 'iso' ? isoFormPdf() : reflectionFormPdf());
            pdf.save(kind === 'iso' ? 'FM-USTP-OSA-013 ISO Form.pdf' : 'FM-USTP-OSA-14 Reflection Form.pdf');
        } catch {
            alert("Couldn't make the form. Try again.");
        } finally {
            setFormBusy(null);
        }
    };

    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        if (!ticket) return;
        setError('');
        setReceipts(null);
        fetch(`/api/timelogs/receipts/?eticket_id=${ticket.id}`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error('server'))))
            .then((data) => setReceipts(Array.isArray(data) ? data : []))
            .catch((e) => setError(e.message === 'server' ? "Couldn't load your service log." : "Can't reach the server. Check your connection."));
    }, [ticket?.id, attempt]);

    if (!ticket) return null;

    // Newest day first (the API's order); sessions within a day oldest first
    const days = [];
    (receipts || []).forEach((r) => {
        const date = receiptDate(r.time_in);
        const day = days.find((d) => d.date === date);
        if (day) day.sessions.unshift(r);
        else days.push({ date, sessions: [r] });
    });

    const summary = ticketReceipt(ticket, receipts, { forAdmin });
    const headerStyle = {
        done: ['border-[#e2e8f0] bg-[#f1f5f9]', 'text-[#334155]', 'text-[#64748b]', CheckCircle2],
        clearance: ['border-[#a7f3d0] bg-[#ecfdf5]', 'text-[#065f46]', 'text-[#047857]', FileText],
        active: ['border-[var(--s-border)] bg-[var(--s-bg)]', 'text-[var(--s-text)]', 'text-[var(--s-muted)]', Clock],
    }[summary.header.tone];
    const HeaderIcon = headerStyle[3];
    const toneClass = { red: 'text-[#dc2626]', good: 'text-[#059669]', bad: 'text-[#dc2626]' };

    return (
        <>
        {showDigital && <DigitalTicket ticket={ticket} onClose={() => setShowDigital(false)} />}
        <div className={`${closing ? 'sheet-fade-out' : 'sheet-fade'} fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4`} role="dialog" aria-modal="true" aria-labelledby="ticket-title" onClick={close}>
            {/* sheet-up: slides up from the bottom as it opens (index.css) */}
            <div className={`${closing ? 'sheet-down' : 'sheet-up'} popup-max-h w-full max-w-md overflow-y-auto rounded-t-3xl bg-[var(--s-card)] shadow-2xl sm:rounded-3xl`} onClick={(e) => e.stopPropagation()}>
                {/* Stays at the top while the receipt scrolls */}
                <div className="sticky top-0 z-10 flex items-start justify-between gap-3 bg-gradient-to-r from-[#0f1a4a] to-[#1e3a8a] px-5 py-4 shadow-md">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[2px] text-blue-100">E-Ticket</p>
                        <h2 id="ticket-title" className="text-lg font-black text-white">{ticket.violation_details?.violation_type || 'Violation'}</h2>
                    </div>
                    <button onClick={close} aria-label="Close" className="rounded-full bg-white/15 p-2 text-white hover:bg-white/25">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-5">

                    {/* At a glance: where the ticket stands, time left, progress, building and deadline */}
                    {(() => {
                        const required = ticket.total_hours_required || 0;
                        const remaining = ticket.base_remaining_hours ?? ticket.remaining_hours ?? 0;
                        const pct = required ? Math.min(100, Math.round(((required - remaining) / required) * 100)) : 0;
                        const open = ['Active', 'Ongoing'].includes(ticket.status);
                        const deadline = summary.sections[1].lines.find(([label]) => label === 'Deadline');
                        const building = summary.buildings[summary.buildings.length - 1]?.name;
                        return (
                            <div className="s-card mb-4 rounded-[22px] p-4">
                                <div className="flex items-center gap-3">
                                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${headerStyle[0]}`}>
                                        <HeaderIcon size={20} className={headerStyle[1]} />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-[var(--s-text)]">{summary.header.title}</p>
                                        <p className="text-xs text-[var(--s-muted)]">{open ? 'Time left to serve' : summary.header.subtitle}</p>
                                    </div>
                                </div>
                                {open && (
                                    <>
                                        <p className="mt-3 text-[32px] font-bold leading-none tabular-nums tracking-tight text-[var(--s-text)]">{hoursMinutes(remaining)}</p>
                                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--s-border)]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Hours served">
                                            <div className="h-full rounded-full bg-[var(--s-accent)]" style={{ width: `${pct}%` }} />
                                        </div>
                                        <p className="mt-1.5 text-xs text-[var(--s-muted)]">{hoursMinutes(required - remaining)} of {hoursMinutes(required)} served</p>
                                    </>
                                )}
                                {(building || deadline) && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {building && (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--s-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--s-accent)]">
                                                <MapPin size={13} /> {building}
                                            </span>
                                        )}
                                        {deadline && (
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${deadline[2] === 'bad' ? 'bg-[#fee2e2] text-[#b91c1c] dark:bg-red-500/15 dark:text-red-300' : 'bg-[var(--s-bg)] text-[var(--s-muted)]'}`}>
                                                <CalendarClock size={13} /> Deadline {deadline[1]}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Students: the e-ticket to show a guard, full screen */}
                    {!forAdmin && (
                        <button onClick={() => setShowDigital(true)}
                            className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0f1a4a] to-[#1e3a8a] px-4 py-3.5 text-sm font-black text-white shadow-md hover:brightness-110">
                            <ScanFace size={18} /> Show digital e-ticket to guard
                        </button>
                    )}

                    {/* The blank forms to fill in by hand and bring to OSA: highlighted, they're easy to miss */}
                    {!forAdmin && ['Active', 'Ongoing', 'Completed'].includes(ticket.status) && (
                        <div className="mb-5 rounded-2xl border-2 border-[#f59e0b] bg-[#fffbeb] p-3.5 dark:bg-amber-500/10">
                            <p className="text-sm font-black text-[#92400e] dark:text-amber-200">Download your forms</p>
                            <p className="mb-3 mt-0.5 text-xs font-medium leading-4 text-[#b45309] dark:text-amber-300">
                                Fill them in and bring both to the OSA office. You can't be cleared without them.
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {[['iso', 'ISO Form'], ['reflection', 'Reflection Form']].map(([kind, label]) => (
                                    <button
                                        key={kind}
                                        onClick={() => downloadForm(kind)}
                                        disabled={!!formBusy}
                                        className="flex items-center justify-center gap-1.5 rounded-xl bg-[#f59e0b] px-3 py-3 text-xs font-black text-white shadow-sm hover:brightness-105 disabled:opacity-60"
                                    >
                                        {formBusy === kind ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* The full receipt, folded away: violation, required action, buildings assigned */}
                    <div className="s-card mb-5 overflow-hidden rounded-[22px]">
                        <button onClick={() => setShowDetails((v) => !v)} aria-expanded={showDetails} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left">
                            <span className="text-sm font-bold text-[var(--s-text)]">Ticket details</span>
                            <ChevronDown size={18} className={`shrink-0 text-[var(--s-muted)] transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                        </button>
                        {showDetails && (
                        <div className="border-t border-[var(--s-border)] px-4">
                            {summary.sections.map((section) => (
                                <div key={section.title} className="border-t border-dashed border-[var(--s-border)] py-3 first:border-t-0">
                                    <p className="mb-1 text-[9px] font-black uppercase tracking-[2px] text-[var(--s-muted)]">{section.title}</p>
                                    {section.lines.map(([label, value, tone]) => (
                                        <div key={label} className="flex items-baseline justify-between gap-4 py-1">
                                            <span className="shrink-0 text-[11px] font-semibold text-[var(--s-muted)]">{label}</span>
                                            <span className={`min-w-0 text-right text-[13px] font-bold ${toneClass[tone] || 'text-[var(--s-text)]'}`}>{value}</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                            {summary.buildings.length > 0 && (
                                <div className="border-t border-dashed border-[var(--s-border)] py-3">
                                    <p className="mb-1 text-[9px] font-black uppercase tracking-[2px] text-[var(--s-muted)]">Building{summary.buildings.length === 1 ? '' : 's'} Assigned</p>
                                    <ol className="space-y-1 py-1">
                                        {summary.buildings.map((b, i) => (
                                            <li key={i} className="flex items-baseline justify-between gap-4">
                                                <span className="min-w-0 text-[13px] font-bold text-[var(--s-text)]">
                                                    {summary.buildings.length > 1 && <span className="mr-1.5 text-[var(--s-muted)]">{i + 1}.</span>}{b.name}
                                                </span>
                                                {b.date && <span className="shrink-0 text-[11px] font-semibold text-[var(--s-muted)]">{b.date}</span>}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}
                        </div>
                        )}
                    </div>

                    {children}

                    <p className="mb-2 text-[10px] font-black uppercase tracking-[2px] text-[var(--s-muted)]">Service Log</p>
                    {error ? (
                        <div className="flex flex-col items-center gap-2.5 py-3">
                            <p className="text-center text-sm font-semibold text-red-500">{error}</p>
                            <button onClick={() => setAttempt((n) => n + 1)} className="rounded-lg border border-[var(--s-border)] px-4 py-2 text-[11px] font-black uppercase tracking-[1px] text-[var(--s-primary)]">
                                Try Again
                            </button>
                        </div>
                    ) : !receipts ? (
                        <div className="flex justify-center py-6">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--s-primary)] border-t-transparent" />
                        </div>
                    ) : days.length === 0 ? (
                        <p className="rounded-xl bg-[var(--s-bg)] p-4 text-center text-[13px] italic text-[var(--s-muted)]">No sessions yet. Scan your building&apos;s QR code to start.</p>
                    ) : (
                        <div className="space-y-2">
                            {days.map(({ date, sessions }) => {
                                const open = openDate === date;
                                const total = sessions.reduce((sum, r) => sum + (r.duration_seconds || 0), 0);
                                const flagged = sessions.some((r) => FLAGGED_ENDS.includes(r.end_reason));
                                return (
                                    <div key={date} className="overflow-hidden rounded-xl border border-[var(--s-border)]">
                                        <button
                                            onClick={() => setOpenDate(open ? null : date)}
                                            aria-expanded={open}
                                            className="flex w-full items-center gap-3 p-3.5 text-left"
                                        >
                                            <span className={`h-2 w-2 shrink-0 rounded-full ${flagged ? 'bg-red-500' : 'bg-[var(--s-success)]'}`} />
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-[13px] font-bold text-[var(--s-text)]">{date}</span>
                                                <span className="block text-[11px] text-[var(--s-muted)]">
                                                    {sessions.length} session{sessions.length > 1 ? 's' : ''} · {formatDuration(total)} served
                                                </span>
                                            </span>
                                            <ChevronDown size={18} className={`shrink-0 text-[var(--s-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
                                        </button>
                                        {open && (
                                            <div className="space-y-2 border-t border-[var(--s-border)] bg-[var(--s-bg)] p-3">
                                                {sessions.map((r, i) => {
                                                    const sessionOpen = openSessions.has(r.id);
                                                    const stopped = FLAGGED_ENDS.includes(r.end_reason);
                                                    return (
                                                        <div key={r.id} className="overflow-hidden rounded-xl bg-[var(--s-card)]">
                                                            <button
                                                                onClick={() => toggleSession(r.id)}
                                                                aria-expanded={sessionOpen}
                                                                className="flex w-full items-center gap-2.5 p-3 text-left"
                                                            >
                                                                <LogIn size={15} className={`shrink-0 ${stopped ? 'text-red-500' : 'text-[var(--s-primary)]'}`} />
                                                                <span className="flex-1 text-[13px] font-bold text-[var(--s-text)]">
                                                                    Session {i + 1}
                                                                </span>
                                                                <ChevronDown size={16} className={`shrink-0 text-[var(--s-muted)] transition-transform ${sessionOpen ? 'rotate-180' : ''}`} />
                                                            </button>
                                                            {sessionOpen && (
                                                                <div className="border-t border-[var(--s-border)] px-3.5 pb-2">
                                                                    <SessionReceiptBody receipt={r} hideDate />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
        </>
    );
};

export default TicketDetails;
