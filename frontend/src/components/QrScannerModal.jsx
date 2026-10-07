import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { X, ImageUp, CameraOff, RotateCcw } from 'lucide-react';

// Full-screen QR scanner shared by the student and guard pages.
// Mount it only while scanning; it releases the camera on unmount (and before onResult,
// so the next step, e.g. the photo-proof camera, can open the camera immediately).
// allowUpload adds "scan from a photo"; keep it off for students, who must scan live.
// validate(text) is optional: return an error message to reject a code and keep scanning.
const QrScannerModal = ({ title, subtitle, accent = '#1e3a8a', allowUpload = false, validate, onResult, onClose }) => {
    const videoRef = useRef(null);
    const scannerRef = useRef(null);
    const doneRef = useRef(false);
    const fileRef = useRef(null);
    // The camera callback is created once per start, so read the latest handler through a ref
    const onResultRef = useRef(onResult);
    onResultRef.current = onResult;
    const validateRef = useRef(validate);
    validateRef.current = validate;
    const lastRejectRef = useRef({ text: null, at: 0 });
    const errorTimerRef = useRef(null);
    const [scanError, setScanError] = useState(null);
    const [status, setStatus] = useState('starting'); // starting | scanning | detected | error
    const [errorMsg, setErrorMsg] = useState('');
    const [attempt, setAttempt] = useState(0);

    const finish = (text) => {
        if (doneRef.current) return;
        const error = validateRef.current?.(text);
        if (error) {
            // The camera reports the same code many times per second; react to it once every 2.5 s
            const now = Date.now();
            const last = lastRejectRef.current;
            if (last.text === text && now - last.at < 2500) return;
            lastRejectRef.current = { text, at: now };
            setScanError(error);
            navigator.vibrate?.([80, 80, 80]);
            clearTimeout(errorTimerRef.current);
            errorTimerRef.current = setTimeout(() => setScanError(null), 3000);
            return;
        }
        setScanError(null);
        doneRef.current = true;
        scannerRef.current?.stop();
        setStatus('detected');
        navigator.vibrate?.(60);
        // Short success flash before handing off
        setTimeout(() => onResultRef.current(text), 350);
    };

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        doneRef.current = false;
        setStatus('starting');

        const scanner = new QrScanner(video, (result) => finish(result.data), {
            returnDetailedScanResult: true,
            preferredCamera: 'environment',
            maxScansPerSecond: 12,
            // Only decode the square inside the viewfinder
            calculateScanRegion: (v) => {
                const size = Math.round(Math.min(v.videoWidth, v.videoHeight) * 0.7);
                return {
                    x: Math.round((v.videoWidth - size) / 2),
                    y: Math.round((v.videoHeight - size) / 2),
                    width: size,
                    height: size,
                };
            },
        });
        scannerRef.current = scanner;

        scanner.start()
            .then(() => setStatus('scanning'))
            .catch((err) => {
                const msg = String(err?.name || err || '');
                setErrorMsg(
                    /NotAllowed|Permission/i.test(msg)
                        ? 'Camera access is blocked. On iPhone (Safari): tap the page menu button on the left of the address bar (it shows aA or a page icon) > Website Settings > Camera > Allow, and check Settings > Apps > Safari > Camera. On other browsers: tap the lock icon next to the address bar and allow Camera. Then try again.'
                        : /NotFound|no camera/i.test(msg)
                            ? `No camera was found on this device.${allowUpload ? ' You can upload a photo of the QR code instead.' : ''}`
                            : 'The camera could not be started. Close other apps using it and try again.'
                );
                setStatus('error');
            });

        return () => {
            scanner.destroy();
            scannerRef.current = null;
        };
    }, [attempt]);

    const scanFile = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        try {
            const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
            const error = validateRef.current?.(result.data);
            if (error && status === 'error') {
                // Camera is unavailable, so the bottom hint isn't shown; report it in the error card
                setErrorMsg(error);
                return;
            }
            finish(result.data);
        } catch {
            setErrorMsg('No QR code was found in that image. Try a clearer, closer photo.');
            setStatus('error');
        }
    };

    useEffect(() => () => clearTimeout(errorTimerRef.current), []);

    const frameColor = status === 'detected' ? '#10b981' : scanError ? '#ef4444' : '#ffffff';
    // The brand navy is too dark to read over video, so the laser uses a lighter blue
    const laserColor = accent === '#1e3a8a' ? '#60a5fa' : accent;

    return (
        // translateZ(0) puts the scanner on its own layer: iPhone Safari otherwise drew the dashboard's
        // Leaflet map (3D-transformed tiles) on top of it despite the z-index
        <div className="fixed inset-0 z-[70] overflow-hidden bg-black text-white [transform:translateZ(0)]" role="dialog" aria-modal="true" aria-label={title}>
            <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />

            {/* Viewfinder: the huge shadow darkens everything outside the square */}
            {status !== 'error' && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div
                        className="relative h-[min(70vw,280px)] w-[min(70vw,280px)] rounded-[28px] transition-colors"
                        style={{ boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.62)' }}
                    >
                        {[
                            'left-0 top-0 border-l-4 border-t-4 rounded-tl-[28px]',
                            'right-0 top-0 border-r-4 border-t-4 rounded-tr-[28px]',
                            'left-0 bottom-0 border-l-4 border-b-4 rounded-bl-[28px]',
                            'right-0 bottom-0 border-r-4 border-b-4 rounded-br-[28px]',
                        ].map((pos) => (
                            <span key={pos} className={`absolute h-12 w-12 ${pos}`} style={{ borderColor: frameColor }} />
                        ))}
                        {status === 'scanning' && (
                            <span
                                className="qr-scanline absolute left-5 right-5 h-[3px] rounded-full"
                                style={{ background: `linear-gradient(90deg, transparent, ${laserColor}, transparent)`, boxShadow: `0 0 14px ${laserColor}` }}
                            />
                        )}
                        {status === 'starting' && (
                            <span className="absolute inset-0 m-auto h-9 w-9 animate-spin rounded-full border-[3px] border-white/80 border-t-transparent" />
                        )}
                        {status === 'detected' && <span className="absolute inset-0 rounded-[28px] bg-emerald-400/20" />}
                    </div>
                </div>
            )}

            {/* Top bar */}
            <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-4 bg-gradient-to-b from-black/70 to-transparent px-5 pb-10 pt-6">
                <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[2px] text-white/60">OSAConnect Scanner</p>
                    <h2 className="mt-1 text-xl font-black leading-tight">{title}</h2>
                    {subtitle && <p className="mt-1 text-sm font-medium text-white/70">{subtitle}</p>}
                </div>
                <button onClick={onClose} aria-label="Close scanner" className="shrink-0 rounded-full bg-white/15 p-3 backdrop-blur hover:bg-white/25">
                    <X size={22} />
                </button>
            </div>

            {/* Error state */}
            {status === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                    <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center text-slate-900 shadow-2xl">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
                            <CameraOff size={26} />
                        </div>
                        <h3 className="text-lg font-black">Scanner unavailable</h3>
                        <p className="mt-2 text-sm leading-5 text-slate-500">{errorMsg}</p>
                        <div className="mt-6 flex gap-3">
                            <button onClick={() => setAttempt((a) => a + 1)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-100 p-3 text-sm font-bold text-slate-600">
                                <RotateCcw size={16} /> Try again
                            </button>
                            {allowUpload && (
                                <button onClick={() => fileRef.current?.click()} className="flex flex-1 items-center justify-center gap-2 rounded-xl p-3 text-sm font-bold text-white" style={{ background: accent }}>
                                    <ImageUp size={16} /> Upload photo
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom hint + controls */}
            {status !== 'error' && (
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-5 bg-gradient-to-t from-black/75 to-transparent px-5 pb-10 pt-16">
                    {scanError ? (
                        <div role="alert" className="max-w-sm rounded-2xl bg-red-500/90 px-4 py-3 text-center">
                            <p className="text-sm font-black">Invalid QR code</p>
                            <p className="mt-1 text-[13px] leading-5">{scanError}</p>
                        </div>
                    ) : (
                        <p className="text-center text-sm font-semibold text-white/85">
                            {status === 'detected' ? 'QR code detected' : status === 'starting' ? 'Starting camera…' : 'Align the QR code inside the frame'}
                        </p>
                    )}
                    {allowUpload && (
                        <button onClick={() => fileRef.current?.click()} aria-label="Scan from a photo" className="flex items-center gap-2 rounded-full bg-white/15 px-5 py-4 text-sm font-bold backdrop-blur hover:bg-white/25">
                            <ImageUp size={20} /> Upload photo
                        </button>
                    )}
                </div>
            )}

            {allowUpload && <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={scanFile} />}
        </div>
    );
};

export default QrScannerModal;
