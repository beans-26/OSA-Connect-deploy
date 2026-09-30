import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import QRCode from 'react-qr-code';
import {
    AlertTriangle,
    Clock,
    FileText,
    Inbox,
    User,
    Check,
    X,
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
    Bell,
    UserCheck,
    ClipboardList,
    QrCode,
    CheckCircle,
    Upload,
    Loader2,
    Archive
} from 'lucide-react';
import { timeGreeting, todayLabel, adminStatusLine } from '../lib/greeting';
import { useServiceSites, ServiceSiteOptions, postAssignment } from '../components/useServiceSites';
import { DEPARTMENTS, GENDERS, departmentShort } from '../lib/academics';
import { photoToDataUrl } from '../lib/photo';
import { ticketStatusLabel } from '../lib/ticketStatus';
import ThemeToggle from '../components/ThemeToggle';
import usePolling from '../lib/usePolling';


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
                    <Line label="Name" value={student.name} />
                    <Line label="Student ID" value={student.student_id} />
                    <Line label="Course" value={[student.course, year].filter(Boolean).join(' · ')} />
                    <Line label="Department" value={departmentShort(student.department)} />
                </Section>
                <Section title="Violation">
                    <Line label="Violation" value={report.violation_type} accent="text-red-600 dark:text-red-400" />
                    <Line label="Offense" value={`#${report.offense_count || 1}`} />
                    <Line label="Date caught" value={fmtDate(report.created_at, true)} />
                    <Line label="Reported by" value={report.reporting_guard} />
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
    // Clearance: the two uploaded photos by kind, which one is uploading, and the approve in progress
    const [proofs, setProofs] = useState({});
    const [proofsLoading, setProofsLoading] = useState(false);
    const [uploading, setUploading] = useState(null);
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

    const uploadProof = async (kind, file) => {
        if (!file) return;
        setUploading(kind);
        setClearError('');
        try {
            const image = await photoToDataUrl(file);
            const response = await fetch(`/api/violations/${report.id}/clearance_proof/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kind, image }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || "Couldn't upload the photo.");
            setProofs((prev) => ({ ...prev, [kind]: { image, ...data } }));
        } catch (e) {
            setClearError(e.message === 'Failed to fetch' ? "Can't reach the server. Please try again." : e.message);
        } finally {
            setUploading(null);
        }
    };

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
                            {(student.name || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-lg font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                                {student.name || 'Unknown Student'}
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
                                <Line label="Reported by" value={report.reporting_guard} />
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
                                    Hours completed. Upload a photo of the student's signed ISO form and their reflection paper, then approve to move this violation to the archives.
                                </p>
                                {proofsLoading ? (
                                    <div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-400" size={22} /></div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        {CLEARANCE_FILES.map((f) => {
                                            const proof = proofs[f.kind];
                                            const busy = uploading === f.kind;
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
                                                    <label className={`flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border-2 border-dashed font-black text-[9px] uppercase tracking-widest cursor-pointer transition-colors ${uploading ? 'opacity-60 pointer-events-none' : 'border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100/60 dark:hover:bg-amber-500/10'}`}>
                                                        {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                                                        {busy ? 'Uploading…' : proof?.image ? 'Replace' : 'Upload photo'}
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            capture="environment"
                                                            className="hidden"
                                                            onChange={(e) => { uploadProof(f.kind, e.target.files?.[0]); e.target.value = ''; }}
                                                        />
                                                    </label>
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
                    {isPending && (
                        <div className="grid grid-cols-2 gap-3 mb-2">
                            <button
                                onClick={() => {
                                    onAction(report.id, 'Approved');
                                    onClose();
                                }}
                                className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-100"
                            >
                                <Check size={16} /> Approve
                            </button>
                            <button
                                onClick={() => {
                                    onAction(report.id, 'Dismissed');
                                    onClose();
                                }}
                                className="flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-red-100"
                            >
                                <X size={16} /> Dismiss
                            </button>
                        </div>
                    )}


                    {/* Special case for 0-hour punishments that aren't pending but need "Mark Done" (if status is Approved) */}
                    {!isPending && report.status === 'Approved' && !ticket && (
                        <button
                            onClick={() => {
                                onAction(report.id, 'Approved'); // 'approve' endpoint also marks as Completed if hours=0
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
                            disabled={!bothUploaded || clearing || !!uploading}
                            title={bothUploaded ? undefined : 'Upload the ISO form and the reflection paper first'}
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

/* ─── Staff Dashboard ─────────────────────────────────────────────── */
const StaffDashboard = () => {
    const [stats, setStats] = useState({ pending: 0, active: 0, completed: 0, warnings: 0 });
    const [violators, setViolators] = useState([]);
    const [allTickets, setAllTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    // Violators Feed filters ('' = all): offense number, gender, department, violation type
    const [offenseFilter, setOffenseFilter] = useState('');
    const [genderFilter, setGenderFilter] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [selectedViolation, setSelectedViolation] = useState(null);
    const [todayStats, setTodayStats] = useState({ violations: 0, assigned: 0, completed: 0 });
    const [notifications, setNotifications] = useState([]);

    // Every 5 s while the tab is open and visible
    usePolling(() => fetchDashboardData(), 5000);

    const handleAction = async (reportId, newStatus) => {
        try {
            const endpoint = newStatus === 'Approved' ? 'approve' : 'dismiss';
            const response = await fetch(`/api/violations/${reportId}/${endpoint}/`, { method: 'POST' });
            if (response.ok) fetchDashboardData();
        } catch (error) {
            console.error('Error executing action:', error);
        }
    };


    const fetchDashboardData = async () => {
        try {
            // Both at once. (Every time log used to be downloaded here too, every 5 s, but nothing used it.)
            const [violations, tickets] = await Promise.all([
                fetch('/api/violations/?t=' + Date.now()).then((r) => r.json()),
                fetch('/api/etickets/?t=' + Date.now()).then((r) => r.json()).catch(() => []),
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

            const newNotifications = [];

            // 1. All Pending Reviews (Show all, regardless of date, sorted by newest)
            violations.filter(v => v.status.toLowerCase().includes('pending'))
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .forEach(v => {
                    const name = v.student_details?.name || 'A student';
                    newNotifications.push({
                        id: `pending-${v.id}`,
                        type: 'warning',
                        message: `Pending Review: ${name} (Action Required)`,
                        time: formatTimeAgo(v.created_at),
                        created_at: v.created_at
                    });
                });

            // 2. Completed Services (Today only)
            ticketsCompletedToday.forEach(t => {
                const name = t.student_details?.name || 'A student';
                newNotifications.push({
                    id: `completed-${t.id}`,
                    type: 'success',
                    message: `${name} completed their assigned community service`,
                    time: formatTimeAgo(t.updated_at),
                    created_at: t.updated_at
                });
            });

            // 3. Overdue Pending (Legacy warning)
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            violations.filter(v =>
                v.status.toLowerCase().includes('pending') &&
                new Date(v.created_at) < threeDaysAgo
            ).forEach(v => {
                const name = v.student_details?.name || 'A student';
                const days = Math.floor((new Date() - new Date(v.created_at)) / (1000 * 60 * 60 * 24));
                newNotifications.push({
                    id: `overdue-${v.id}`,
                    type: 'error',
                    message: `${name} has not completed their pending review for ${days} days`,
                    time: formatTimeAgo(v.created_at),
                    created_at: v.created_at
                });
            });

            // Sort all by date descending and take top 10
            const sortedNotifs = newNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setNotifications(sortedNotifs.slice(0, 10));

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
        } finally {
            setLoading(false);
        }
    };

    const formatTimeAgo = (isoDate) => {
        if (!isoDate) return '';
        const diff = Date.now() - new Date(isoDate).getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);
        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (mins > 0) return `${mins}m ago`;
        return 'Just now';
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
    const filterSelect = 'min-w-0 w-full sm:w-auto bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-2.5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 focus:border-ustp-blue outline-none cursor-pointer';

    return (
        <div className="flex bg-slate-50 dark:bg-slate-900 min-h-screen relative font-sans">
            <Sidebar role={userRole} />
            <div className="flex-1 h-screen overflow-y-auto custom-scrollbar w-full">
                <div className="flex flex-col xl:flex-row w-full min-h-full">
                    {/* Main Content Area */}
                    <main className="page-enter flex-1 px-4 pt-[76px] pb-10 md:p-10 lg:pt-10">
                        <header className="mb-5 shrink-0 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">{todayLabel()}</p>
                                <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{timeGreeting()}, {adminName}</h1>
                                <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium text-sm">{adminStatusLine(stats.pending)}</p>
                            </div>
                            {/* Light / dark, at the end of the greeting line (above the filters) */}
                            <ThemeToggle />
                        </header>

                        {/* Search + filters for the Violators Feed */}
                        <div className="mb-6 flex flex-wrap gap-2.5">
                            <div className="relative flex-1 min-w-full sm:min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search name or student ID"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-ustp-blue focus:outline-none text-sm font-semibold text-slate-600 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500"
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

                        <div className="space-y-6">
                            {/* ── Violators Feed ── */}
                            <div className="card-premium p-4 md:p-6">
                                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-50 dark:border-slate-800">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest text-[10px] text-blue-900">Violators Feed</h4>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                        {filtersOn ? `${activeViolators.length} of ${feedViolations.length}` : feedViolations.length} violator{feedViolations.length === 1 ? '' : 's'}
                                    </span>
                                </div>

                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
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
                                                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{report.student_details?.name || 'New Student Report'}</p>
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
                                                                    onClick={() => handleAction(report.id, 'Approved')}
                                                                    title="Approve"
                                                                    className="flex items-center justify-center text-emerald-500 hover:text-emerald-600 transition-colors"
                                                                >
                                                                    <Check size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleAction(report.id, 'Dismissed')}
                                                                    title="Dismiss"
                                                                    className="flex items-center justify-center text-red-500 hover:text-red-600 transition-colors"
                                                                >
                                                                    <X size={18} />
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

                        {/* System Notifications Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700 p-5">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                        <Bell size={20} className="text-slate-500 dark:text-slate-400" />
                                    </div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Notifications</h3>
                                </div>
                                {notifications.length > 0 && (
                                    <span className="px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-black">{notifications.length}</span>
                                )}
                            </div>
                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                                {notifications.length === 0 ? (
                                    <div className="text-center py-10">
                                        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                            <Bell size={24} className="text-slate-200 dark:text-slate-700" />
                                        </div>
                                        <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">All caught up</p>
                                        <p className="text-xs text-slate-400/60 dark:text-slate-600 mt-1">No new notifications</p>
                                    </div>
                                ) : (
                                    notifications.map((notif) => (
                                        <div
                                            key={notif.id}
                                            className={`p-4 rounded-xl border transition-all hover:shadow-md ${notif.type === 'warning' ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20' :
                                                notif.type === 'error' ? 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20' :
                                                    'bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20'
                                                }`}
                                        >
                                            <p className={`text-sm font-semibold ${notif.type === 'warning' ? 'text-orange-800 dark:text-orange-400' :
                                                notif.type === 'error' ? 'text-red-800 dark:text-red-400' :
                                                    'text-green-800 dark:text-green-400'
                                                }`}>
                                                {notif.message}
                                            </p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{notif.time}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
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
