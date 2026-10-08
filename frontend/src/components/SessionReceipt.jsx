import { MapPin, MapPinOff, LogIn, LogOut, Timer, AlertTriangle, CheckCircle2, CalendarDays } from 'lucide-react';

// Time-out receipt for one service session (timelog_receipt in backend/core/views.py), in the student
// theme (the --s-* colors of .student-ui). Shown after time out and in the e-ticket's service log.
// "Ended By" is the proof of how it ended: scanned the QR code, left the service area (and how far
// away), location off, and so on.
// Mirrors mobile/components/SessionReceipt.jsx.

const PH = { timeZone: 'Asia/Manila' };
export const receiptDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-PH', { ...PH, weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }) : '—';
export const receiptTime = (iso) => iso ? new Date(iso).toLocaleTimeString('en-PH', { ...PH, hour: 'numeric', minute: '2-digit' }) : '—';

export const formatDuration = (seconds) => {
    const s = Math.max(0, Math.round(seconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h ? `${h}h ${m}m ${sec}s` : m ? `${m}m ${sec}s` : `${sec}s`;
};

// Stopped by the system rather than by scanning out
export const FLAGGED_ENDS = ['left_area', 'location_off', 'app_closed', 'idle'];


// highlight: the label is coloured too (Time In green, Time Out red)
const Line = ({ icon: Icon, label, value, color, highlight = false }) => (
    <div className="flex items-start justify-between gap-4 border-b border-dashed border-[var(--s-border)] py-2.5 last:border-0">
        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--s-muted)]" style={highlight ? { color } : undefined}>
            <Icon size={14} className="shrink-0" /> {label}
        </span>
        <span className="text-right text-sm font-bold" style={{ color: color || 'var(--s-text)' }}>{value}</span>
    </div>
);

export const SessionReceiptBody = ({ receipt, hideDate = false }) => {
    const flagged = FLAGGED_ENDS.includes(receipt.end_reason);
    return (
        <div>
            {!hideDate && <Line icon={CalendarDays} label="Date" value={receiptDate(receipt.time_in)} />}
            <Line icon={MapPin} label="Assigned Building" value={receipt.building ? `${receipt.building}${receipt.site_code ? ` (${receipt.site_code})` : ''}` : '—'} />
            <Line icon={LogIn} label="Time In" value={receiptTime(receipt.time_in)} color="#059669" highlight />
            <Line icon={LogOut} label="Time Out" value={receipt.time_out ? receiptTime(receipt.time_out) : 'Still running'} color="#dc2626" highlight />
            <Line icon={Timer} label="Time Served" value={formatDuration(receipt.duration_seconds)} />
            {/* Time outside the service area: the timer was paused, so it isn't part of Time Served */}
            <Line
                icon={MapPinOff}
                label="Out of Area"
                value={receipt.paused_seconds > 0 ? formatDuration(receipt.paused_seconds) : 'None'}
                color={receipt.paused_seconds > 0 ? '#b45309' : undefined}
            />
            <Line
                icon={flagged ? AlertTriangle : CheckCircle2}
                label="Ended By"
                value={`${receipt.end_reason_label || '—'}${receipt.out_distance_m != null && flagged ? ` (${receipt.out_distance_m} m away)` : ''}`}
                color={flagged ? '#dc2626' : '#059669'}
            />

        </div>
    );
};

// Pop-up shown right after a session ends
const SessionReceipt = ({ receipt, onClose }) => {
    if (!receipt) return null;
    const flagged = FLAGGED_ENDS.includes(receipt.end_reason);
    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="receipt-title" onClick={onClose}>
            <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-[var(--s-card)] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-3 text-center">
                    <div className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full ${flagged ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {flagged ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
                    </div>
                    <h2 id="receipt-title" className="text-lg font-black text-[var(--s-text)]">Time-Out Receipt</h2>
                    <p className="text-xs font-semibold text-[var(--s-muted)]">
                        {receipt.already_ended ? 'Your timer had already stopped.' : flagged ? 'Your timer was stopped automatically.' : 'Your session was recorded.'}
                        {receipt.remaining_hours != null && ` ${formatDuration(receipt.remaining_hours * 3600)} left to serve.`}
                    </p>
                </div>
                <SessionReceiptBody receipt={receipt} />
                <button onClick={onClose} className="mt-5 w-full rounded-xl bg-[var(--s-primary)] py-3 text-sm font-bold uppercase tracking-widest text-white">
                    Done
                </button>
            </div>
        </div>
    );
};

export default SessionReceipt;
