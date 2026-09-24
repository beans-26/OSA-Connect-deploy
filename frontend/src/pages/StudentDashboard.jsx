import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Key, User, Play, X, QrCode, FileText, CircleHelp } from 'lucide-react';
import QrScannerModal from '../components/QrScannerModal';
import { useStudentTheme } from '../components/useStudentTheme';

// Header copy shared with mobile/app/student/dashboard.jsx
const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'GOOD MORNING,';
    if (h < 17) return 'GOOD AFTERNOON,'; // evening from 5 PM, same as getSubGreetingText
    return 'GOOD EVENING,';
};

const getSubGreetingText = () => {
    const hour = new Date().getHours();
    let options;
    if (hour >= 5 && hour < 12) {
        options = [
            "Good morning! Ready to make today productive?",
            "Early start, nice! Let's get those hours in.",
            "A new day, a new opportunity to serve."
        ];
    } else if (hour >= 12 && hour < 17) {
        options = [
            "Good afternoon! How's your service going?",
            "Keep up the great work today.",
            "Another step closer to completing your hours."
        ];
    } else if (hour >= 17 && hour < 22) {
        options = [
            "Good evening! Still making progress?",
            "The day isn't over yet. Keep going!",
            "Finishing strong today?"
        ];
    } else {
        options = [
            "Working late? Your dedication is showing.",
            "Burning the midnight oil, huh?",
            "Late-night grind detected.",
            "Most people are asleep. You're still making progress.",
            "Don't forget to rest after your shift.",
            "The stars are out, and so are your service hours."
        ];
    }
    return options[Math.floor(Math.random() * options.length)];
};

// Leaflet geofence map framed like the mobile map card (hub, radius, and your position)
const GeofenceMap = ({ hub, location, isOutOfBounds, isDarkMode }) => {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const layersRef = useRef({});

    useEffect(() => {
        if (!containerRef.current || !window.L || !hub) return;
        const L = window.L;
        const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false })
            .setView([hub.lat, hub.lng], 18);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
        layersRef.current.circle = L.circle([hub.lat, hub.lng], {
            color: '#10b981', fillColor: '#10b981', fillOpacity: 0.15, radius: hub.radius
        }).addTo(map);
        layersRef.current.hub = L.marker([hub.lat, hub.lng], {
            icon: L.divIcon({
                className: '',
                html: '<div style="width:18px;height:18px;border-radius:9px;background:#1d4ed8;border:3px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.2)"></div>',
                iconSize: [18, 18]
            })
        }).addTo(map);
        mapRef.current = map;
        return () => {
            map.remove();
            mapRef.current = null;
            layersRef.current = {};
        };
    }, [hub?.lat, hub?.lng]);

    useEffect(() => {
        const L = window.L;
        const map = mapRef.current;
        if (!map || !L) return;
        const color = isOutOfBounds ? '#ef4444' : '#10b981';
        layersRef.current.circle?.setRadius(hub.radius).setStyle({ color, fillColor: color });
        if (!location) return;
        const icon = L.divIcon({
            className: '',
            html: `<div style="width:16px;height:16px;border-radius:8px;background:${color};border:2px solid #fff;box-shadow:0 1.5px 2px rgba(0,0,0,.15)"></div>`,
            iconSize: [16, 16]
        });
        if (layersRef.current.you) {
            layersRef.current.you.setLatLng([location.lat, location.lng]).setIcon(icon);
        } else {
            layersRef.current.you = L.marker([location.lat, location.lng], { icon }).addTo(map);
        }
    }, [location, isOutOfBounds, hub?.radius]);

    return (
        <div className="relative mt-3 h-[200px] w-full overflow-hidden rounded-[14px] border border-[var(--s-border)]">
            <div ref={containerRef} className={`h-full w-full ${isDarkMode ? 'brightness-[.8] contrast-[1.1]' : ''}`} />
            <div className="absolute right-3 top-3 z-[500] rounded-full bg-[var(--s-card)] px-3 py-1.5 text-[9px] font-black tracking-[1px] text-[var(--s-text)] shadow">
                LIVE GPS FEED
            </div>
            <div className="absolute bottom-2 left-2 z-[500] rounded-lg bg-[var(--s-card)] px-2 py-1.5 shadow">
                <div className="mb-1 flex items-center">
                    <span className="mr-1.5 h-2 w-2 rounded-full bg-[#1e3a8a]" />
                    <span className="text-[10px] font-bold text-[var(--s-text)]">Hub</span>
                </div>
                {location && (
                    <div className="mb-1 flex items-center">
                        <span className={`mr-1.5 h-2 w-2 rounded-full ${isOutOfBounds ? 'bg-[#ef4444]' : 'bg-[#10b981]'}`} />
                        <span className="text-[10px] font-bold text-[var(--s-text)]">You</span>
                    </div>
                )}
                <p className="mt-0.5 text-[10px] font-semibold text-[var(--s-muted)]">Radius: {Math.round(hub.radius)}m</p>
            </div>
        </div>
    );
};

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { isDarkMode } = useStudentTheme();
    const [subGreeting] = useState(getSubGreetingText);
    const [violations, setViolations] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [logs, setLogs] = useState([]);

    const [loading, setLoading] = useState(true);
    const [showAdminCode, setShowAdminCode] = useState(false);
    const [adminCode, setAdminCode] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [showStopScanner, setShowStopScanner] = useState(false);
    const [timerActive, setTimerActive] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [elapsed, setElapsed] = useState(0);
    const [location, setLocation] = useState(null);
    const [isOutOfBounds, setIsOutOfBounds] = useState(false);
    const [monitoringLocation, setMonitoringLocation] = useState(false);
    const [currentDistance, setCurrentDistance] = useState(0);
    const [warningCountdown, setWarningCountdown] = useState(null);
    const watchIdRef = React.useRef(null);

    const [pendingActionData, setPendingActionData] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [photoProof, setPhotoProof] = useState(null);
    const videoRef = React.useRef(null);
    const streamRef = React.useRef(null);
    const canvasRef = React.useRef(null);

    const startCamera = async () => {
        setCameraActive(true);
        setPhotoProof(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            streamRef.current = stream;
            // Need a slight delay to ensure videoRef is mounted
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, 100);
        } catch (err) {
            console.error("Camera access error:", err);
            alert("Unable to access the camera. Please allow camera permissions to continue.");
            setCameraActive(false);
            setPendingActionData(null);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            
            // Scale down to prevent payload too large errors
            const MAX_WIDTH = 640;
            const scaleSize = MAX_WIDTH / video.videoWidth;
            canvas.width = MAX_WIDTH;
            canvas.height = video.videoHeight * scaleSize;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // Compress to 60% quality
            setPhotoProof(dataUrl);
            stopCamera(); 
            setCameraActive(true); // Keep modal open to show preview
        }
    };

    const submitActionWithProof = async () => {
        if (!pendingActionData) return;
        
        try {
            const response = await fetch('/api/timelogs/log_time/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eticket_id: pendingActionData.ticketId,
                    action: pendingActionData.actionType,
                    lat: pendingActionData.forcedLat,
                    lng: pendingActionData.forcedLng,
                    radius: pendingActionData.forcedRadius,
                    photo_proof: photoProof
                }),
            });

            if (response.ok) {
                if (pendingActionData.actionType === 'in') {
                    setStartTime(Date.now());
                    setTimerActive(true);
                } else {
                    setTimerActive(false);
                    setStartTime(null);
                    setElapsed(0);
                    alert("TIMER STOPPED");
                }
                setShowAdminCode(false);
                setAdminCode('');
                fetchStudentData();
            } else {
                let errorMsg = "Server error. Check if the backend is running.";
                try {
                    const errorData = await response.json();
                    if (errorData.error) errorMsg = errorData.error;
                } catch(e) {}
                alert(errorMsg);
            }
        } catch (err) {
            alert("Network failure processing action.");
        } finally {
            setCameraActive(false);
            setPhotoProof(null);
            setPendingActionData(null);
        }
    };


    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const activeTicket = tickets.find(t => t.status === 'Ongoing') || tickets.find(t => t.status === 'Active');
    // Stored hours (before the open session); the live elapsed time is subtracted below
    const displayHours = activeTicket ? (activeTicket.base_remaining_hours ?? activeTicket.remaining_hours) : 0;

    useEffect(() => {
        fetchStudentData();
        const poll = setInterval(fetchStudentData, 5000);
        return () => clearInterval(poll);
    }, [user.username]);

    // Live countdown timer logic
    useEffect(() => {
        let interval;
        if (timerActive && startTime) {
            interval = setInterval(() => {
                const secondsSinceStart = Math.floor((Date.now() - startTime) / 1000);
                setElapsed(secondsSinceStart);

                // Auto-stop when hours reach zero
                const currentRemaining = displayHours - (secondsSinceStart / 3600);
                if (currentRemaining <= 0) {
                    autoStopTimer("Service obligation completed! The system has automatically recorded your completion.");
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timerActive, startTime, displayHours]);

    // Location Monitoring Effect (Leaflet watchPosition)
    useEffect(() => {
        if (timerActive && activeTicket && activeTicket.lat && activeTicket.lng) {
            setMonitoringLocation(true);

            const options = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            };

            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude, accuracy } = position.coords;
                    setLocation({ lat: latitude, lng: longitude });

                    const dist = calculateDistance(
                        latitude,
                        longitude,
                        activeTicket.lat,
                        activeTicket.lng
                    );
                    setCurrentDistance(dist);

                    // 15-meter limit with GPS accuracy buffer
                    const accuracyBuffer = accuracy * 0.7;
                    const effectiveRadius = (activeTicket.radius || 15) + accuracyBuffer;
                    const isOut = dist > effectiveRadius;
                    setIsOutOfBounds(isOut);

                    // Automatically stop session if more than 15 meters away
                    if (isOut) {
                        handleBoundaryViolation();
                    }
                },
                (err) => {
                    console.error("Location tracking error:", err);
                    // Automatically stop timer if location is disabled or permission is revoked
                    if (err.code === 1 || err.code === 2) {
                        autoStopTimer("Security Alert: Location services must remain ON. Your session has been stopped.");
                    }
                },
                options
            );
        } else {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            setMonitoringLocation(false);
            setIsOutOfBounds(false);
        }

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
        // Keyed on the ticket's fields so the 5s poll (new objects each time) doesn't restart GPS tracking
    }, [timerActive, activeTicket?.id, activeTicket?.lat, activeTicket?.lng, activeTicket?.radius]);

    const handleBoundaryViolation = async () => {
        if (warningCountdown === null) {
            setWarningCountdown(30); // Start a 30s countdown
        }
    };

    // Warning Countdown Effect (TICKER)
    useEffect(() => {
        let timer;
        if (isOutOfBounds && timerActive) {
            if (warningCountdown === null) setWarningCountdown(30);
            timer = setInterval(() => {
                setWarningCountdown(prev => {
                    if (prev === null) return 30;
                    if (prev <= 1) {
                        autoStopTimer("Geofencing restriction: You were out of bounds for more than 30 seconds.");
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            setWarningCountdown(null);
        }
        return () => clearInterval(timer);
    }, [isOutOfBounds, timerActive]);

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // Earth radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    };

    const autoStopTimer = async (reason) => {
        if (!timerActive || !activeTicket) return;
        try {
            const ticketId = activeTicket.id;
            await fetch('/api/timelogs/log_time/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eticket_id: ticketId, action: 'out' }),
            });
            setTimerActive(false);
            setStartTime(null);
            setElapsed(0);
            fetchStudentData();
            alert(reason);
        } catch (e) { }
    };

    const fetchStudentData = async () => {
        if (!user.username) return;
        try {
            const vResponse = await fetch('/api/violations/');
            const allViolations = await vResponse.json();

            let allTickets = [];
            try {
                const tResponse = await fetch('/api/etickets/?t=' + Date.now());
                allTickets = await tResponse.json();
                console.log('DEBUG: All Tickets Received:', allTickets);
            } catch (e) { console.log('ETickets error', e); }

            let allLogs = [];
            try {
                const lResponse = await fetch('/api/timelogs/?t=' + Date.now());
                allLogs = await lResponse.json();
            } catch (e) { console.log('Timelogs error', e); }

            const studentViolations = allViolations.filter(v =>
                v.student_details?.student_id === user.username
            );

            // All of the student's tickets are listed (like mobile); only open ones can be timed
            const studentTickets = allTickets.filter(t =>
                t.violation_details?.student_details?.student_id === user.username
            );
            const openTickets = studentTickets.filter(t => t.status === 'Ongoing' || t.status === 'Active');

            setViolations(studentViolations);
            setTickets(studentTickets);
            setLogs(allLogs);

            // Check for active Backend Timer
            if (openTickets.length > 0) {
                const ongoingTicket = openTickets.find(t => t.status === 'Ongoing') || openTickets[0];

                if (ongoingTicket.active_time_in) {
                    // Same as the mobile app: time served so far by the server's own clock (balance before
                    // this session minus the live balance), anchored to this device's clock. Parsing the
                    // stored time_in breaks when the server and the student are in different time zones.
                    const base = ongoingTicket.base_remaining_hours ?? ongoingTicket.remaining_hours ?? 0;
                    const live = ongoingTicket.remaining_hours ?? base;
                    const servedMs = Math.max(0, (base - live) * 3600 * 1000);
                    setStartTime(Date.now() - servedMs);
                    setTimerActive(true);
                } else {
                    setTimerActive(false);
                    setStartTime(null);
                    setElapsed(0);
                }
            } else {
                setTimerActive(false);
                setStartTime(null);
                setElapsed(0);
            }
        } catch (error) {
            console.error('Error fetching student data:', error);
        } finally {
            setLoading(false);
        }
    };

    const processCode = async (codeToProcess) => {
        const rawCode = (codeToProcess || adminCode) || "";
        const payloadCode = rawCode.trim().toUpperCase();

        if (!activeTicket) {
            alert("No active Service Obligations. Please wait for the Admin to assign your fresh violation.");
            return;
        }

        let actionType = null;
        let forcedLat = null;
        let forcedLng = null;
        let forcedRadius = 15; // 15 meters as requested
        const pinnedLoc = JSON.parse(localStorage.getItem('pinned-citc-loc') || 'null');

        // 1. Dynamic Coordinate QR (LAT:8.485121,LNG:124.656512)
        if (payloadCode.includes("LAT:") && payloadCode.includes("LNG:")) {
            try {
                const latMatch = payloadCode.match(/LAT:(-?\d+\.\d+)/);
                const lngMatch = payloadCode.match(/LNG:(-?\d+\.\d+)/);
                if (latMatch && lngMatch) {
                    forcedLat = parseFloat(latMatch[1]);
                    forcedLng = parseFloat(lngMatch[1]);
                    forcedRadius = 15;
                    actionType = 'in';
                }
            } catch (e) {
                console.error("Coordinate parsing error:", e);
            }
        }

        // 2. Specific Building/Dept Codes
        if (!actionType) {
            if (payloadCode.includes("XKMBPQLVJZWFRCYTNDHSGEUIA") || payloadCode.includes("CITC-DEPT")) {
                forcedLat = 8.503306;
                forcedLng = 124.660861;
                forcedRadius = 15;
                actionType = 'in';
            } else if (payloadCode.includes("CSM-DEPT")) {
                forcedLat = 8.485421;
                forcedLng = 124.656812;
                forcedRadius = 15;
                actionType = 'in';
            } else if (payloadCode.includes("CEA-DEPT")) {
                forcedLat = 8.485721;
                forcedLng = 124.657112;
                forcedRadius = 15;
                actionType = 'in';
            }
        }

        // 3. System Action Codes
        if (!actionType) {
            if (payloadCode.includes("OSA-START") || payloadCode.includes("OSA-RESUME")) {
                actionType = 'in';
            } else if (payloadCode.includes("OSA-PAUSE") || payloadCode.includes("OSA-STOP") || payloadCode.includes("OSA-OUT")) {
                actionType = 'out';
            }
        }

        if (!actionType) {
            alert("Invalid QR Code. Please scan a valid location or action code.");
            return;
        }
        try {
            // SECURITY REQUIREMENT: Mandatory location check for all Time-In actions
            if (actionType === 'in') {
                if (!navigator.geolocation) {
                    alert("SECURITY BLOCK: Geocation is not supported by this browser.");
                    return;
                }

                try {
                    // This "ping" ensures location is active and permissions are granted
                    await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                            enableHighAccuracy: true,
                            timeout: 8000,
                            maximumAge: 0
                        });
                    });
                } catch (locErr) {
                    if (locErr.code === 1) {
                        alert("ACCESS DENIED: You must enable Location Services to start your service timer.");
                    } else if (locErr.code === 3) {
                        alert("GPS TIMEOUT: Please move to an area with better signal and try again.");
                    } else {
                        alert("LOCATION ERROR: Unable to verify your position. Please ensure GPS is ON.");
                    }
                    return;
                }
            }

            const ticketId = activeTicket.id;
            setPendingActionData({
                ticketId,
                actionType,
                forcedLat,
                forcedLng,
                forcedRadius
            });
            setShowAdminCode(false);
            startCamera();
        } catch (err) {
            console.error(err);
            if (err.code === 1) alert("PERMISSION DENIED: Please reset location permissions in your browser settings.");
            else if (err.code === 3) alert("GPS TIMEOUT: Move closer to a window for a better signal.");
            else alert("Error: " + (err.message || "Unknown Failure"));
        }
    };

    const processStopCode = async (codeToProcess) => {
        const payloadCode = (codeToProcess || "").trim().toUpperCase();
        if (!activeTicket) {
            alert("No active Service Obligations to process.");
            return;
        }

        if (payloadCode !== "OSA-PAUSE" && payloadCode !== "VNZMXBCALSKDJFHGQPWIEURYT" && payloadCode !== "OSA-STOP") {
            alert(`INVALID CODE: ${payloadCode}. Please scan a valid STOP QR code.`);
            return;
        }

        try {
            const ticketId = activeTicket.id;
            setPendingActionData({
                ticketId,
                actionType: 'out',
                forcedLat: null,
                forcedLng: null,
                forcedRadius: null
            });
            startCamera();
        } catch (err) {
            alert("Network failure processing action code.");
        }
    };

    const formatRemainingTime = () => {
        if (!activeTicket) return '00:00:00';
        const currentRemainingHours = Math.max(0, displayHours - (elapsed / 3600));
        const hours = Math.floor(currentRemainingHours);
        const minutes = Math.floor((currentRemainingHours - hours) * 60);
        const seconds = Math.floor(((currentRemainingHours - hours) * 60 - minutes) * 60);
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const displayName = user.name?.split(' ')[0] || user.username || 'User';
    const hub = activeTicket?.lat != null && activeTicket?.lng != null
        ? { lat: activeTicket.lat, lng: activeTicket.lng, radius: activeTicket.radius || 15 }
        : null;

    const ticketBadge = (status) =>
        status === 'Active' ? 'bg-[#dcfce7] text-[#10b981]' :
        status === 'Completed' ? 'bg-[#f1f5f9] text-[#64748b]' :
        'bg-[#faf5ff] text-[#7c3aed]';

    return (
        <div className="student-ui" data-theme={isDarkMode ? 'dark' : 'light'}>
            {/* QR Scanner (start) */}
            {isScanning && (
                <QrScannerModal
                    title="Scan the Hub QR Code"
                    subtitle="Start your community service session"
                    onClose={() => setIsScanning(false)}
                    onResult={(text) => { setIsScanning(false); processCode(text); }}
                />
            )}

            {/* QR Scanner (end) */}
            {showStopScanner && (
                <QrScannerModal
                    title="Scan to End Service"
                    subtitle="Scan the OSA stop code to end your session"
                    accent="#ef4444"
                    onClose={() => setShowStopScanner(false)}
                    onResult={(text) => { setShowStopScanner(false); processStopCode(text); }}
                />
            )}

            {/* Photo proof */}
            {cameraActive && (
                <div className="fixed inset-0 z-[60] bg-black">
                    {!photoProof ? (
                        <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
                    ) : (
                        <img src={photoProof} alt="Proof" className="h-full w-full object-cover" />
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                    <p className="absolute left-0 right-0 top-[60px] text-center text-base font-bold text-white [text-shadow:0_1px_4px_rgba(0,0,0,.5)]">
                        {photoProof ? 'Use this photo?' : 'Take a real-time photo'}
                    </p>
                    <button
                        onClick={() => { stopCamera(); setCameraActive(false); setPendingActionData(null); setPhotoProof(null); }}
                        className="absolute right-5 top-14 rounded-full bg-black/55 p-3 text-white"
                    >
                        <X size={22} />
                    </button>
                    <div className="absolute bottom-[60px] left-0 right-0 flex items-center justify-center px-6">
                        {!photoProof ? (
                            <button onClick={capturePhoto} aria-label="Capture photo" className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-white bg-white/25">
                                <span className="h-[58px] w-[58px] rounded-full bg-white" />
                            </button>
                        ) : (
                            <div className="flex w-full max-w-md gap-3">
                                <button onClick={() => { setPhotoProof(null); startCamera(); }} className="flex-1 rounded-[14px] bg-white/90 p-4 text-sm font-bold uppercase tracking-[1px] text-[#0f172a]">
                                    Retake
                                </button>
                                <button onClick={submitActionWithProof} className="flex-1 rounded-[14px] bg-[#1e3a8a] p-4 text-sm font-bold uppercase tracking-[1px] text-white">
                                    Submit
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <main className="mx-auto w-full max-w-xl px-5 pb-16 pt-4">
                {/* Header */}
                <header className="mb-6 flex items-center justify-between">
                    <div className="flex-1">
                        <p className="mb-1 text-xs font-black uppercase tracking-[2px] text-[var(--s-muted)]">{getGreeting()}</p>
                        <h1 className="text-2xl font-black tracking-[0.5px] text-[var(--s-text)]">Hi, {displayName}!</h1>
                        <p className="mt-1 text-sm font-semibold text-[var(--s-muted)]">{subGreeting}</p>
                    </div>
                    {/* Help + profile, like the mobile dashboard header */}
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={() => navigate('/help')}
                            aria-label="Help"
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--s-card)] text-[var(--s-text)] shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
                        >
                            <CircleHelp size={22} strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={() => navigate('/student/settings')}
                            aria-label="Profile settings"
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--s-card)] text-[var(--s-text)] shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
                        >
                            <User size={22} strokeWidth={2.5} />
                        </button>
                    </div>
                </header>

                {/* Active Session Card */}
                <section className={`mb-6 rounded-[20px] bg-[var(--s-card)] p-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)] ${isOutOfBounds ? 'border-[1.5px] border-[#ef4444]' : 'border border-[var(--s-border)]'}`}>
                    {timerActive ? (
                        <>
                            <div className="mb-3 flex items-center">
                                <Play size={16} className={isOutOfBounds ? 'text-[#ef4444]' : 'text-[var(--s-success)]'} />
                                <span className={`ml-2 text-xs font-black uppercase tracking-[2px] ${isOutOfBounds ? 'text-[#ef4444]' : 'text-[var(--s-success)]'}`}>
                                    Live Community Service
                                </span>
                            </div>
                            <div className="my-2 text-[52px] font-black leading-tight tabular-nums text-[var(--s-text)]">
                                {formatRemainingTime()}
                            </div>

                            {/* Location status */}
                            <div className={`mt-3 flex items-center gap-2 rounded-xl border p-3 ${isOutOfBounds ? 'border-[#fca5a5] bg-[#fee2e2]' : 'border-[var(--s-border)] bg-[var(--s-bg)]'}`}>
                                <span className={`h-2 w-2 rounded-full ${isOutOfBounds ? 'bg-[#ef4444]' : 'bg-[var(--s-success)]'}`} />
                                <span className={`text-[13px] font-bold ${isOutOfBounds ? 'text-[#ef4444]' : 'text-[var(--s-muted)]'}`}>
                                    {!monitoringLocation || !location
                                        ? 'Fetching location...'
                                        : isOutOfBounds
                                            ? `Out of bounds — ${Math.round(currentDistance)}m away`
                                            : `Within service area — ${Math.round(currentDistance)}m from hub`}
                                </span>
                            </div>

                            {hub && (
                                <GeofenceMap hub={hub} location={location} isOutOfBounds={isOutOfBounds} isDarkMode={isDarkMode} />
                            )}

                            {warningCountdown !== null && (
                                <div className="mt-4 flex items-center justify-between rounded-[18px] bg-[#e11d48] px-[18px] py-3.5 shadow-[0_4px_6px_rgba(225,29,72,0.2)]">
                                    <div className="flex flex-1 items-center">
                                        <AlertTriangle size={24} strokeWidth={2.5} className="text-white" />
                                        <div className="ml-3">
                                            <p className="text-[13px] font-black uppercase tracking-[0.5px] text-white">Warning: Out of Boundary</p>
                                            <p className="mt-0.5 text-xs font-semibold text-[#fecdd3]">Return to area immediately!</p>
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-white px-3 py-1.5 text-xl font-black text-[#e11d48]">{warningCountdown}</div>
                                </div>
                            )}

                            <button
                                onClick={() => setShowStopScanner(true)}
                                className="mt-4 w-full rounded-[14px] bg-[var(--s-primary)] p-4 text-sm font-bold uppercase tracking-[1px] text-white"
                            >
                                Scan to End Service
                            </button>
                        </>
                    ) : (
                        <div className="text-center">
                            <div className="mb-4 mt-2 flex justify-center text-[var(--s-border)]">
                                <QrCode size={48} strokeWidth={1.5} />
                            </div>
                            <h2 className="mb-2 text-lg font-black text-[var(--s-text)]">No Active Session</h2>
                            <p className="mb-5 text-sm font-medium leading-5 text-[var(--s-muted)]">
                                Scan an activity QR code to start<br />tracking your community service hours.
                            </p>
                            {showAdminCode ? (
                                <div className="mx-auto max-w-xs space-y-3">
                                    <input
                                        type="password"
                                        autoFocus
                                        placeholder="Enter staff code"
                                        className="w-full rounded-lg border border-[var(--s-border)] bg-[var(--s-bg)] p-3 text-center font-semibold tracking-widest text-[var(--s-text)] outline-none focus:border-[var(--s-primary)]"
                                        value={adminCode}
                                        onChange={(e) => setAdminCode(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && processCode()}
                                    />
                                    <div className="flex gap-3">
                                        <button onClick={() => { setShowAdminCode(false); setAdminCode(''); }} className="flex-1 rounded-xl bg-[var(--s-bg)] p-3 text-[13px] font-bold text-[var(--s-muted)]">
                                            Cancel
                                        </button>
                                        <button onClick={() => processCode()} className="flex-1 rounded-xl bg-[var(--s-primary)] p-3 text-[13px] font-bold text-white">
                                            Submit
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <button onClick={() => setIsScanning(true)} className="rounded-xl bg-[var(--s-primary)] px-7 py-3 text-[13px] font-bold tracking-[0.5px] text-white">
                                        Scan QR Code
                                    </button>
                                    <button onClick={() => setShowAdminCode(true)} className="mx-auto mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-[var(--s-muted)] hover:text-[var(--s-primary)]">
                                        <Key size={12} /> Enter code manually
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </section>

                {/* E-Tickets */}
                <section className="mb-6">
                    <h2 className="mb-1 text-lg font-black text-[var(--s-text)]">E-Tickets</h2>
                    <p className="mb-4 text-sm font-medium text-[var(--s-muted)]">Your violation tickets</p>

                    {loading ? (
                        <div className="mt-4 flex justify-center">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--s-primary)] border-t-transparent" />
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-6 text-[var(--s-border)]">
                            <FileText size={32} />
                            <p className="text-[13px] italic text-[var(--s-muted)]">No tickets found</p>
                        </div>
                    ) : (
                        tickets.map((ticket, idx) => (
                            <div key={ticket.id || idx} className="mb-2 flex items-center rounded-xl border border-[var(--s-border)] bg-[var(--s-card)] p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                                <span className={`mr-3 h-2 w-2 shrink-0 rounded-full ${ticket.status === 'Active' ? 'bg-[#ff6b35]' : 'bg-[var(--s-success)]'}`} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13px] font-bold text-[var(--s-text)]">Ticket #{ticket.id}</p>
                                    <p className="mt-0.5 text-[11px] text-[var(--s-muted)]">{ticket.violation_details?.violation_type || 'Violation'}</p>
                                    <p className="mt-0.5 text-[10px] text-[var(--s-muted)]">Required: {ticket.total_hours_required || 0} hrs</p>
                                </div>
                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${ticketBadge(ticket.status)}`}>
                                    {ticket.status || 'Pending'}
                                </span>
                            </div>
                        ))
                    )}
                </section>
            </main>
        </div>
    );
};

export default StudentDashboard;
