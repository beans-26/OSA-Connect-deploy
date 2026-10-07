import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, CheckCircle2, Loader2, FileText } from 'lucide-react';
import { photoToDataUrl } from '../lib/photo';

// Opened on the admin's phone by scanning the QR code in a violation's details on the dashboard.
// Takes the photos of the signed ISO form and the reflection paper with the phone camera; the computer
// shows them as soon as they're saved. No login: the signed link in the QR (/api/capture/<token>/) only
// works for that violation, for 30 minutes.
const DOCUMENTS = [
    { kind: 'iso_form', label: 'ISO Form', hint: 'The signed FM-USTP-OSA-013' },
    { kind: 'reflection', label: 'Reflection Paper', hint: "The student's written reflection" },
];

const ClearanceCapture = () => {
    const { token } = useParams();
    const [info, setInfo] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(null);
    const [previews, setPreviews] = useState({});

    useEffect(() => {
        fetch(`/api/capture/${encodeURIComponent(token)}/`)
            .then(async (r) => {
                const data = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(data.error || "Couldn't open this link.");
                setInfo(data);
                if (data.error) setError(data.error);
            })
            .catch((e) => setError(e.message === 'Failed to fetch' ? "Can't reach the server. Check your connection." : e.message));
    }, [token]);

    const take = async (kind, file) => {
        if (!file) return;
        setBusy(kind);
        setError('');
        try {
            const image = await photoToDataUrl(file);
            const r = await fetch(`/api/capture/${encodeURIComponent(token)}/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kind, image }),
            });
            const data = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(data.error || "Couldn't save the photo.");
            setPreviews((prev) => ({ ...prev, [kind]: image }));
            setInfo((prev) => ({ ...prev, uploaded: { ...prev.uploaded, [kind]: true } }));
        } catch (e) {
            setError(e.message === 'Failed to fetch' ? "Can't reach the server. Check your connection." : e.message);
        } finally {
            setBusy(null);
        }
    };

    const done = info && DOCUMENTS.every((d) => info.uploaded?.[d.kind]);

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
            <div className="mx-auto max-w-md">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">OSAConnect · Clearance</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight">Take photos</h1>

                {!info && !error && (
                    <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" size={28} /></div>
                )}

                {info && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-base font-bold">{info.student_name || 'Student'}</p>
                        <p className="text-xs font-semibold text-slate-500">
                            {info.student_id} · <span className="text-red-600">{info.violation_type}</span>
                        </p>
                    </div>
                )}

                {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">{error}</p>}

                {info && !info.error && (
                    <div className="mt-4 space-y-3">
                        {DOCUMENTS.map((d) => {
                            const saved = info.uploaded?.[d.kind];
                            return (
                                <div key={d.kind} className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <FileText size={16} className="text-ustp-blue" />
                                            <p className="text-sm font-black uppercase tracking-widest">{d.label}</p>
                                        </div>
                                        {saved && <span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle2 size={15} /> Saved</span>}
                                    </div>
                                    <p className="mt-1 text-xs font-medium text-slate-500">{d.hint}</p>
                                    {previews[d.kind] && (
                                        <img src={previews[d.kind]} alt={d.label} className="mt-3 max-h-56 w-full rounded-xl border border-slate-100 object-contain" />
                                    )}
                                    {/* capture opens the camera straight away on phones */}
                                    <label className={`mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-black text-white ${busy ? 'pointer-events-none opacity-60' : ''} ${saved ? 'bg-slate-700' : 'bg-ustp-blue'}`}>
                                        {busy === d.kind ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                                        {busy === d.kind ? 'Saving…' : saved ? 'Retake photo' : 'Take photo'}
                                        <input type="file" accept="image/*" capture="environment" className="hidden"
                                            onChange={(e) => { take(d.kind, e.target.files?.[0]); e.target.value = ''; }} />
                                    </label>
                                </div>
                            );
                        })}
                        {done && (
                            <p className="rounded-2xl bg-emerald-50 p-4 text-center text-sm font-bold text-emerald-700">
                                Both photos are saved. Approve the clearance on the computer.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClearanceCapture;
