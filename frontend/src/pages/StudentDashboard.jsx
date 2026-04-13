import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import {
    Shield,
    Clock,
    History,
    Scan,
    AlertTriangle,
    Inbox,
    Key,
    User,
    Play,
    CheckCircle,
    X,
    QrCode,
    MapPin,
    Navigation,
    LocateFixed
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const LiveTimer = ({ startTime }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    return <span className="font-mono text-green-600 font-black tracking-tighter">{formatTime(elapsed)}</span>;
};

const StudentDashboard = () => {
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
    const [gpsAccuracy, setGpsAccuracy] = useState(0);
    const mapRef = React.useRef(null);
    const [markerInstance, setMarkerInstance] = useState(null);
    const [circleInstance, setCircleInstance] = useState(null);
    const watchIdRef = React.useRef(null);

    // Leaflet Map Setup
    useEffect(() => {
        if (!location || !timerActive || mapRef.current) return;

        const timer = setTimeout(() => {
            try {
                const container = document.getElementById('geofence-map');
                if (!container || !window.L) return;

                const map = L.map('geofence-map', { zoomControl: false }).setView([location.lat, location.lng], 18);
                L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap'
                }).addTo(map);

                const studentIcon = L.divIcon({
                    className: 'student-map-icon',
                    html: '<div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg animate-pulse"></div>',
                    iconSize: [16, 16]
                });

                const marker = L.marker([location.lat, location.lng], { icon: studentIcon }).addTo(map);

                let circle = null;
                if (activeTicket?.lat) {
                    circle = L.circle([activeTicket.lat, activeTicket.lng], {
                        color: '#10b981',
                        fillColor: '#10b981',
                        fillOpacity: 0.2,
                        radius: (activeTicket.radius || 3) + (gpsAccuracy * 0.7)
                    }).addTo(map);
                }

                mapRef.current = map;
                setMarkerInstance(marker);
                setCircleInstance(circle);
            } catch (e) {
                console.error("Leaflet init error:", e);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [location, timerActive]);

    // Update Marker/Circle on Location Change
    useEffect(() => {
        if (!mapRef.current || !location) return;

        if (markerInstance) {
            markerInstance.setLatLng([location.lat, location.lng]);
            mapRef.current.panTo([location.lat, location.lng]);
        }

        if (circleInstance && activeTicket?.lat) {
            const dist = calculateDistance(location.lat, location.lng, activeTicket.lat, activeTicket.lng);
            const limit = (activeTicket.radius || 3) + (gpsAccuracy * 0.7);
            
            circleInstance.setLatLng([activeTicket.lat, activeTicket.lng]);
            circleInstance.setRadius(limit);

            if (dist > limit) {
                circleInstance.setStyle({ color: '#ef4444', fillColor: '#ef4444' });
            } else {
                circleInstance.setStyle({ color: '#10b981', fillColor: '#10b981' });
            }
        }
    }, [location, gpsAccuracy]);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const activeTicket = tickets.find(t => t.status === 'Ongoing') || tickets.find(t => t.status === 'Active');
    const displayHours = activeTicket ? activeTicket.remaining_hours : 0;

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
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timerActive, startTime]);

    // QR Scanner Effect
    useEffect(() => {
        if (!isScanning) return;

        const scanner = new Html5QrcodeScanner("student-qr-reader", {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true
        });

        scanner.render((decodedText) => {
            scanner.clear();
            setIsScanning(false);
            processCode(decodedText);
        }, (err) => {
            // ignore
        });

        return () => {
            scanner.clear().catch(e => console.error("Scanner cleared:", e));
        };
    }, [isScanning]);

    // Stop QR Scanner Effect
    useEffect(() => {
        if (!showStopScanner) return;

        const scanner = new Html5QrcodeScanner("stop-qr-reader", {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true
        });

        scanner.render((decodedText) => {
            scanner.clear();
            setShowStopScanner(false);
            processStopCode(decodedText);
        }, (err) => {
            // ignore
        });

        return () => {
            scanner.clear().catch(e => console.error("Scanner cleared:", e));
        };
    }, [showStopScanner]);

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
                    setGpsAccuracy(accuracy);

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
    }, [timerActive, activeTicket]);

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
        if (!timerActive || tickets.length === 0) return;
        try {
            const ticketId = tickets[0].id;
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

            const studentTickets = allTickets.filter(t =>
                t.violation_details?.student_details?.student_id === user.username && t.status !== 'Completed'
            );

            setViolations(studentViolations);
            setTickets(studentTickets);
            setLogs(allLogs);

            // Check for active Backend Timer
            if (studentTickets.length > 0) {
                const ongoingTicket = studentTickets.find(t => t.status === 'Ongoing') || studentTickets[0];
                const activeTicketId = ongoingTicket.id;
                const activeLog = allLogs.find(log =>
                    (log.eticket === activeTicketId || log.eticket?.id === activeTicketId) && !log.time_out
                );

                if (activeLog) {
                    setStartTime(new Date(activeLog.time_in).getTime());
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

        if (tickets.length === 0) {
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
            if (payloadCode.includes("CITC-BUILDING") || payloadCode.includes("CITC-DEPT")) {
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

            const ticketId = tickets[0].id;
            const response = await fetch('/api/timelogs/log_time/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eticket_id: ticketId,
                    action: actionType,
                    lat: forcedLat,
                    lng: forcedLng,
                    radius: forcedRadius
                }),
            });

            if (response.ok) {
                setStartTime(Date.now());
                setTimerActive(true);
                setShowAdminCode(false);
                setAdminCode('');
                fetchStudentData();
            } else {
                alert("Server error. Check if the backend is running.");
            }
        } catch (err) {
            console.error(err);
            if (err.code === 1) alert("PERMISSION DENIED: Please reset location permissions in your browser settings.");
            else if (err.code === 3) alert("GPS TIMEOUT: Move closer to a window for a better signal.");
            else alert("Error: " + (err.message || "Unknown Failure"));
        }
    };

    const processStopCode = async (codeToProcess) => {
        if (tickets.length === 0) {
            alert("No active Service Obligations to process.");
            return;
        }

        if (codeToProcess !== "OSA-PAUSE" && codeToProcess !== "CITC-BUILDING-3M") {
            alert("Invalid code. Please scan the CITC Building QR code to stop the timer.");
            return;
        }

        try {
            const ticketId = tickets[0].id;
            const response = await fetch('/api/timelogs/log_time/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eticket_id: ticketId,
                    action: 'out'
                }),
            });

            if (response.ok) {
                setTimerActive(false);
                setStartTime(null);
                setElapsed(0);
                fetchStudentData();
            }
        } catch (err) {
            alert("Network failure processing action code.");
        }
    };

    const formatRemainingTime = () => {
        if (!activeTicket) return '00:00:00';
        const hours = Math.floor(displayHours);
        const minutes = Math.floor((displayHours - hours) * 60);
        const seconds = Math.floor(((displayHours - hours) * 60 - minutes) * 60);
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const formatObligationTime = (hours) => {
        if (hours <= 0) return '0 hrs';
        if (hours >= 1) return `${Math.round(hours * 10) / 10} hrs`;
        const mins = Math.round(hours * 60);
        return `${mins} min`;
    };

    return (
        <div className="flex bg-slate-50 min-h-screen relative">
            {/* QR Scanner Modals */}
            {isScanning && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden">
                        <button onClick={() => setIsScanning(false)} className="absolute top-4 right-4 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors z-10">
                            <X size={20} />
                        </button>
                        <div className="text-center mb-6">
                            <h3 className="font-black text-xl text-slate-800 tracking-tight">Staff Code Scanner</h3>
                            <p className="text-xs font-medium text-slate-400 mt-2">Scan OSA Staff Action Codes</p>
                        </div>
                        <div id="student-qr-reader" className="w-full rounded-2xl overflow-hidden border-4 border-slate-100"></div>
                    </div>
                </div>
            )}

            {showStopScanner && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden">
                        <button onClick={() => setShowStopScanner(false)} className="absolute top-4 right-4 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors z-10">
                            <X size={20} />
                        </button>
                        <div className="text-center mb-6">
                            <h3 className="font-black text-xl text-red-600 tracking-tight">Stop Timer</h3>
                            <p className="text-xs font-medium text-slate-400 mt-2">Scan QR code to pause your timer</p>
                        </div>
                        <div id="stop-qr-reader" className="w-full rounded-2xl overflow-hidden border-4 border-red-100"></div>
                    </div>
                </div>
            )}

            <Sidebar role="student" />
            <main className="flex-1 p-4 md:p-10 pt-24 md:pt-10 max-w-7xl mx-auto overflow-y-auto">
                <header className="mb-6 md:mb-10 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
                    <div className="w-full">
                        {/* Debug Bar for ID Verification */}
                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight uppercase">Service Hub</h1>
                        <p className="text-slate-500 mt-1 font-medium italic text-sm md:text-base">Welcome back, {user.name || user.username || 'Student'}</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Col: Obligation & Timer */}
                    <div className="lg:col-span-4 space-y-8">
                        {/* Service Obligation Card */}
                        <div className="card-premium bg-slate-900 text-white relative overflow-hidden p-8 border-4 border-yellow-400/20 text-center">
                            <p className="text-[10px] uppercase font-black tracking-[0.4em] text-yellow-400 mb-6 drop-shadow-sm">Service Obligation</p>
                            <div className="text-5xl md:text-6xl font-mono text-yellow-400 font-black tracking-tighter drop-shadow-xl">{formatObligationTime(displayHours)}</div>
                            <div className="text-[10px] font-black tracking-widest text-yellow-400/80 mt-2 uppercase">Remaining Time</div>
                        </div>

                        {/* Timer / Scanner Card */}
                        <div className="card-premium flex flex-col items-center justify-center p-8 border-2 border-white shadow-xl relative overflow-hidden">
                            {timerActive && (
                                <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400 animate-pulse shadow-[0_0_15px_rgba(255,184,28,0.5)]" />
                            )}

                            <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center transition-all duration-500 ${timerActive ? 'bg-green-500 text-white shadow-2xl rotate-[360deg]' : 'bg-slate-50 text-slate-300'}`}>
                                {timerActive ? <Clock size={36} className="animate-spin-slow" /> : <Scan size={36} />}
                            </div>

                            <div className="text-center w-full mt-6">
                                <h4 className="font-black text-slate-900 text-xl tracking-tight uppercase">
                                    {timerActive ? "Service in Progress" : "Staff Code Scanner"}
                                </h4>
                                {timerActive ? (
                                    <div className="w-full flex flex-col items-center mt-4">
                                        <div className="font-mono text-3xl font-black text-green-600 tracking-tighter animate-pulse mb-2">
                                            {formatRemainingTime()}
                                        </div>

                                        {/* Live Map Integration */}
                                        <div className="card-premium w-full p-0 border-2 border-white shadow-xl overflow-hidden relative group h-[300px]">
                                            <div id="geofence-map" className="w-full h-full bg-slate-50 relative z-10" />
                                            {!timerActive && (
                                                <div className="absolute inset-0 bg-slate-100/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-center p-6">
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 mb-4 shadow-xl">
                                                        <MapPin size={24} />
                                                    </div>
                                                    <p className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">Satellite Tracking Inactive</p>
                                                    <p className="text-[10px] text-slate-400 font-bold max-w-[150px]">Scan a Staff QR code to activate live boundary monitoring.</p>
                                                </div>
                                            )}
                                            <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur p-2 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-xl border border-white">
                                                Live GPS Feed
                                            </div>
                                        </div>

                                        {monitoringLocation && (
                                            <div className="flex flex-col items-center gap-2 mb-6 w-full">
                                                {/* 10-Second Warning Alert */}
                                                {warningCountdown !== null && (
                                                    <div className="w-full bg-red-600 text-white p-4 rounded-3xl mb-4 animate-bounce shadow-2xl flex items-center justify-between border-4 border-red-400">
                                                        <div className="flex items-center gap-3">
                                                            <AlertTriangle size={24} className="animate-pulse" />
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-widest leading-none">Warning: Out of Boundary</p>
                                                                <p className="text-xs font-bold mt-1">Return to area immediately!</p>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white text-red-600 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner">
                                                            {warningCountdown}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className={`p-6 rounded-3xl w-full border-2 transition-all ${isOutOfBounds ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200"}`}>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Position Status</p>
                                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isOutOfBounds ? "bg-rose-600 text-white shadow-lg shadow-rose-200" : "bg-emerald-600 text-white shadow-lg shadow-emerald-200"}`}>
                                                            {isOutOfBounds ? "Outside Area" : "Inside Area"}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-center py-4">
                                                        <div className={`text-4xl font-black tracking-tight mb-1 ${
                                                            currentDistance <= (activeTicket?.radius || 5) ? "text-emerald-700" : 
                                                            currentDistance <= 25 ? "text-amber-600" : "text-rose-700"
                                                        }`}>
                                                            {currentDistance <= (activeTicket?.radius || 5) ? "Very Near" : 
                                                             currentDistance <= 25 ? "Near" : "Far"}
                                                        </div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                                            Estimated Distance: {Math.round(currentDistance)}m
                                                        </p>
                                                    </div>

                                                    <div className={`mt-4 pt-4 border-t flex items-center justify-between ${isOutOfBounds ? "border-rose-100" : "border-emerald-100"}`}>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                            <MapPin size={12} /> Precision
                                                        </p>
                                                        <p className={`text-[10px] font-black tracking-tight ${gpsAccuracy > 15 ? "text-amber-600" : "text-emerald-600"}`}>
                                                            {gpsAccuracy < 10 ? "Excellent" : gpsAccuracy < 25 ? "Good" : "Weak"} (±{Math.round(gpsAccuracy)}m)
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <button onClick={() => setShowStopScanner(true)} className="w-full bg-red-50 text-red-600 border-2 border-red-200 font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all uppercase text-[10px] tracking-widest">
                                            <QrCode size={16} /> Scan to Stop
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 mt-4 font-medium max-w-[200px] leading-relaxed mx-auto">
                                        {displayHours > 0 ? "Scan QR from OSA Staff to start your service session. (Location tracking required)" : "No active service requirements at this time."}
                                    </p>
                                )}
                            </div>

                            {!showAdminCode && !timerActive && (
                                <div className="w-full grid grid-cols-2 gap-4 mt-8">
                                    <button onClick={() => setIsScanning(true)} className="bg-ustp-blue text-white font-black py-4 rounded-xl shadow-lg uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                                        <QrCode size={16} /> Scan QR
                                    </button>
                                    <button onClick={() => setShowAdminCode(true)} className="bg-slate-900 text-white font-black py-4 rounded-xl shadow-lg uppercase tracking-widest text-[10px] flex flex-col items-center justify-center">
                                        <Key size={14} className="mb-0.5" /> Manual
                                    </button>
                                </div>
                            )}

                            {showAdminCode && (
                                <div className="w-full space-y-4 mt-6">
                                    <input type="password" placeholder="••••••••" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-center outline-none focus:border-ustp-blue tracking-widest" value={adminCode} onChange={(e) => setAdminCode(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && processCode()} />
                                    <div className="flex gap-2">
                                        <button onClick={() => processCode()} className="flex-1 bg-ustp-blue text-white font-black py-4 rounded-xl text-[10px] uppercase">Submit</button>
                                        <button onClick={() => { setShowAdminCode(false); setAdminCode(''); }} className="flex-1 bg-slate-100 text-slate-400 font-black py-4 rounded-xl text-[10px] uppercase">Cancel</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Col: Violations */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="card-premium border-2 border-white shadow-xl p-8">
                            <h4 className="font-black text-slate-900 text-xl flex items-center gap-4 mb-10 pb-6 border-b border-slate-50 uppercase tracking-tight">
                                <AlertTriangle className="text-red-500" size={24} />
                                Violation Records
                            </h4>

                            {loading ? (
                                <div className="py-20 text-center animate-pulse text-slate-300 font-black uppercase tracking-widest text-xs">Syncing Cloud Database...</div>
                            ) : (() => {
                                const activeViolations = violations;

                                if (activeViolations.length === 0) {
                                    return (
                                        <div className="bg-slate-50/50 rounded-[40px] p-20 border-4 border-dotted border-slate-100 text-center">
                                            <Shield className="mx-auto text-slate-200 mb-6" size={48} />
                                            <h5 className="font-black text-slate-900 text-xl tracking-tighter">GOOD STANDING</h5>
                                            <p className="text-slate-400 text-sm mt-3 font-medium max-w-xs mx-auto leading-relaxed">No active violations detected. Thank you for following university policies.</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-4">
                                        {activeViolations.map((v) => {
                                            const ticket = tickets.find(t => t.violation_details?.id === v.id || t.violation === v.id);
                                            const isOngoing = ticket?.status === 'Ongoing';
                                            const isCompleted = ticket?.status === 'Completed' || v.status === 'Completed';

                                            let displayStatus = v.status;
                                            if (ticket) {
                                                displayStatus = ticket.status;
                                            }
                                            if (displayStatus === 'Approved') displayStatus = 'Active';
                                            if (isCompleted || displayStatus === 'Completed') displayStatus = 'Finished';

                                            return (
                                                <div key={v.id} className={`p-6 border rounded-[32px] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all ${isOngoing ? 'bg-green-50 border-green-200' : isCompleted ? 'bg-emerald-50 border-emerald-200 opacity-60' : 'bg-white border-slate-100 shadow-sm'}`}>
                                                    <div className="flex gap-6 items-center w-full">
                                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${isOngoing ? 'bg-green-500 text-white shadow-lg shadow-green-200' : isCompleted ? 'bg-emerald-500 text-white' : 'bg-red-50 text-red-600'}`}>
                                                            {isOngoing ? <Clock size={28} className="animate-spin-slow" /> : isCompleted ? <CheckCircle size={28} /> : <AlertTriangle size={28} />}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h6 className="font-black text-slate-900 text-lg uppercase truncate tracking-tight">{v.violation_type}</h6>
                                                            <div className="flex items-center gap-3 mt-1 pr-4">
                                                                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${isOngoing ? 'bg-green-200 text-green-800' : isCompleted ? 'bg-emerald-200 text-emerald-800' : 'bg-orange-100 text-orange-600'}`}>
                                                                    {displayStatus}
                                                                </span>
                                                                <span className="text-[10px] text-slate-300 font-bold">{new Date(v.created_at).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 hidden md:flex ${isOngoing ? 'bg-green-500 text-white shadow-lg shadow-green-200' : isCompleted ? 'bg-emerald-50 text-emerald-200' : 'bg-slate-50 text-slate-200'}`}>
                                                            {isOngoing ? <Clock size={20} className="animate-pulse" /> : isCompleted ? <CheckCircle size={20} /> : <Play size={20} />}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StudentDashboard;
