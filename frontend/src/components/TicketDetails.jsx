import { useEffect, useState } from 'react';
import { X, ChevronDown, MapPin, LogIn } from 'lucide-react';
import { SessionReceiptBody, receiptDate, receiptTime, formatDuration, FLAGGED_ENDS } from './SessionReceipt';

// Opened by tapping an e-ticket on the student dashboard: the ticket, then its service log grouped by
// date. Each date is a toggle listing that day's sessions by time in; tapping a time in opens its
// receipt (several can be open at once). Mirrors mobile/components/TicketDetails.jsx.
const TicketDetails = ({ ticket, onClose }) => {
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

    useEffect(() => {
        if (!ticket) return;
        fetch(`/api/timelogs/receipts/?eticket_id=${ticket.id}`)
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((data) => setReceipts(Array.isArray(data) ? data : []))
            .catch(() => setError("Couldn't load your service log."));
    }, [ticket?.id]);

    if (!ticket) return null;

    // Newest day first (the API's order); sessions within a day oldest first
    const days = [];
    (receipts || []).forEach((r) => {
        const date = receiptDate(r.time_in);
        const day = days.find((d) => d.date === date);
        if (day) day.sessions.unshift(r);
        else days.push({ date, sessions: [r] });
    });

    const building = ticket.assigned_site?.name || ticket.assigned_location || '—';
    const remaining = ticket.base_remaining_hours ?? ticket.remaining_hours ?? 0;

    return (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="ticket-title" onClick={onClose}>
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

                <div className="mb-5 grid grid-cols-2 gap-2">
                    <div className="col-span-2 rounded-xl bg-[var(--s-bg)] p-3">
                        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[1px] text-[var(--s-muted)]"><MapPin size={12} /> Assigned Building</p>
                        <p className="mt-0.5 text-sm font-bold text-[var(--s-text)]">{building}</p>
                    </div>
                    <div className="rounded-xl bg-[var(--s-bg)] p-3">
                        <p className="text-[10px] font-black uppercase tracking-[1px] text-[var(--s-muted)]">Required</p>
                        <p className="mt-0.5 text-sm font-bold text-[var(--s-text)]">{ticket.total_hours_required || 0} hrs</p>
                    </div>
                    <div className="rounded-xl bg-[var(--s-bg)] p-3">
                        <p className="text-[10px] font-black uppercase tracking-[1px] text-[var(--s-muted)]">Remaining</p>
                        <p className="mt-0.5 text-sm font-bold text-[var(--s-text)]">{formatDuration(remaining * 3600)}</p>
                    </div>
                </div>

                <p className="mb-2 text-[10px] font-black uppercase tracking-[2px] text-[var(--s-muted)]">Service Log</p>
                {error ? (
                    <p className="text-sm font-semibold text-red-500">{error}</p>
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
                                            {sessions.map((r) => {
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
                                                                Time In <span className="font-semibold text-[var(--s-muted)]">· {receiptTime(r.time_in)}</span>
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
