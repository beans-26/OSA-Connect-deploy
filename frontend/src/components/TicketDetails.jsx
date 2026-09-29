import { useEffect, useState } from 'react';
import { X, ChevronDown, LogIn, CheckCircle2, Clock, FileText } from 'lucide-react';
import { ticketReceipt } from '../lib/ticketStatus';
import { SessionReceiptBody, receiptDate, formatDuration, FLAGGED_ENDS } from './SessionReceipt';

// Opened by tapping an e-ticket on the student dashboard: the ticket, then its service log grouped by
// date. Each date is a toggle listing that day's sessions (Session 1, 2, ...); tapping one opens its
// receipt (several can be open at once). Mirrors mobile/components/TicketDetails.jsx.
// The admin Archives open it too (forAdmin), with `children` shown under the ticket (the clearance photos).
const TicketDetails = ({ ticket, onClose, children, forAdmin = false }) => {
    const [receipts, setReceipts] = useState(null);
    const [error, setError] = useState('');
    const [openDate, setOpenDate] = useState(null);
    const [openSessions, setOpenSessions] = useState(() => new Set());

    const toggleSession = (id) => setOpenSessions((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });

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
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="ticket-title" onClick={onClose}>
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[var(--s-card)] p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[2px] text-[var(--s-muted)]">E-Ticket</p>
                        <h2 id="ticket-title" className="text-lg font-black text-[var(--s-text)]">{ticket.violation_details?.violation_type || 'Violation'}</h2>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="rounded-full bg-[var(--s-bg)] p-2 text-[var(--s-muted)]">
                        <X size={18} />
                    </button>
                </div>

                {/* The ticket as a short receipt: violation, required action, buildings assigned */}
                <div className="mb-5 overflow-hidden rounded-2xl border border-[var(--s-border)]">
                    <div className={`flex items-center gap-3 border-b px-4 py-3 ${headerStyle[0]}`}>
                        <HeaderIcon size={20} className={`shrink-0 ${headerStyle[1]}`} />
                        <div className="min-w-0">
                            <p className={`text-sm font-black ${headerStyle[1]}`}>{summary.header.title}</p>
                            <p className={`text-[11px] font-semibold ${headerStyle[2]}`}>{summary.header.subtitle}</p>
                        </div>
                    </div>
                    <div className="px-4">
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
    );
};

export default TicketDetails;
