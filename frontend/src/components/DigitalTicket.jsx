import { useEffect, useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { ticketStatusLabel } from '../lib/ticketStatus';
import { studentName } from '../lib/names';

// The digital e-ticket a student shows a guard (opened from the ticket's details, components/TicketDetails.jsx):
// who they are, the violation, where the case stands and their service. The clock at the bottom runs live, so a
// guard can tell it's the real page and not a screenshot. Mirrors mobile/components/DigitalTicket.jsx.

// Colors of the status band, by the database status
const STATUS_TONE = {
    Active: 'bg-[#1e3a8a] text-white',
    Ongoing: 'bg-[#047857] text-white',
    Completed: 'bg-[#b45309] text-white',
    Cleared: 'bg-[#334155] text-white',
    Dismissed: 'bg-[#b91c1c] text-white',
};

// The watermark: the student ID and the time to the second, in rows across the card, drifting sideways.
// Browsers can't block screenshots (iPhone students use the website), but a screenshot freezes the watermark and
// its time, so a guard can tell a picture from the real page. Mirrors the app's (which also blocks screenshots).
const WATERMARK_CSS = `@keyframes ticket-drift { from { transform: rotate(-24deg) translateX(-160px); } to { transform: rotate(-24deg) translateX(0); } }
@media (prefers-reduced-motion: reduce) { .ticket-watermark { animation-duration: 20s !important; } }`;
const Watermark = ({ studentId, time }) => {
    const row = Array.from({ length: 4 }, () => `${studentId} · ${time}`).join('      ');
    return (
        <div aria-hidden="true" className="pointer-events-none absolute -inset-x-32 -inset-y-16 -z-10 flex select-none items-center">
            <style>{WATERMARK_CSS}</style>
            <div className="ticket-watermark" style={{ animation: 'ticket-drift 6s linear infinite' }}>
                {Array.from({ length: 9 }, (_, i) => (
                    <p key={i} className="whitespace-nowrap text-[13px] font-black leading-[30px] tabular-nums text-[#1e3a8a]/[0.09]" style={i % 2 ? { marginLeft: 80 } : undefined}>{row}</p>
                ))}
            </div>
        </div>
    );
};

const manila = (date, options) => date.toLocaleString('en-PH', { timeZone: 'Asia/Manila', ...options });
const fmtDay = (iso) => {
    const d = iso ? new Date(iso) : null;
    return d && !Number.isNaN(d.getTime()) ? manila(d, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
};
// "3h 05m"
const hoursMinutes = (hours) => {
    const mins = Math.max(0, Math.round((hours || 0) * 60));
    return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
};

const Line = ({ label, value, tone }) => (
    <div className="flex items-baseline justify-between gap-4 py-1">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        <span className={`min-w-0 text-right text-sm font-bold ${tone || 'text-slate-900'}`}>{value}</span>
    </div>
);

const DigitalTicket = ({ ticket, onClose }) => {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    if (!ticket) return null;

    const v = ticket.violation_details || {};
    const student = v.student_details || {};
    const required = ticket.total_hours_required || 0;
    const remaining = ticket.base_remaining_hours ?? ticket.remaining_hours ?? 0;
    const open = ['Active', 'Ongoing'].includes(ticket.status);
    const building = ticket.assigned_location || v.assigned_building;
    const ticketNo = String(ticket.id || '').slice(-8).toUpperCase();

    return (
        <div className="sheet-fade fixed inset-0 z-[80] flex items-center justify-center bg-[#0b1437]/90 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="digital-ticket-title" onClick={onClose}>
            <div className="w-full max-w-sm overflow-hidden rounded-[28px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="relative bg-gradient-to-r from-[#0f1a4a] to-[#1e3a8a] px-5 pb-4 pt-5 text-white">
                    <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-full bg-white/15 p-2 hover:bg-white/25">
                        <X size={18} />
                    </button>
                    <p className="text-[10px] font-black uppercase tracking-[2px] text-blue-100">USTP Office of Student Affairs</p>
                    <h2 id="digital-ticket-title" className="mt-0.5 text-xl font-black">Digital E-Ticket</h2>
                    <p className="mt-1 font-mono text-xs font-bold text-blue-100">No. {ticketNo}</p>
                </div>

                {/* Where the case stands, big enough to read at arm's length */}
                <div className={`flex items-center justify-center gap-2 px-5 py-3 text-center ${STATUS_TONE[ticket.status] || 'bg-slate-700 text-white'}`}>
                    <ShieldCheck size={20} />
                    <p className="text-lg font-black uppercase tracking-wide">{ticketStatusLabel(ticket)}</p>
                </div>

                <div className="relative isolate overflow-hidden px-5 py-4">
                    <Watermark studentId={student.student_id || ''} time={manila(now, { hour: 'numeric', minute: '2-digit', second: '2-digit' })} />
                    {/* The student */}
                    <p className="truncate text-lg font-black text-slate-900">{studentName(student) || student.name || '—'}</p>
                    <p className="font-mono text-sm font-bold text-slate-600">{student.student_id || '—'}</p>
                    {student.course && <p className="truncate text-xs font-semibold text-slate-500">{student.course}</p>}

                    {/* The violation */}
                    <div className="mt-3 border-t border-dashed border-slate-200 pt-2">
                        <Line label="Violation" value={v.violation_type || '—'} tone="text-[#dc2626]" />
                        <Line label="Offense" value={`#${v.offense_count || 1}`} />
                        <Line label="Reported" value={fmtDay(v.created_at)} />
                    </div>

                    {/* The community service */}
                    <div className="mt-2 border-t border-dashed border-slate-200 pt-2">
                        <Line label="Service site" value={building || '—'} />
                        <Line label="Hours required" value={hoursMinutes(required)} />
                        <Line label={open ? 'Time left' : 'Time served'} value={hoursMinutes(open ? remaining : required - remaining)} />
                        {open && ticket.deadline && <Line label="Deadline" value={fmtDay(new Date(Date.parse(ticket.deadline) - 1).toISOString())} />}
                        {ticket.status === 'Cleared' && <Line label="Cleared" value={fmtDay(v.cleared_at)} tone="text-[#047857]" />}
                    </div>
                </div>

                {/* Live clock: it keeps ticking, so a screenshot shows a stopped time */}
                <div className="flex items-center justify-center gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </span>
                    <p className="text-xs font-bold tabular-nums text-slate-600">
                        {manila(now, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · {manila(now, { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DigitalTicket;
