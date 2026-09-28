import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'react-qr-code';
import {
    MapPin, Plus, QrCode, Crosshair, Pencil, Power, X, Download, Printer, AlertTriangle,
    CheckCircle, Loader2, RotateCcw, Save, ShieldAlert,
} from 'lucide-react';
import SiteMapPreview from '../../components/SiteMapPreview';
import { captureLocation, getLocationPermission, GEO_MESSAGES } from '../../lib/geo';

// Admin Settings > Service Sites: register community service locations from the admin's phone GPS.
// Each site's QR encodes only its site code (e.g. "LIB-01"), so re-capturing keeps printed codes valid.

const RADIUS_MIN = 10;
const RADIUS_MAX = 300;
// Students with an unfinished ticket at a site at once; the backend asks before going over
const CAPACITY_MIN = 1;
const CAPACITY_MAX = 500;
const WEAK_ACCURACY_M = 15;

const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 text-sm font-semibold text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-ustp-blue";
const labelClass = "text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 block ml-1";

// The backend checks this header names an admin account; registered_by is taken from it server-side
const apiFetch = (path, options = {}) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return fetch(`/api/admin/sites/${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', 'X-OSA-User': user.username || '', ...(options.headers || {}) },
    });
};

const readError = async (response, fallback) => {
    try {
        const data = await response.json();
        return data.error || fallback;
    } catch {
        return fallback;
    }
};

const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const clampRadius = (value) => Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, Number(value) || 50));
const clampCapacity = (value) => Math.min(CAPACITY_MAX, Math.max(CAPACITY_MIN, Math.round(Number(value)) || 10));

/* ---------- GPS capture (shared by new sites and re-captures) ---------- */

const LocationCapture = ({ radius, result, onResult }) => {
    const [state, setState] = useState(result ? 'done' : 'idle'); // idle | capturing | error | done
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState('');
    const abortRef = useRef(null);

    useEffect(() => () => abortRef.current?.abort(), []);

    const start = async () => {
        setError('');
        setProgress(null);
        if ((await getLocationPermission()) === 'denied') {
            setState('error');
            setError(GEO_MESSAGES.permission);
            return;
        }
        const controller = new AbortController();
        abortRef.current = controller;
        setState('capturing');
        try {
            const captured = await captureLocation({ onProgress: setProgress, signal: controller.signal });
            onResult(captured);
            setState('done');
        } catch (e) {
            if (e.code === 'cancelled') {
                setState(result ? 'done' : 'idle');
                return;
            }
            setError(e.message || GEO_MESSAGES.unavailable);
            setState('error');
        }
    };

    if (state === 'capturing') {
        return (
            <div className="rounded-2xl border-2 border-ustp-blue/30 bg-blue-50 dark:bg-blue-950/30 p-5 text-center">
                <Loader2 className="mx-auto mb-3 animate-spin text-ustp-blue" size={28} />
                <p className="text-sm font-black uppercase tracking-widest text-ustp-blue">Capturing location…</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Stand still and keep the phone steady.</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-white dark:bg-slate-800 p-2">
                        <p className="text-xl font-black text-slate-900 dark:text-white">{progress?.secondsLeft ?? 30}s</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Left</p>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-slate-800 p-2">
                        <p className="text-xl font-black text-slate-900 dark:text-white">{progress?.goodCount ?? 0}<span className="text-sm text-slate-400">/{progress?.totalCount ?? 0}</span></p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Good readings</p>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-slate-800 p-2">
                        <p className={`text-xl font-black ${progress?.lastAccuracy > 25 ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>
                            {progress?.lastAccuracy != null ? `±${Math.round(progress.lastAccuracy)}m` : '—'}
                        </p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Accuracy</p>
                    </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white dark:bg-slate-800">
                    <div className="h-full bg-ustp-blue transition-all duration-1000" style={{ width: `${((30 - (progress?.secondsLeft ?? 30)) / 30) * 100}%` }} />
                </div>
                <button type="button" onClick={() => abortRef.current?.abort()} className="mt-4 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-red-500">
                    Cancel
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {state === 'error' && (
                <div className="flex gap-3 rounded-2xl border-2 border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            {state === 'done' && result && (
                <div className="space-y-3 rounded-2xl border-2 border-slate-100 dark:border-slate-700 p-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className={labelClass}>Latitude</p>
                            <p className="ml-1 font-mono font-bold text-slate-800 dark:text-slate-200">{result.latitude.toFixed(7)}</p>
                        </div>
                        <div>
                            <p className={labelClass}>Longitude</p>
                            <p className="ml-1 font-mono font-bold text-slate-800 dark:text-slate-200">{result.longitude.toFixed(7)}</p>
                        </div>
                        <div>
                            <p className={labelClass}>Accuracy</p>
                            <p className={`ml-1 font-bold ${result.accuracy > WEAK_ACCURACY_M ? 'text-amber-500' : 'text-emerald-600'}`}>±{Math.round(result.accuracy)} m</p>
                        </div>
                        <div>
                            <p className={labelClass}>Samples</p>
                            <p className="ml-1 font-bold text-slate-800 dark:text-slate-200">{result.samples}</p>
                        </div>
                    </div>
                    {result.accuracy > WEAK_ACCURACY_M && (
                        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                            <AlertTriangle size={16} className="shrink-0 text-amber-500" />
                            <p>Accuracy is weaker than ±{WEAK_ACCURACY_M} m. Consider re-capturing outdoors or near a window for a more precise point.</p>
                        </div>
                    )}
                    <SiteMapPreview latitude={result.latitude} longitude={result.longitude} radius={radius} className="h-48 w-full" />
                </div>
            )}

            <button
                type="button"
                onClick={start}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-black uppercase tracking-widest ${state === 'done'
                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                    : 'bg-ustp-blue text-white shadow-md hover:bg-blue-800'}`}
            >
                {state === 'done' ? <><RotateCcw size={16} /> Re-capture</> : state === 'error' ? <><RotateCcw size={16} /> Retry</> : <><Crosshair size={16} /> Capture Location</>}
            </button>
            {state === 'idle' && (
                <p className="text-center text-[11px] font-semibold text-slate-400">
                    Stand at the site. Takes 30 seconds; keep the phone still.
                </p>
            )}
        </div>
    );
};

/* ---------- QR view with download + print ---------- */

const SiteQr = ({ site }) => {
    const [downloading, setDownloading] = useState(false);
    const svgId = `site-qr-${site.id}`;

    const download = async () => {
        setDownloading(true);
        try {
            const response = await apiFetch(`${site.id}/qr/`);
            if (!response.ok) throw new Error(await readError(response, 'Could not download the QR code.'));
            const url = URL.createObjectURL(await response.blob());
            const link = document.createElement('a');
            link.href = url;
            link.download = `${site.site_code}_qr.png`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (e) {
            alert(e.message);
        } finally {
            setDownloading(false);
        }
    };

    const print = () => {
        const svg = document.getElementById(svgId);
        if (!svg) return;
        const win = window.open('', '_blank');
        if (!win) {
            alert('Allow pop-ups for this site to print the QR code.');
            return;
        }
        const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
        win.document.write(`<!doctype html><html><head><title>${escape(site.site_code)} QR</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: Inter, Arial, sans-serif; text-align: center; color: #0f172a; margin: 0; }
  .brand { font-size: 20px; font-weight: 800; letter-spacing: 1px; color: #1e3a8a; margin-top: 10mm; }
  .qr svg { width: 120mm; height: 120mm; margin: 12mm auto 8mm; display: block; }
  .name { font-size: 30px; font-weight: 800; margin: 0; }
  .code { font-size: 22px; font-family: monospace; letter-spacing: 3px; margin-top: 4mm; }
  .hint { font-size: 13px; color: #64748b; margin-top: 8mm; }
</style></head><body>
  <div class="brand">OSAConnect</div>
  <div class="qr">${new XMLSerializer().serializeToString(svg)}</div>
  <p class="name">${escape(site.name)}</p>
  <div class="code">${escape(site.site_code)}</div>
  <div class="hint">Scan with OSAConnect to start your community service session</div>
  <script>window.onload = function () { window.print(); };<\/script>
</body></html>`);
        win.document.close();
    };

    return (
        <div className="text-center">
            <div className="mx-auto inline-block rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <QRCode id={svgId} value={site.site_code} size={200} level="H" />
            </div>
            <p className="mt-4 text-lg font-black text-slate-900 dark:text-white">{site.name}</p>
            <p className="font-mono text-sm font-black tracking-[0.3em] text-ustp-blue">{site.site_code}</p>
            <p className="mt-1 text-[11px] font-semibold text-slate-400">The QR contains only the site code, never the coordinates.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
                <button onClick={download} disabled={downloading} className="flex items-center justify-center gap-2 rounded-xl bg-ustp-blue py-3 text-xs font-black uppercase tracking-widest text-white shadow-md hover:bg-blue-800 disabled:opacity-60">
                    {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Download QR
                </button>
                <button onClick={print} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md hover:bg-slate-800 dark:bg-slate-700">
                    <Printer size={16} /> Print QR
                </button>
            </div>
        </div>
    );
};

/* ---------- Modal shell (full screen on phones) ---------- */

// Rendered into <body>: the Settings content sits inside animated wrappers, which trap
// position: fixed children underneath the sticky search bar and the phone menu bar.
const Panel = ({ title, onClose, children }) => createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
        <div
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-slate-800 sm:rounded-3xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">{title}</h3>
                <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700">
                    <X size={20} />
                </button>
            </div>
            {children}
        </div>
    </div>,
    document.body
);

/* ---------- Main section ---------- */

const ServiceSites = () => {
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    // { mode: 'new' | 'edit' | 'recapture' | 'qr', site? }
    const [panel, setPanel] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', radius_m: 50, capacity: 10, site_code: '', is_active: true });
    const [capture, setCapture] = useState(null);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [toast, setToast] = useState('');

    const loadSites = async () => {
        try {
            const response = await apiFetch('');
            if (!response.ok) throw new Error(await readError(response, 'Could not load sites.'));
            setSites(await response.json());
            setLoadError('');
        } catch (e) {
            setLoadError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSites();
    }, []);

    const showToast = (text) => {
        setToast(text);
        setTimeout(() => setToast(''), 3000);
    };

    const openPanel = (mode, site = null) => {
        setFormError('');
        setCapture(null);
        setForm(site
            ? { name: site.name, description: site.description, radius_m: site.radius_m, capacity: site.capacity ?? 10, site_code: site.site_code, is_active: site.is_active }
            : { name: '', description: '', radius_m: 50, capacity: 10, site_code: '', is_active: true });
        setPanel({ mode, site });
    };

    const closePanel = () => {
        if (saving) return;
        setPanel(null);
    };

    const createSite = async () => {
        if (!form.name.trim()) return setFormError('Site name is required.');
        if (!capture) return setFormError('Capture the location first.');
        setSaving(true);
        setFormError('');
        try {
            const response = await apiFetch('', {
                method: 'POST',
                body: JSON.stringify({
                    name: form.name.trim(),
                    description: form.description.trim(),
                    radius_m: clampRadius(form.radius_m),
                    capacity: clampCapacity(form.capacity),
                    site_code: form.site_code.trim().toUpperCase(),
                    latitude: capture.latitude,
                    longitude: capture.longitude,
                    accuracy_m: capture.accuracy,
                    sample_count: capture.samples,
                }),
            });
            if (!response.ok) throw new Error(await readError(response, 'Could not save the site.'));
            const site = await response.json();
            setSites((prev) => [site, ...prev]);
            setPanel({ mode: 'qr', site });
            showToast(`Site ${site.site_code} registered`);
        } catch (e) {
            setFormError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const updateSite = async (site, changes, message) => {
        setSaving(true);
        setFormError('');
        try {
            const response = await apiFetch(`${site.id}/`, { method: 'PUT', body: JSON.stringify(changes) });
            if (!response.ok) throw new Error(await readError(response, 'Could not update the site.'));
            const updated = await response.json();
            setSites((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
            showToast(message);
            return true;
        } catch (e) {
            if (panel) setFormError(e.message);
            else alert(e.message);
            return false;
        } finally {
            setSaving(false);
        }
    };

    const saveEdit = async () => {
        if (!form.name.trim()) return setFormError('Site name is required.');
        const ok = await updateSite(panel.site, {
            name: form.name.trim(),
            description: form.description.trim(),
            radius_m: clampRadius(form.radius_m),
            capacity: clampCapacity(form.capacity),
            is_active: form.is_active,
        }, 'Site updated');
        if (ok) setPanel(null);
    };

    const saveRecapture = async () => {
        if (!capture) return setFormError('Capture the new location first.');
        setSaving(true);
        setFormError('');
        try {
            const response = await apiFetch(`${panel.site.id}/location/`, {
                method: 'PUT',
                body: JSON.stringify({
                    latitude: capture.latitude,
                    longitude: capture.longitude,
                    accuracy_m: capture.accuracy,
                    sample_count: capture.samples,
                }),
            });
            if (!response.ok) throw new Error(await readError(response, 'Could not update the location.'));
            const updated = await response.json();
            setSites((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
            setPanel(null);
            showToast(`Location updated for ${updated.site_code}`);
        } catch (e) {
            setFormError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const radiusField = (
        <div>
            <label className={labelClass}>Radius (meters)</label>
            <input
                type="number"
                inputMode="numeric"
                min={RADIUS_MIN}
                max={RADIUS_MAX}
                value={form.radius_m}
                onChange={(e) => setForm({ ...form, radius_m: e.target.value })}
                onBlur={() => setForm((f) => ({ ...f, radius_m: clampRadius(f.radius_m) }))}
                className={inputClass}
            />
            <p className="ml-1 mt-1 text-[10px] font-semibold text-slate-400">{RADIUS_MIN}–{RADIUS_MAX} m. Students must stay inside this circle.</p>
        </div>
    );

    const capacityField = (
        <div>
            <label className={labelClass}>Max Students</label>
            <input
                type="number"
                inputMode="numeric"
                min={CAPACITY_MIN}
                max={CAPACITY_MAX}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                onBlur={() => setForm((f) => ({ ...f, capacity: clampCapacity(f.capacity) }))}
                className={inputClass}
            />
            <p className="ml-1 mt-1 text-[10px] font-semibold text-slate-400">Students assigned here at once. You can still go over it when assigning.</p>
        </div>
    );

    const nameFields = (
        <>
            <div>
                <label className={labelClass}>Site Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="e.g. Library" />
            </div>
            <div>
                <label className={labelClass}>Description (optional)</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} placeholder="e.g. Front entrance area" />
            </div>
        </>
    );

    const errorBox = formError && (
        <div className="flex gap-2 rounded-xl border-2 border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {formError}
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {toast && (
                <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-2xl border-2 border-emerald-100 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700 shadow-2xl">
                    <CheckCircle size={18} /> {toast}
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="mb-5 flex flex-col gap-4 border-b border-slate-50 pb-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-blue-50 p-2 text-ustp-blue dark:bg-blue-950/40">
                            <MapPin size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Service Sites</h3>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">GPS-registered service locations</p>
                        </div>
                    </div>
                    <button onClick={() => openPanel('new')} className="flex items-center justify-center gap-2 rounded-xl bg-ustp-blue px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md hover:bg-blue-800">
                        <Plus size={16} /> Register New Site
                    </button>
                </div>

                {typeof window !== 'undefined' && window.isSecureContext === false && (
                    <div className="mb-4 flex gap-3 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                        <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-500" />
                        <p>{GEO_MESSAGES.insecure}</p>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-sm font-bold text-slate-400">
                        <Loader2 size={18} className="animate-spin" /> Loading sites…
                    </div>
                ) : loadError ? (
                    <div className="rounded-2xl border-2 border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{loadError}</div>
                ) : sites.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center dark:border-slate-700">
                        <MapPin size={32} className="mx-auto mb-3 text-slate-300" />
                        <p className="text-sm font-black uppercase tracking-widest text-slate-400">No sites yet</p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">Stand at a service location and tap “Register New Site”.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sites.map((site) => (
                            <div key={site.id} className={`rounded-2xl border-2 p-4 ${site.is_active ? 'border-slate-100 dark:border-slate-700' : 'border-dashed border-slate-200 opacity-70 dark:border-slate-700'}`}>
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-base font-black text-slate-900 dark:text-white">{site.name}</p>
                                        <p className="font-mono text-xs font-black tracking-[0.2em] text-ustp-blue">{site.site_code}</p>
                                        {site.description && <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{site.description}</p>}
                                    </div>
                                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${site.is_active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
                                        {site.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                                    <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-900">
                                        <p className={`text-sm font-black ${(site.assigned_count ?? 0) >= (site.capacity ?? 10) ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                            {site.assigned_count ?? 0} / {site.capacity ?? 10}
                                        </p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Students</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-900">
                                        <p className="text-sm font-black text-slate-800 dark:text-slate-200">{site.radius_m} m</p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Radius</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-900">
                                        <p className={`text-sm font-black ${site.accuracy_m > WEAK_ACCURACY_M ? 'text-amber-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                            {site.accuracy_m != null ? `±${site.accuracy_m} m` : '—'}
                                        </p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Accuracy</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-900">
                                        <p className="text-sm font-black text-slate-800 dark:text-slate-200">{formatDate(site.registered_at)}</p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Registered</p>
                                    </div>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    <button onClick={() => setPanel({ mode: 'qr', site })} className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2.5 text-[11px] font-black uppercase tracking-wider text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200">
                                        <QrCode size={14} /> View QR
                                    </button>
                                    <button onClick={() => openPanel('recapture', site)} className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2.5 text-[11px] font-black uppercase tracking-wider text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200">
                                        <Crosshair size={14} /> Re-capture
                                    </button>
                                    <button onClick={() => openPanel('edit', site)} className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2.5 text-[11px] font-black uppercase tracking-wider text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200">
                                        <Pencil size={14} /> Edit
                                    </button>
                                    <button
                                        onClick={() => updateSite(site, { is_active: !site.is_active }, site.is_active ? `${site.site_code} deactivated` : `${site.site_code} activated`)}
                                        disabled={saving}
                                        className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-black uppercase tracking-wider ${site.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30'}`}
                                    >
                                        <Power size={14} /> {site.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {panel?.mode === 'new' && (
                <Panel title="Register New Site" onClose={closePanel}>
                    <div className="space-y-4">
                        {nameFields}
                        <div className="grid grid-cols-2 gap-3">
                            {radiusField}
                            {capacityField}
                            <div>
                                <label className={labelClass}>Site Code</label>
                                <input
                                    value={form.site_code}
                                    onChange={(e) => setForm({ ...form, site_code: e.target.value.toUpperCase() })}
                                    className={`${inputClass} font-mono uppercase`}
                                    placeholder="Auto"
                                    maxLength={17}
                                />
                                <p className="ml-1 mt-1 text-[10px] font-semibold text-slate-400">Leave blank to auto-create (e.g. LIB-01).</p>
                            </div>
                        </div>
                        <LocationCapture radius={clampRadius(form.radius_m)} result={capture} onResult={setCapture} />
                        {errorBox}
                        <button onClick={createSite} disabled={saving || !capture} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-md hover:bg-emerald-700 disabled:opacity-50">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Site
                        </button>
                    </div>
                </Panel>
            )}

            {panel?.mode === 'edit' && (
                <Panel title={`Edit ${panel.site.site_code}`} onClose={closePanel}>
                    <div className="space-y-4">
                        {nameFields}
                        {radiusField}
                            {capacityField}
                        <label className="flex items-center justify-between rounded-xl border-2 border-slate-100 p-3 dark:border-slate-700">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Active (students can use this site)</span>
                            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-5 w-5 accent-ustp-blue" />
                        </label>
                        <p className="text-[11px] font-semibold text-slate-400">The site code {panel.site.site_code} can't change, so printed QR codes keep working.</p>
                        {errorBox}
                        <button onClick={saveEdit} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ustp-blue py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-md hover:bg-blue-800 disabled:opacity-50">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
                        </button>
                    </div>
                </Panel>
            )}

            {panel?.mode === 'recapture' && (
                <Panel title={`Re-capture ${panel.site.site_code}`} onClose={closePanel}>
                    <div className="space-y-4">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                            Stand at <span className="font-black text-slate-800 dark:text-slate-200">{panel.site.name}</span> and capture again.
                            The site code stays {panel.site.site_code}, so printed QR codes keep working.
                        </p>
                        <LocationCapture radius={panel.site.radius_m} result={capture} onResult={setCapture} />
                        {errorBox}
                        <button onClick={saveRecapture} disabled={saving || !capture} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-md hover:bg-emerald-700 disabled:opacity-50">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save New Location
                        </button>
                    </div>
                </Panel>
            )}

            {panel?.mode === 'qr' && (
                <Panel title="Site QR Code" onClose={closePanel}>
                    <SiteQr site={panel.site} />
                </Panel>
            )}
        </div>
    );
};

export default ServiceSites;
