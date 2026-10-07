import { useEffect, useState } from 'react';
import { X, FileText, ImageOff } from 'lucide-react';
import { studentName, reportedByLabel } from '../lib/names';
import TicketDetails from './TicketDetails';

// Opened by clicking a case in the admin Archives: the e-ticket receipt and its service log (the same view
// the student has, components/TicketDetails.jsx), plus the evidence OSA approved, the photos of the signed
// ISO form and the reflection paper. Cases approved with no service hours have no e-ticket: those show the
// violation and the evidence only.

const DOCUMENTS = [
    { kind: 'iso_form', label: 'ISO Form' },
    { kind: 'reflection', label: 'Reflection Paper' },
];

const fmtDate = (iso) => (iso
    ? new Date(iso).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—');

// Full-size photo in a new tab
const openPhoto = (image, title) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<title>${title.replace(/</g, '')}</title><body style="margin:0;background:#0f172a;display:flex;justify-content:center"><img src="${image}" style="max-width:100%;height:auto"></body>`);
    win.document.close();
};

const ClearanceEvidence = ({ violation }) => {
    // kind -> { state: 'loading' | 'ready' | 'removed' | 'missing' | 'error', image, uploaded_at, uploaded_by, message }
    const [photos, setPhotos] = useState({});

    useEffect(() => {
        DOCUMENTS.forEach(({ kind }) => {
            if (!violation[`${kind}_uploaded_at`] && !violation.photos_removed_at) {
                setPhotos((p) => ({ ...p, [kind]: { state: 'missing' } }));
                return;
            }
            setPhotos((p) => ({ ...p, [kind]: { state: 'loading' } }));
            fetch(`/api/violations/${violation.id}/clearance_proof/?kind=${kind}`)
                .then(async (r) => {
                    const data = await r.json().catch(() => ({}));
                    if (r.ok) return { state: 'ready', ...data };
                    if (r.status === 410) return { state: 'removed', message: data.error };
                    if (r.status === 404) return { state: 'missing' };
                    return { state: 'error', message: data.error || "Couldn't load the photo." };
                })
                .catch(() => ({ state: 'error', message: "Can't reach the server." }))
                .then((result) => setPhotos((p) => ({ ...p, [kind]: result })));
        });
        // The Archives refresh every 30 s with new objects: reload only when the case or its photos change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [violation.id, violation.photos_removed_at, violation.iso_form_uploaded_at, violation.reflection_uploaded_at]);

    const studentName = studentName(violation.student_details) || 'Student';

    return (
        <div className="mb-5">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[2px] text-[var(--s-muted)]">Submitted Evidence</p>
            {violation.photos_removed_at ? (
                <div className="flex items-start gap-3 rounded-xl bg-[var(--s-bg)] p-4">
                    <ImageOff size={18} className="mt-0.5 shrink-0 text-[var(--s-muted)]" />
                    <p className="text-[12px] font-semibold text-[var(--s-muted)]">
                        The photos were removed on {fmtDate(violation.photos_removed_at)}, one year after the case was cleared, to save space.
                        {violation.iso_form_uploaded_at && ` They were uploaded on ${fmtDate(violation.iso_form_uploaded_at)}.`}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    {DOCUMENTS.map(({ kind, label }) => {
                        const photo = photos[kind] || { state: 'loading' };
                        return (
                            <div key={kind} className="overflow-hidden rounded-xl border border-[var(--s-border)]">
                                {photo.state === 'ready' ? (
                                    <button onClick={() => openPhoto(photo.image, `${label} - ${studentName}`)} className="block w-full" title="Open full size">
                                        <img src={photo.image} alt={`${label} of ${studentName}`} className="h-32 w-full bg-white object-cover" />
                                    </button>
                                ) : (
                                    <div className="flex h-32 items-center justify-center bg-[var(--s-bg)] px-3 text-center">
                                        {photo.state === 'loading'
                                            ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--s-primary)] border-t-transparent" />
                                            : <span className="text-[11px] font-semibold text-[var(--s-muted)]">{photo.state === 'missing' ? 'Not uploaded' : photo.message}</span>}
                                    </div>
                                )}
                                <div className="border-t border-[var(--s-border)] px-3 py-2">
                                    <p className="flex items-center gap-1.5 text-[11px] font-black text-[var(--s-text)]"><FileText size={12} /> {label}</p>
                                    {photo.state === 'ready' && (
                                        <p className="mt-0.5 text-[10px] font-semibold text-[var(--s-muted)]">{fmtDate(photo.uploaded_at)}{photo.uploaded_by ? ` · ${photo.uploaded_by}` : ''}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {violation.cleared_at && (
                <p className="mt-2 text-[11px] font-semibold text-[var(--s-muted)]">
                    Approved {fmtDate(violation.cleared_at)}{violation.cleared_by ? ` by ${violation.cleared_by}` : ''}
                </p>
            )}
        </div>
    );
};

// A case with no e-ticket (approved with no service hours), or one OSA dismissed
const CaseWithoutTicket = ({ violation, onClose }) => {
    const dismissed = violation.status === 'Dismissed';
    const lines = [
        ['Student', `${studentName(violation.student_details) || '—'} (${violation.student_details?.student_id || '—'})`],
        ['Violation', violation.violation_type || '—'],
        ['Offense', `#${violation.offense_count || 1}`],
        ['Date caught', fmtDate(violation.created_at)],
        [reportedByLabel(violation.reporter_role), violation.reporting_guard || '—'],
        ...(dismissed ? [
            ['Status', 'Dismissed'],
            ['Reason', violation.dismissed_reason || 'Dismissed by OSA after review'],
            ...(violation.reporting_email ? [['Reporter email', violation.reporting_email]] : []),
            ['Dismissed on', fmtDate(violation.dismissed_at)],
        ] : [
            ['Sanction', violation.punishment || '—'],
            ['Service hours', 'None required'],
        ]),
    ];
    return (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" onClick={onClose}>
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[var(--s-card)] p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[2px] text-[var(--s-muted)]">Archived Case</p>
                        <h2 className="text-lg font-black text-[var(--s-text)]">{violation.violation_type || 'Violation'}</h2>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="rounded-full bg-[var(--s-bg)] p-2 text-[var(--s-muted)]"><X size={18} /></button>
                </div>
                <div className="mb-5 rounded-2xl border border-[var(--s-border)] px-4 py-2">
                    {lines.map(([label, value]) => (
                        <div key={label} className="flex items-baseline justify-between gap-4 py-1.5">
                            <span className="shrink-0 text-[11px] font-semibold text-[var(--s-muted)]">{label}</span>
                            <span className="min-w-0 text-right text-[13px] font-bold text-[var(--s-text)]">{value}</span>
                        </div>
                    ))}
                </div>
                {!dismissed && <ClearanceEvidence violation={violation} />}
            </div>
        </div>
    );
};

const ArchivedCase = ({ violation, ticket, onClose }) => (
    // receipt-colors (index.css) gives the receipt its colours on admin pages, in light and dark mode
    <div className="receipt-colors print:hidden">
        {ticket && violation.status !== 'Dismissed' ? (
            <TicketDetails ticket={ticket} onClose={onClose} forAdmin>
                <div className="mb-5 rounded-2xl border border-[var(--s-border)] px-4 py-3">
                    <p className="mb-1 text-[9px] font-black uppercase tracking-[2px] text-[var(--s-muted)]">Student</p>
                    <p className="text-[13px] font-bold text-[var(--s-text)]">
                        {studentName(violation.student_details) || '—'} <span className="font-semibold text-[var(--s-muted)]">({violation.student_details?.student_id || '—'})</span>
                    </p>
                    {violation.student_details?.course && (
                        <p className="text-[11px] font-semibold text-[var(--s-muted)]">{violation.student_details.course}</p>
                    )}
                </div>
                <ClearanceEvidence violation={violation} />
            </TicketDetails>
        ) : (
            <CaseWithoutTicket violation={violation} onClose={onClose} />
        )}
    </div>
);

export default ArchivedCase;
