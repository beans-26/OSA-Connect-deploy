import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import QRCode from 'react-qr-code';
import {
    AlertTriangle,
    Clock,
    FileText,
    User,
    Check,
    Search,
    Eye,
    Calendar,
    BookOpen,
    Hash,
    MapPin,
    Building2,
    Pencil,
    ChevronDown,
    Mail,
    Phone,
    Award,
    UserCheck,
    ClipboardList,
    QrCode,
    CheckCircle,
    Loader2,
    Archive,
    Sparkles
} from 'lucide-react';
import { timeGreeting, todayLabel, adminStatusLine } from '../lib/greeting';
import { useServiceSites, ServiceSiteOptions, postAssignment } from '../components/useServiceSites';
import { DEPARTMENTS, GENDERS, departmentShort } from '../lib/academics';
import { ticketStatusLabel } from '../lib/ticketStatus';
import ThemeToggle from '../components/ThemeToggle';
import usePolling from '../lib/usePolling';
import { studentName, reportedByLabel } from '../lib/names';


// The two documents the student brings to OSA to be cleared (ClearanceProof kinds on the server)
const CLEARANCE_FILES = [
    { kind: 'iso_form', label: 'ISO Form', hint: 'Signed FM-USTP-OSA-013' },
    { kind: 'reflection', label: 'Reflection Paper', hint: "The student's written reflection" },
];

// Hours served but not yet cleared: the student brings the signed ISO form and reflection paper to OSA
const awaitsClearance = (report, ticket) => ticket?.status === 'Completed' && report.status !== 'Cleared';

const fmtHours = (hours) => {
    const minutes = Math.max(0, Math.round((hours || 0) * 60));
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
};
const fmtDate = (iso, withTime = false) => (iso
    ? new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}) })
    : '—');

/* ─── Completion receipt: what the admin checks before clearing a finished student ── */
const CompletionReceipt = ({ report, ticket }) => {
    const [sessions, setSessions] = useState(null);
    useEffect(() => {
        if (!ticket?.id) return;
        fetch(`/api/timelogs/receipts/?eticket_id=${ticket.id}`)
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => setSessions(Array.isArray(data) ? data : []))
            .catch(() => setSessions([]));
    }, [ticket?.id]);

    const student = report.student_details || {};
    const year = /^\d+$/.test(student.year_level || '') ? `Year ${student.year_level}` : student.year_level;
    const required = ticket?.total_hours_required || 0;
    const added = ticket?.added_hours || 0;
    const served = required - (ticket?.remaining_hours || 0);
    const finishedAt = sessions?.length ? sessions[0].time_out || sessions[0].time_in : null;  // newest first
    const deadlineMet = ticket?.deadline && finishedAt ? Date.parse(finishedAt) < Date.parse(ticket.deadline) : null;
    // Every building the admin assigned (older violations only know the current one)
    const buildings = report.building_history?.length
        ? report.building_history
        : [{ name: report.assigned_building || ticket?.assigned_location, at: null }].filter((b) => b.name);

    const Line = ({ label, value, accent }) => (
        <div className="flex items-baseline justify-between gap-4 py-1.5">
            <span className="shrink-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</span>
            <span className={`min-w-0 text-right text-[13px] font-bold ${accent || 'text-slate-800 dark:text-slate-200'}`}>{value || '—'}</span>
        </div>
    );
    const Section = ({ title, children }) => (
        <div className="py-3 border-t border-dashed border-slate-300 dark:border-slate-600 first:border-t-0">
            <p className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{title}</p>
            {children}
        </div>
    );

    return (
        <div className="rounded-[24px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 bg-emerald-50 dark:bg-emerald-500/10 border-b border-emerald-100 dark:border-emerald-500/20">
                <CheckCircle size={22} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                    <p className="text-sm font-black text-emerald-800 dark:text-emerald-300">Community Service Completed</p>
                    <p className="text-[11px] font-semibold text-emerald-700/80 dark:text-emerald-400/80">Receipt · {finishedAt ? fmtDate(finishedAt, true) : 'hours served'}</p>
                </div>
            </div>
            <div className="px-5 pb-2">
                <Section title="Student">
                    <Line label="Name" value={studentName(student)} />
                    <Line label="Student ID" value={student.student_id} />
                    <Line label="Course" value={[student.course, year].filter(Boolean).join(' · ')} />
                    <Line label="Department" value={departmentShort(student.department)} />
                </Section>
                <Section title="Violation">
                    <Line label="Violation" value={report.violation_type} accent="text-red-600 dark:text-red-400" />
                    <Line label="Offense" value={`#${report.offense_count || 1}`} />
                    <Line label="Date caught" value={fmtDate(report.created_at, true)} />
                    <Line label={reportedByLabel(report.reporter_role)} value={report.reporting_guard} />
                </Section>
                <Section title="Required Action">
                    <Line label="Sanction" value={report.punishment} />
                    <Line label="Hours required" value={`${fmtHours(required)}${added ? ` (+${added}h missed days)` : ''}`} />
                    <Line label="Hours served" value={fmtHours(served)} accent="text-emerald-600 dark:text-emerald-400" />
                    <Line label="Sessions" value={sessions ? String(sessions.length) : '…'} />
                    {ticket?.deadline && (
                        <Line
                            label="Deadline"
                            value={`${fmtDate(new Date(Date.parse(ticket.deadline) - 1).toISOString())}${deadlineMet === null ? '' : deadlineMet ? ' · met' : ' · missed'}`}
                            accent={deadlineMet === false ? 'text-red-600 dark:text-red-400' : undefined}
                        />
                    )}
                </Section>
                <Section title={`Building${buildings.length === 1 ? '' : 's'} Assigned`}>
                    {buildings.length ? (
                        <ol className="space-y-1.5 py-1">
                            {buildings.map((b, i) => (
                                <li key={i} className="flex items-baseline justify-between gap-4">
                                    <span className="min-w-0 text-[13px] font-bold text-slate-800 dark:text-slate-200">
                                        <span className="mr-1.5 text-slate-400">{i + 1}.</span>{b.name}
                                    </span>
                                    <span className="shrink-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{b.at ? fmtDate(b.at) : 'First'}</span>
                                </li>
                            ))}
                        </ol>
                    ) : <Line label="Building" value="—" />}
                </Section>
            </div>
        </div>
    );
};

/* ─── Violation Detail Modal ──────────────────────────────────────── */
const ViolationModal = ({ report, ticket, onClose, onAction, onReassigned, onCleared }) => {
    const [showProfile, setShowProfile] = useState(false);
    const [editingBuilding, setEditingBuilding] = useState(false);
    const [newBuilding, setNewBuilding] = useState('');
    const [savingBuilding, setSavingBuilding] = useState(false);
    const [buildingError, setBuildingError] = useState('');
    const serviceSites = useServiceSites();
    // Clearance: the two photos by kind (taken with the phone camera link) and the approve in progress
    const [proofs, setProofs] = useState({});
    const [proofsLoading, setProofsLoading] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [clearError, setClearError] = useState('');
    const clearance = report && awaitsClearance(report, ticket);
    const bothUploaded = CLEARANCE_FILES.every((f) => proofs[f.kind]?.image);

    useEffect(() => {
        if (!clearance) return;
        const uploaded = CLEARANCE_FILES.filter((f) => report[`${f.kind}_uploaded_at`]);
        if (!uploaded.length) return;
        setProofsLoading(true);
        Promise.all(uploaded.map((f) => fetch(`/api/violations/${report.id}/clearance_proof/?kind=${f.kind}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)))
            .then((results) => setProofs(Object.fromEntries(results.filter(Boolean).map((d) => [d.kind, d]))))
            .finally(() => setProofsLoading(false));
    }, [report?.id, clearance]);

    // Taking the photos with a phone: a QR code for the phone capture page (signed link, 30 min). While it's
    // shown, new photos from the phone are picked up every 3 s.
    const [phoneLink, setPhoneLink] = useState(null);
    const [linkLoading, setLinkLoading] = useState(false);
    const seenUploads = useRef({});
    const showPhoneLink = async () => {
        setLinkLoading(true);
        setClearError('');
        try {
            const response = await fetch(`/api/violations/${report.id}/capture_link/`, { method: 'POST' });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || "Couldn't make the QR code.");
            setPhoneLink({ url: `${window.location.origin}/capture/${data.token}`, expiresAt: Date.now() + data.expires_in * 1000 });
        } catch (e) {
            setClearError(e.message === 'Failed to fetch' ? "Can't reach the server. Please try again." : e.message);
        } finally {
            setLinkLoading(false);
        }
    };
    useEffect(() => {
        if (!phoneLink || !report) return;
        CLEARANCE_FILES.forEach((f) => { seenUploads.current[f.kind] ??= report[`${f.kind}_uploaded_at`] || null; });
        const check = async () => {
            if (Date.now() > phoneLink.expiresAt) { setPhoneLink(null); return; }
            try {
                const latest = await fetch(`/api/violations/${report.id}/`).then((r) => (r.ok ? r.json() : null));
                if (!latest) return;
                for (const f of CLEARANCE_FILES) {
                    const at = latest[`${f.kind}_uploaded_at`] || null;
                    if (!at || at === seenUploads.current[f.kind]) continue;
                    seenUploads.current[f.kind] = at;
                    const proof = await fetch(`/api/violations/${report.id}/clearance_proof/?kind=${f.kind}`).then((r) => (r.ok ? r.json() : null));
                    if (proof) setProofs((prev) => ({ ...prev, [f.kind]: proof }));
                }
            } catch { /* try again on the next check */ }
        };
        const timer = setInterval(check, 3000);
        return () => clearInterval(timer);
    }, [phoneLink, report?.id]);

    const approveClearance = async () => {
        setClearing(true);
        setClearError('');
        try {
            const response = await fetch(`/api/violations/${report.id}/clear/`, { method: 'POST' });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || "Couldn't clear the violation.");
            onCleared();
        } catch (e) {
            setClearError(e.message === 'Failed to fetch' ? "Can't reach the server. Please try again." : e.message);
        } finally {
            setClearing(false);
        }
    };

    if (!report) return null;
    const student = report.student_details || {};

    const formatRemainingTime = (hours) => {
        if (!hours && hours !== 0) return '—';
        const h = Math.floor(hours);
        const m = Math.floor((hours - h) * 60);
        return `${h}h ${m}m remaining`;
    };

    const statusColor = (s = '') => {
        const sl = s.toLowerCase();
        if (sl.includes('pending')) return 'bg-orange-100 text-orange-800';
        if (sl.includes('approved') || sl === 'serving now' || sl === 'in progress') return 'bg-green-100 text-green-800';
        if (sl === 'not started') return 'bg-slate-100 text-slate-700';
        if (sl === 'finished') return 'bg-blue-100 text-blue-800';
        if (sl.includes('dismissed')) return 'bg-red-100 text-red-800';
        if (sl === 'completed') return 'bg-blue-100 text-blue-800';
        return 'bg-slate-100 text-slate-700 dark:text-slate-300';
    };

    const currentStatus = ticket ? ticketStatusLabel(ticket) : report.status;
    const remainingHours = ticket?.remaining_hours;
    const isPending = (report.status || '').toLowerCase().includes('pending');
    // Service site chosen on approval; older reports only have it on the e-ticket
    const assignedBuilding = report.assigned_building || ticket?.assigned_location;
    const canChangeBuilding = !isPending && ticket?.status !== 'Ongoing';

    // Moves the violation (and its ticket) to another service site; asks first if that site is full
    const saveBuilding = async () => {
        setSavingBuilding(true);
        setBuildingError('');
        try {
            const { ok, cancelled, data } = await postAssignment(`/api/violations/${report.id}/reassign/`, { assigned_building: newBuilding });
            if (ok) {
                setEditingBuilding(false);
                onReassigned(data.assigned_building);
            } else if (!cancelled) {
                setBuildingError(data.error || "Couldn't change the building.");
            }
        } catch {
            setBuildingError("Can't reach the server. Please try again.");
        } finally {
            setSavingBuilding(false);
        }
    };

    // One label/value line of the details, like the completion receipt
    const Line = ({ label, value, accent }) => (
        <div className="flex items-baseline justify-between gap-4 py-1.5">
            <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
            <span className={`min-w-0 text-right text-[13px] font-bold ${accent || 'text-slate-800 dark:text-slate-200'}`}>{value || '—'}</span>
        </div>
    );
    const SectionTitle = ({ icon: Icon, children }) => (
        <h4 className="mb-2 ml-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            <Icon size={12} /> {children}
        </h4>
    );
    const caughtAt = report.created_at
        ? new Date(report.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
        : '—';
    // Hours so far for the progress bar (open tickets only)
    const requiredHours = ticket?.total_hours_required || 0;
    const servedShare = requiredHours && remainingHours != null ? Math.min(1, Math.max(0, (requiredHours - remainingHours) / requiredHours)) : 0;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-md"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-800 rounded-[28px] shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 border-b border-blue-100 dark:border-slate-700/50 px-5 py-4 md:px-6 md:py-5 relative">
                    <div className="flex items-center gap-4">
                        {/* The student's initials, like the other receipts */}
                        <div className="w-12 h-12 shrink-0 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-blue-100 dark:border-slate-700 text-sm font-black text-ustp-blue dark:text-blue-300">
                            {(studentName(student) || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-lg font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                                {studentName(student) || 'Unknown Student'}
                            </h2>
                            <div className="flex items-center gap-2.5 mt-1">
                                <p className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                                    {student.student_id || 'No ID'}
                                </p>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${statusColor(currentStatus)} shadow-sm`}>
                                    {currentStatus}
                                </span>
                            </div>
                            <button
                                onClick={() => setShowProfile((v) => !v)}
                                aria-expanded={showProfile}
                                className="mt-2 flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-slate-600 bg-white/70 dark:bg-slate-800 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-ustp-blue dark:text-blue-400 hover:border-ustp-blue"
                            >
                                <User size={12} /> {showProfile ? 'Hide' : 'Show'} Student Profile
                                <ChevronDown size={13} className={`transition-transform ${showProfile ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Body scrolls under the fixed header; the profile (toggle under the ID) opens at its top */}
                <div className="flex-1 min-h-0 p-5 md:p-6 overflow-y-auto custom-scrollbar space-y-5">
                    {showProfile && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl border border-blue-100 dark:border-slate-700/60 bg-blue-50/50 dark:bg-slate-900/40 p-4">
                            {[
                                ['Course', student.course, BookOpen, 2],
                                ['Department', student.department, MapPin, 2],
                                ['Year Level', /^\d+$/.test(student.year_level || '') ? `Year ${student.year_level}` : student.year_level, Hash, 1],
                                ['Contact Number', student.contact_number, Phone, 1],
                                ['Email', student.email, Mail, 2],
                            ].map(([label, value, Icon, span]) => (
                                <div key={label} className={`min-w-0 ${span === 2 ? 'col-span-2' : ''}`}>
                                    <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                                        <Icon size={11} /> {label}
                                    </p>
                                    <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-200 break-words">{value || '—'}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Hours done: a summary receipt (no description) instead of the full sections */}
                    {clearance ? <CompletionReceipt report={report} ticket={ticket} /> : (
                    <>
                    {/* The incident: the violation first, then when and who */}
                    <div>
                        <SectionTitle icon={AlertTriangle}>Incident</SectionTitle>
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-500/10 px-4 py-3">
                                <p className="min-w-0 flex items-center gap-2 text-sm font-black text-red-700 dark:text-red-300">
                                    <AlertTriangle size={15} className="shrink-0" /> {report.violation_type}
                                </p>
                                {report.offense_count ? (
                                    <span className="shrink-0 rounded-full bg-white/80 dark:bg-slate-900/60 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-700 dark:text-red-300">
                                        {report.offense_count === 1 ? '1st' : report.offense_count === 2 ? '2nd' : report.offense_count === 3 ? '3rd' : `${report.offense_count}th`} offense
                                    </span>
                                ) : null}
                            </div>
                            <div className="px-4 py-1.5">
                                <Line label="Caught" value={caughtAt} />
                                <Line label={reportedByLabel(report.reporter_role)} value={report.reporting_guard} />
                            </div>
                        </div>
                    </div>

                    {(assignedBuilding || report.punishment || ticket) && (
                        <div>
                            <SectionTitle icon={Award}>Required Action</SectionTitle>
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-900/40 px-4 py-3">
                                    <Building2 size={16} className="mt-0.5 shrink-0 text-ustp-blue dark:text-blue-400" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Assigned Building</p>
                                        {editingBuilding ? (
                                            <div className="mt-1.5 space-y-2">
                                                <select
                                                    value={newBuilding}
                                                    onChange={(e) => setNewBuilding(e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:border-ustp-blue outline-none"
                                                >
                                                    <ServiceSiteOptions {...serviceSites} placeholder="Choose a building..." />
                                                </select>
                                                {buildingError && <p className="text-[11px] font-bold text-red-500">{buildingError}</p>}
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={saveBuilding}
                                                        disabled={!newBuilding || savingBuilding}
                                                        className="flex-1 py-2 bg-ustp-blue hover:bg-blue-800 text-white rounded-lg font-black text-[10px] uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {savingBuilding ? 'Saving…' : 'Save'}
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingBuilding(false); setBuildingError(''); }}
                                                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg font-black text-[10px] uppercase tracking-widest"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm font-bold mt-0.5 text-slate-800 dark:text-slate-200">{assignedBuilding || '—'}</p>
                                        )}
                                        {/* Every building the admin assigned, newest first (only when it changed) */}
                                        {!editingBuilding && report.building_history?.length > 1 && (
                                            <ol className="mt-2.5 space-y-1.5 border-l-2 border-slate-200 dark:border-slate-700 pl-3">
                                                {[...report.building_history].reverse().map((h, i) => (
                                                    <li key={i} className="text-[11px] leading-4">
                                                        <span className={`font-bold ${i === 0 ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>{h.name}</span>
                                                        {i === 0 && <span className="ml-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600">Current</span>}
                                                        <span className="block text-[10px] font-medium text-slate-400">
                                                            {h.at ? new Date(h.at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'First assignment'}
                                                            {h.by ? ` · ${h.by}` : ''}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ol>
                                        )}
                                    </div>
                                    {/* Buildings change day to day; not while the student is serving */}
                                    {!editingBuilding && canChangeBuilding && (
                                        <button
                                            onClick={() => { setEditingBuilding(true); setNewBuilding(''); setBuildingError(''); }}
                                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-ustp-blue dark:text-blue-400 font-black text-[10px] uppercase tracking-widest hover:border-ustp-blue"
                                        >
                                            <Pencil size={12} /> Change
                                        </button>
                                    )}
                                </div>
                                {ticket?.status === 'Ongoing' && (
                                    <p className="bg-slate-50 dark:bg-slate-900/40 px-4 pb-3 -mt-1 text-[10px] font-semibold text-slate-400">Serving now. The building can be changed after they stop.</p>
                                )}
                                <div className="px-4 py-1.5 border-t border-dashed border-slate-200 dark:border-slate-700">
                                    {report.punishment && <Line label="Sanction" value={report.punishment} accent="text-blue-700 dark:text-blue-400" />}
                                    {/* 3-day deadline (Sundays not counted); each missed day after it added 1 hour */}
                                    {ticket?.deadline && (() => {
                                        const end = Date.parse(ticket.deadline);
                                        const day = new Date(end - 1).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                                        const passed = ['Active', 'Ongoing'].includes(ticket.status) && Date.now() >= end;
                                        return <Line label="Deadline" value={passed ? `${day} · passed` : day} accent={passed ? 'text-red-600 dark:text-red-400' : undefined} />;
                                    })()}
                                    {ticket?.added_hours > 0 && (
                                        <Line
                                            label="Added (missed days)"
                                            value={`+${ticket.added_hours}h · ${ticket.missed_days?.length || 0} day${ticket.missed_days?.length === 1 ? '' : 's'}`}
                                            accent="text-red-600 dark:text-red-400"
                                        />
                                    )}
                                </div>
                                {/* Time left, with how much is served so far */}
                                {ticket && remainingHours != null && (
                                    <div className="px-4 pb-3.5 pt-1">
                                        <div className="flex items-baseline justify-between gap-4">
                                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Time remaining</span>
                                            <span className={`text-[13px] font-black tabular-nums ${remainingHours > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                {formatRemainingTime(remainingHours)}
                                            </span>
                                        </div>
                                        {requiredHours > 0 && (
                                            <>
                                                <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700">
                                                    <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${servedShare * 100}%` }} />
                                                </div>
                                                <p className="mt-1 text-[10px] font-semibold text-slate-400">{fmtHours(requiredHours - remainingHours)} of {fmtHours(requiredHours)} served</p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    </>
                    )}

                    {/* Hours done: photos of the signed ISO form and the reflection paper, then approve to clear and archive */}
                    {clearance && (
                        <div>
                            <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-3 ml-2">
                                <FileText size={12} /> Clearance Documents
                            </h4>
                            <div className="rounded-[24px] border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 p-4 space-y-3">
                                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                                    Hours completed. Take a photo of the student's signed ISO form and their reflection paper with your phone camera, then approve to move this violation to the archives.
                                </p>
                                {proofsLoading ? (
                                    <div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-400" size={22} /></div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        {CLEARANCE_FILES.map((f) => {
                                            const proof = proofs[f.kind];
                                            return (
                                                <div key={f.kind} className="min-w-0 rounded-2xl border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 p-2.5 flex flex-col gap-2">
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">{f.label}</p>
                                                        {proof?.image && <CheckCircle size={14} className="shrink-0 text-emerald-500" />}
                                                    </div>
                                                    {proof?.image ? (
                                                        <a href={proof.image} target="_blank" rel="noopener noreferrer" className="block">
                                                            <img src={proof.image} alt={`Uploaded ${f.label}`} className="w-full h-32 object-cover rounded-lg border border-slate-100 dark:border-slate-700 bg-white" />
                                                        </a>
                                                    ) : (
                                                        <div className="h-32 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center px-2 text-center text-[10px] font-semibold text-slate-400">{f.hint}</div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {/* Or take them with a phone: scan the QR, the photos show up here */}
                                {phoneLink ? (
                                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 p-4 flex flex-col items-center text-center gap-3">
                                        <div className="rounded-xl bg-white p-2.5 border border-slate-100">
                                            <QRCode value={phoneLink.url} size={156} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-800 dark:text-slate-200">Scan with your phone camera</p>
                                            <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                Take both photos on your phone. They'll appear here automatically. The code works for 30 minutes.
                                            </p>
                                        </div>
                                        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            <Loader2 size={12} className="animate-spin" /> Waiting for photos
                                        </p>
                                        <button onClick={() => setPhoneLink(null)} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                                            Hide QR code
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={showPhoneLink}
                                        disabled={linkLoading}
                                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-ustp-blue hover:bg-blue-800 text-white font-black text-[10px] uppercase tracking-widest disabled:opacity-60"
                                    >
                                        {linkLoading ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />} Use phone camera
                                    </button>
                                )}
                                {clearError && <p className="text-[11px] font-bold text-red-500">{clearError}</p>}
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="shrink-0 px-6 pb-6 pt-2 flex flex-col gap-2">
                    {/* No Dismiss: a case is dismissed only when OSA rejects the faculty member who filed it */}
                    {isPending && (
                        <div className="mb-2">
                            <button
                                onClick={() => {
                                    onAction(report.id);
                                    onClose();
                                }}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-100"
                            >
                                <Check size={16} /> Approve
                            </button>
                        </div>
                    )}


                    {/* Special case for 0-hour punishments that aren't pending but need "Mark Done" (if status is Approved) */}
                    {!isPending && report.status === 'Approved' && !ticket && (
                        <button
                            onClick={() => {
                                onAction(report.id); // 'approve' endpoint also marks as Completed if hours=0
                                onClose();
                            }}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all mb-2"
                        >
                            Mark as Handled / Done
                        </button>
                    )}

                    {clearance && (
                        <button
                            onClick={approveClearance}
                            disabled={!bothUploaded || clearing}
                            title={bothUploaded ? undefined : 'Take photos of the ISO form and the reflection paper first'}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {clearing ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
                            Approve
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─── Insights card: today's reports by time and the top violation types ── */
// Start hour of each 2-hour block on the Today chart (6 AM to 8 PM)
const TODAY_BLOCKS = [6, 8, 10, 12, 14, 16, 18];

const InsightSection = ({ title, aside, children }) => (
    <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{title}</h4>
            {aside}
        </div>
        {children}
    </div>
);

const InsightsCard = ({ violators }) => {
    // Today: reports filed so far (dismissed ones weren't violations), in 2-hour blocks over the school day;
    // anything earlier or later counts in the first or last block
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const today = violators.filter((v) => v.status !== 'Dismissed' && v.created_at && Date.parse(v.created_at) >= startOfToday);
    const hourOf = (v) => new Date(v.created_at).getHours();
    const currentHour = new Date().getHours();
    const blocks = TODAY_BLOCKS.map((from, i) => {
        const isFirst = i === 0;
        const isLast = i === TODAY_BLOCKS.length - 1;
        const count = today.filter((v) => {
            const h = hourOf(v);
            return (isFirst || h >= from) && (isLast || h < from + 2);
        }).length;
        const label = `${from % 12 || 12}${from < 12 ? 'a' : 'p'}`;
        const now = (currentHour >= from && (isLast || currentHour < from + 2)) || (isFirst && currentHour < from);
        return { label, count, now };
    });
    const maxBlock = Math.max(1, ...blocks.map((b) => b.count));

    // Top violation types today
    const typeCounts = {};
    today.forEach((v) => {
        const type = v.violation_type || 'Other';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const maxType = topTypes[0]?.[1] || 1;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="bg-gradient-to-r from-ustp-blue to-blue-600 px-6 py-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <Sparkles size={20} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm uppercase tracking-wider">Insights</h3>
                        <p className="text-xs text-blue-100 font-medium">Today at a glance</p>
                    </div>
                </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <InsightSection title="Today by time">
                    <div className="flex items-baseline gap-1.5 mb-3">
                        <span className="text-2xl font-black text-slate-800 dark:text-white">{today.length}</span>
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">violation{today.length === 1 ? '' : 's'} filed today</span>
                    </div>
                    <div className="flex items-end gap-2 h-20">
                        {blocks.map((b) => (
                            <div key={b.label} className="flex-1 flex flex-col items-center gap-1.5 h-full" title={`${b.label}: ${b.count}`}>
                                <div className="flex-1 w-full flex items-end">
                                    <div
                                        className={`w-full rounded-md transition-all duration-500 ${b.now ? 'bg-ustp-blue' : 'bg-blue-200 dark:bg-blue-500/30'}`}
                                        style={{ height: `${b.count ? Math.max(8, (b.count / maxBlock) * 100) : 4}%` }}
                                    />
                                </div>
                                <span className={`text-[10px] font-bold ${b.now ? 'text-ustp-blue' : 'text-slate-400 dark:text-slate-500'}`}>{b.label}</span>
                            </div>
                        ))}
                    </div>
                </InsightSection>

                <InsightSection title="Top violations today">
                    {topTypes.length === 0 ? (
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">No violations filed today yet.</p>
                    ) : (
                        <div className="space-y-2.5">
                            {topTypes.map(([type, count], i) => (
                                <div key={type}>
                                    <div className="flex items-center justify-between gap-3 mb-1">
                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">{type}</span>
                                        <span className="text-xs font-black text-slate-700 dark:text-slate-200">{count}</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${i === 0 ? 'bg-red-500' : 'bg-red-300 dark:bg-red-500/50'}`}
                                            style={{ width: `${(count / maxType) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </InsightSection>
            </div>
        </div>
    );
};

/* ─── Staff Dashboard ─────────────────────────────────────────────── */
const StaffDashboard = () => {
    const [stats, setStats] = useState({ pending: 0, active: 0, completed: 0, warnings: 0 });
    const [violators, setViolators] = useState([]);
    const [allTickets, setAllTickets] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    // Violators Feed filters ('' = all): offense number, gender, department, violation type
    const [offenseFilter, setOffenseFilter] = useState('');
    const [genderFilter, setGenderFilter] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [selectedViolation, setSelectedViolation] = useState(null);
    const [todayStats, setTodayStats] = useState({ violations: 0, assigned: 0, completed: 0 });

    // Every 5 s while the tab is open and visible
    usePolling(() => fetchDashboardData(), 10000);
    const handleAction = async (reportId) => {
        try {
            const response = await fetch(`/api/violations/${reportId}/approve/`, { method: 'POST' });
            if (response.ok) fetchDashboardData();
            // e.g. an unconfirmed faculty reporter blocks approval
            else alert((await response.json().catch(() => ({}))).error || 'Something went wrong. Please try again.');
        } catch (error) {
            console.error('Error executing action:', error);
        }
    };


    const fetchDashboardData = async () => {
        try {
            // Both at once, and only the cases still open (scope=open): cleared and dismissed cases from past
            // months aren't re-downloaded on every refresh. (scope=open also includes the last 36 h for today's counts.)
            const [violations, tickets] = await Promise.all([
                fetch('/api/violations/?scope=open&t=' + Date.now()).then((r) => r.json()),
                fetch('/api/etickets/?scope=open&t=' + Date.now()).then((r) => r.json()).catch(() => []),
            ]);

            const today = new Date().toDateString();

            const violationsToday = violations.filter(v => new Date(v.created_at).toDateString() === today);
            const ticketsAssignedToday = tickets.filter(t => {
                const created = t.created_at ? new Date(t.created_at).toDateString() : '';
                return created === today;
            });
            const ticketsCompletedToday = tickets.filter(t => {
                const updated = t.updated_at ? new Date(t.updated_at).toDateString() : '';
                return t.status === 'Completed' && updated === today;
            });

            setTodayStats({
                violations: violationsToday.length,
                assigned: ticketsAssignedToday.length,
                completed: ticketsCompletedToday.length,
            });

            const pending = violations.filter(v => v.status.toLowerCase().includes('pending'));
            const activeTickets = tickets.filter(t => t.status === 'Ongoing');
            const completedTickets = tickets.filter(t => t.status === 'Completed');

            setStats({
                pending: pending.length,
                active: activeTickets.length,
                completed: completedTickets.length,
                warnings: 0,
            });

            setViolators(violations);
            setAllTickets(tickets);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        }
    };

const userRole = JSON.parse(localStorage.getItem('user') || '{}').role || 'staff';
    // Display name from the admin's profile (Settings > Account)
    const adminName = JSON.parse(localStorage.getItem('user') || '{}').full_name || 'Admin';

    // Violators Feed: approved violations until they're cleared. Pending reports, dismissed ones,
    // no-hours cases (Completed without a ticket) and cleared ones aren't listed; a finished ticket stays
    // until the admin uploads the signed ISO form and approves it.
    // One lookup table per render instead of scanning every ticket for every violation (the feed re-renders
    // on each 5 s poll)
    const ticketsByViolation = new Map(allTickets.map((t) => [t.violation_details?.id || t.violation, t]));
    const ticketFor = (report) => ticketsByViolation.get(report.id);
    const feedViolations = violators.filter((report) => {
        const status = (report.status || '').toLowerCase();
        if (status.includes('pending') || status === 'dismissed' || status === 'cleared') return false;
        const ticket = ticketFor(report);
        // "Completed" with a ticket = hours served, waiting for the ISO form; without one = no hours needed
        if (status === 'completed' && !ticket) return false;
        return ticket?.status !== 'Cleared';
    });
    const violationTypes = [...new Set(feedViolations.map((r) => r.violation_type).filter(Boolean))].sort();
    const search = searchTerm.trim().toLowerCase();
    const activeViolators = feedViolations.filter((report) => {
        const student = report.student_details || {};
        const offense = Number(report.offense_count) || 1;
        if (search && !(student.name || '').toLowerCase().includes(search) && !(student.student_id || '').toLowerCase().includes(search)) return false;
        if (offenseFilter && (offenseFilter === '3' ? offense < 3 : offense !== Number(offenseFilter))) return false;
        if (genderFilter && student.gender !== genderFilter) return false;
        if (departmentFilter && student.department !== departmentFilter) return false;
        if (typeFilter && report.violation_type !== typeFilter) return false;
        return true;
    })
        // Students who finished their hours come first: they're at OSA to be cleared
        .sort((a, b) => Number(awaitsClearance(b, ticketFor(b))) - Number(awaitsClearance(a, ticketFor(a))));
    const filtersOn = Boolean(search || offenseFilter || genderFilter || departmentFilter || typeFilter);
    const filterSelect = 'min-w-0 w-full sm:w-auto bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 focus:border-ustp-blue outline-none cursor-pointer';

    return (
        <div className="flex bg-slate-50 dark:bg-slate-900 min-h-screen relative font-sans">
            <Sidebar role={userRole} badges={{ '/admin/pending': stats.pending }} />
            <div className="flex-1 h-screen overflow-y-auto custom-scrollbar w-full">
                <div className="flex flex-col xl:flex-row w-full min-h-full">
                    {/* Main Content Area */}
                    {/* On wide screens the page fits the window and the Violators Feed stretches to the bottom */}
                    <main className="page-enter flex-1 min-w-0 flex flex-col xl:h-screen px-4 pt-[76px] pb-10 md:p-10 lg:pt-10">
                        <header className="mb-5 shrink-0 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-xs md:text-sm font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1.5">{todayLabel()}</p>
                                <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">{timeGreeting()}, {adminName}</h1>
                                <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium text-base md:text-lg">{adminStatusLine(stats.pending)}</p>
                            </div>
                            {/* Light / dark, at the end of the greeting line (above the filters) */}
                            <ThemeToggle />
                        </header>

                        {/* Search + filters for the Violators Feed */}
                        <div className="shrink-0 mb-6 flex flex-wrap gap-2.5">
                            <div className="relative flex-1 min-w-full sm:min-w-[200px]">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search name or student ID"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border-2 border-black/35 dark:border-slate-300/35 rounded-xl focus:border-ustp-blue focus:outline-none text-base font-semibold text-slate-600 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2.5 w-full sm:flex sm:w-auto">
                                <select aria-label="Offense" value={offenseFilter} onChange={(e) => setOffenseFilter(e.target.value)} className={filterSelect}>
                                    <option value="">Offense</option>
                                    <option value="1">1st offense</option>
                                    <option value="2">2nd offense</option>
                                    <option value="3">3rd offense & up</option>
                                </select>
                                <select aria-label="Gender" value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className={filterSelect}>
                                    <option value="">Gender</option>
                                    {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                                </select>
                                <select aria-label="Department" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className={filterSelect}>
                                    <option value="">Department</option>
                                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{departmentShort(d)}</option>)}
                                </select>
                                <select aria-label="Violation" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={filterSelect}>
                                    <option value="">Violation</option>
                                    {violationTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 flex flex-col">
                            {/* ── Violators Feed ── */}
                            <div className="card-premium p-4 md:p-6 flex-1 min-h-0 flex flex-col">
                                <div className="shrink-0 flex justify-between items-center mb-4 pb-4 border-b border-slate-50 dark:border-slate-800">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest text-[10px] text-blue-900">Violators Feed</h4>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                        {filtersOn ? `${activeViolators.length} of ${feedViolations.length}` : feedViolations.length} violator{feedViolations.length === 1 ? '' : 's'}
                                    </span>
                                </div>

                            <div className="flex-1 min-h-0 space-y-3 max-h-[600px] xl:max-h-none overflow-y-auto pr-2 custom-scrollbar">
                                {(() => {
                                    if (activeViolators.length === 0) {
                                        return (
                                            <div className="py-16 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                                                    <CheckCircle className="text-emerald-300 dark:text-emerald-600" size={32} />
                                                </div>
                                                <h5 className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-xs">
                                                    {filtersOn && feedViolations.length ? 'No violators match these filters' : 'No Active Violators'}
                                                </h5>
                                                <p className="text-xs text-slate-400/70 dark:text-slate-600 mt-1.5 font-medium">
                                                    {filtersOn && feedViolations.length ? 'Try adjusting the filters above' : 'All students are in good standing'}
                                                </p>
                                            </div>
                                        );
                                    }

                                    return activeViolators.map((report) => {
                                        const ticket = ticketFor(report);
                                        const isOngoing = ticket?.status === 'Ongoing';
                                        const isPending = (report.status || '').toLowerCase().includes('pending');
                                        const needsIsoForm = awaitsClearance(report, ticket);
                                        const openDetails = () => setSelectedViolation({ report, ticket });

                                        return (
                                            <div
                                                key={report.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={openDetails}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetails(); } }}
                                                className={`p-4 border shadow-sm rounded-3xl transition-all cursor-pointer hover:border-ustp-blue focus:outline-none focus-visible:border-ustp-blue ${needsIsoForm ? 'bg-amber-50/70 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40' : isOngoing ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}
                                            >
                                                <div className="flex gap-4 items-center">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 ${needsIsoForm ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' : isOngoing ? 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'}`}>
                                                        {needsIsoForm ? <FileText size={20} /> : isOngoing ? <Clock size={20} className="animate-spin-slow" /> : <User size={20} />}
                                                    </div>

                                                    <div className="flex-1 overflow-hidden">
                                                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{studentName(report.student_details) || 'New Student Report'}</p>
                                                        <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5">
                                                            <span className="text-red-600 dark:text-red-400">{report.violation_type}</span>
                                                            {report.offense_count > 1 && <span className="text-slate-500 dark:text-slate-400"> · offense #{report.offense_count}</span>}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${isOngoing ? 'bg-green-200 text-green-800 dark:bg-green-500/20 dark:text-green-400' : needsIsoForm ? 'bg-amber-200 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300' : isPending ? 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400' : 'bg-blue-50 text-blue-900 dark:bg-blue-500/20 dark:text-blue-400'}`}>
                                                                {needsIsoForm ? 'Hours done · for clearance' : ticket ? ticketStatusLabel(ticket) : report.status}
                                                            </span>
                                                            {(report.assigned_building || ticket?.assigned_location) && (
                                                                <span className="flex items-center gap-1 min-w-0 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                                                    <Building2 size={12} className="shrink-0" />
                                                                    <span className="truncate">{report.assigned_building || ticket?.assigned_location}</span>
                                                                </span>
                                                            )}
                                                         </div>
                                                    </div>

                                                    <div className="flex gap-4 flex-shrink-0 relative z-10 items-center" onClick={(e) => e.stopPropagation()}>
                                                        {isPending && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleAction(report.id)}
                                                                    title="Approve"
                                                                    className="flex items-center justify-center text-emerald-500 hover:text-emerald-600 transition-colors"
                                                                >
                                                                    <Check size={18} />
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={openDetails}
                                                            title="Details"
                                                            className="flex items-center justify-center text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Right Sidebar */}
                <aside className="w-96 p-6 pt-10 border-l border-transparent dark:border-transparent bg-transparent hidden xl:block">
                    <div className="sticky top-6 space-y-6">
                        {/* Today's Activity Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700 overflow-hidden">
                            <div className="bg-gradient-to-r from-ustp-blue to-blue-600 px-6 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                        <Calendar size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-sm uppercase tracking-wider">Today's Activity</h3>
                                        <p className="text-xs text-blue-100 font-medium">{new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-100 dark:border-red-500/20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                                            <AlertTriangle size={18} className="text-red-500 dark:text-red-400" />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Violations</span>
                                    </div>
                                    <span className="text-2xl font-black text-red-600 dark:text-red-400">{todayStats.violations}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-100 dark:border-amber-500/20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                                            <ClipboardList size={18} className="text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Assigned</span>
                                    </div>
                                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{todayStats.assigned}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                                            <UserCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Completed</span>
                                    </div>
                                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{todayStats.completed}</span>
                                </div>
                            </div>
                        </div>

                        <InsightsCard violators={violators} />

                    </div>
                </aside>
            </div>
        </div>

            {/* Violation Detail Modal */}
            {selectedViolation && (
                <ViolationModal
                    report={selectedViolation.report}
                    ticket={selectedViolation.ticket}
                    onClose={() => setSelectedViolation(null)}
                    onAction={handleAction}
                    onCleared={() => { setSelectedViolation(null); fetchDashboardData(); }}
                    onReassigned={(building) => {
                        setSelectedViolation((prev) => prev && ({
                            ...prev,
                            report: {
                                ...prev.report,
                                assigned_building: building,
                                // Same entry the server added (older violations start with their first building)
                                building_history: [
                                    ...(prev.report.building_history?.length ? prev.report.building_history
                                        : prev.report.assigned_building ? [{ name: prev.report.assigned_building, at: null, by: null }] : []),
                                    { name: building, at: new Date().toISOString(), by: adminName },
                                ],
                            },
                            ticket: prev.ticket && { ...prev.ticket, assigned_location: building },
                        }));
                        fetchDashboardData();
                    }}
                />
            )}
        </div>
    );
};

export default StaffDashboard;
