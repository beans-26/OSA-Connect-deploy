import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Ticket } from 'lucide-react';
import saluteFace from '../../assets/salute.png';
import { ticketStatusLabel } from '../../lib/ticketStatus';
import TicketDetails from '../../components/TicketDetails';
import StudentGuide from '../../components/StudentGuide';
import { useStudentShell } from '../../components/StudentShell';

// Status pills in the admin feed's style: small, uppercase, tinted
const ticketBadge = (status) =>
    status === 'Active' ? 'bg-[#e8ecf8] text-[#1e3a8a] dark:bg-blue-500/15 dark:text-blue-300' :
    status === 'Ongoing' ? 'bg-[#dcfce7] text-[#047857] dark:bg-emerald-500/15 dark:text-emerald-300' :
    status === 'Completed' ? 'bg-[#fef3c7] text-[#b45309] dark:bg-amber-500/15 dark:text-amber-300' :
    status === 'Cleared' ? 'bg-[#f1f5f9] text-[#64748b] dark:bg-slate-500/20 dark:text-slate-300' :
    'bg-[#faf5ff] text-[#7c3aed] dark:bg-violet-500/15 dark:text-violet-300';

// The E-Tickets tab (mirrors mobile/app/student/etickets.jsx): every e-ticket. "How to serve your hours" opens
// from the book icon at the top right of the header (components/StudentShell.jsx), when there's an open one. Tapping a ticket opens its service log and forms. The list is the shell's copy
// (the dashboard and the shell keep it fresh), so opening this page doesn't download it again.
const ETickets = () => {
    const { records, recordsLoaded, reload, guideAsk } = useStudentShell();
    const tickets = records.tickets;
    const [openTicket, setOpenTicket] = useState(null);
    const [guideTicket, setGuideTicket] = useState(null);
    useEffect(() => { reload(); }, [reload]);

    const guideFor = tickets.find((t) => t.status === 'Ongoing') || tickets.find((t) => t.status === 'Active');
    // The book icon in the header (top right) opens "How to serve your hours"
    // (only taps made while this page is open: coming back to the page doesn't reopen it)
    const askSeen = useRef(guideAsk);
    useEffect(() => {
        if (guideAsk === askSeen.current) return;
        askSeen.current = guideAsk;
        if (guideFor) setGuideTicket(guideFor);
    }, [guideAsk]); // eslint-disable-line react-hooks/exhaustive-deps
    // Keep an open ticket's details current as the list refreshes
    const shown = openTicket && (tickets.find((t) => t.id === openTicket.id) || openTicket);

    return (
        <main className="mx-auto w-full max-w-xl px-4 pb-10 pt-4">
            {!recordsLoaded ? (
                <div className="mt-8 flex justify-center">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--s-primary)] border-t-transparent" />
                </div>
            ) : tickets.length === 0 ? (
                <div className="mt-10 flex flex-col items-center gap-2 text-[var(--s-border)]">
                    {/* 🫡 in black and white (Noto emoji art as an image, so every device shows it) */}
                    <img src={saluteFace} alt="" className="h-11 w-11 select-none" draggable="false" />
                    <p className="text-[13px] italic text-[var(--s-muted)]">No e-tickets. You have no community service to serve.</p>
                </div>
            ) : (
                tickets.map((ticket, idx) => (
                    <button
                        key={ticket.id || idx}
                        onClick={() => setOpenTicket(ticket)}
                        className="s-card mb-2.5 flex w-full items-center gap-3 rounded-[20px] p-3.5 text-left hover:border-[var(--s-primary)]"
                    >
                        {/* Icon in a soft circle, like the admin violators feed */}
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${ticket.status === 'Active' || ticket.status === 'Ongoing' ? 'bg-[#dbeafe] text-[#1d4ed8] dark:bg-blue-500/15 dark:text-blue-300' : 'bg-[#f1f5f9] text-[#64748b] dark:bg-slate-500/20 dark:text-slate-300'}`}>
                            <Ticket size={20} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-black uppercase tracking-[0.5px] text-[#dc2626] dark:text-red-400">{ticket.violation_details?.violation_type || 'Violation'}</p>
                            <p className="mt-0.5 truncate text-[13px] font-bold text-[var(--s-text)]">Ticket #{ticket.id}</p>
                            <p className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.5px] ${ticketBadge(ticket.status)}`}>
                                    {ticketStatusLabel(ticket)}
                                </span>
                                <span className="text-[11px] font-semibold text-[var(--s-muted)]">{Math.round((ticket.total_hours_required || 0) * 100) / 100} hrs required</span>
                            </p>
                        </div>
                        <ChevronRight size={16} className="ml-2 shrink-0 text-[var(--s-muted)]" />
                    </button>
                ))
            )}
            <TicketDetails ticket={shown} onClose={() => setOpenTicket(null)} />
            <StudentGuide ticket={guideTicket} onClose={() => setGuideTicket(null)} onOpenTicket={(t) => { setGuideTicket(null); setOpenTicket(t); }} />
        </main>
    );
};

export default ETickets;
