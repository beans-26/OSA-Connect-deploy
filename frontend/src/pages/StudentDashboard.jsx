import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Play, QrCode, Clock, Info, ChevronRight, CheckCircle2 } from 'lucide-react';
import saluteFace from '../assets/salute.png';
import { ticketStatusLabel, deadlineNotice } from '../lib/ticketStatus';
import usePolling from '../lib/usePolling';
import QrScannerModal from '../components/QrScannerModal';
import SessionReceipt from '../components/SessionReceipt';
import TicketDetails from '../components/TicketDetails';
import { useStudentShell } from '../components/StudentShell';
import MapGate from '../components/MapGate';
import { IDLE_REFRESH_MS, SAVER_REFRESH_MS } from '../lib/studentNotifications';
import { timeGreeting, todayLabel, studentStatusLine } from '../lib/greeting';
import { outsideSiteMessage, GEO_MESSAGES } from '../lib/geo';

// Service site QR codes hold only the site code, e.g. "LIB-01" (same rule as backend/core/site_views.py).
// They are the only codes that start or end the timer (the old OSA action and building codes were retired).
const SITE_CODE_PATTERN = /^[A-Z0-9]{2,10}-[A-Z0-9]{1,6}$/;

// Leaflet geofence map framed like the mobile map card (site, radius, and your position).
// approach: before a session. The circle is shown faded (not active yet) with a dashed line from
// the student to the site; once the timer starts it turns green/red with the geofence.
const GeofenceMap = ({ hub, location, isOutOfBounds, isDarkMode, approach = false }) => {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const layersRef = useRef({});
    const fittedRef = useRef(false);

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
        fittedRef.current = false;
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
        const layers = layersRef.current;
        const color = approach ? '#64748b' : isOutOfBounds ? '#ef4444' : '#10b981';
        layers.circle?.setRadius(hub.radius).setStyle(approach
            ? { color, fillColor: color, fillOpacity: 0.06, dashArray: '6 6', weight: 2 }
            : { color, fillColor: color, fillOpacity: 0.15, dashArray: null, weight: 3 });
        if (!location) return;
        const youColor = approach ? '#0ea5e9' : color;
        const icon = L.divIcon({
            className: '',
            html: `<div style="width:16px;height:16px;border-radius:8px;background:${youColor};border:2px solid #fff;box-shadow:0 1.5px 2px rgba(0,0,0,.15)"></div>`,
            iconSize: [16, 16]
        });
        if (layers.you) {
            layers.you.setLatLng([location.lat, location.lng]).setIcon(icon);
        } else {
            layers.you = L.marker([location.lat, location.lng], { icon }).addTo(map);
        }
        if (approach) {
            const path = [[location.lat, location.lng], [hub.lat, hub.lng]];
            if (layers.route) layers.route.setLatLngs(path);
            else layers.route = L.polyline(path, { color: '#0ea5e9', weight: 3, dashArray: '2 8', lineCap: 'round' }).addTo(map);
            // Frame both points once; after that let the student pan freely
            if (!fittedRef.current) {
                // Extra bottom padding keeps both points clear of the legend in the corner
                map.fitBounds(L.latLngBounds(path), { maxZoom: 18, paddingTopLeft: [30, 45], paddingBottomRight: [30, 95] });
                fittedRef.current = true;
            }
        } else if (layers.route) {
            layers.route.remove();
            layers.route = null;
        }
    }, [location, isOutOfBounds, hub?.radius, approach]);

    return (
        // isolate: Leaflet's panes use z-index 400+, which otherwise drew the map over the QR scanner (z-70)
        <div className={`relative isolate mt-3 w-full overflow-hidden rounded-[14px] border border-[var(--s-border)] ${approach ? 'h-[280px]' : 'h-[200px]'}`}>
            <div ref={containerRef} className={`h-full w-full ${isDarkMode ? 'brightness-[.8] contrast-[1.1]' : ''}`} />
            <div className="absolute right-3 top-3 z-[500] rounded-full bg-[var(--s-card)] px-3 py-1.5 text-[9px] font-black tracking-[1px] text-[var(--s-text)] shadow">
                {approach ? 'ROUTE TO SITE' : 'LIVE GPS FEED'}
            </div>
            <div className="absolute bottom-2 left-2 z-[500] rounded-lg bg-[var(--s-card)] px-2 py-1.5 shadow">
                <div className="mb-1 flex items-center">
                    <span className="mr-1.5 h-2 w-2 rounded-full bg-[#1e3a8a]" />
                    <span className="text-[10px] font-bold text-[var(--s-text)]">Service site</span>
                </div>
                {location && (
                    <div className="mb-1 flex items-center">
                        <span className={`mr-1.5 h-2 w-2 rounded-full ${approach ? 'bg-[#0ea5e9]' : isOutOfBounds ? 'bg-[#ef4444]' : 'bg-[#10b981]'}`} />
                        <span className="text-[10px] font-bold text-[var(--s-text)]">You</span>
                    </div>
                )}
                <p className="mt-0.5 text-[10px] font-semibold text-[var(--s-muted)]">
                    Radius: {Math.round(hub.radius)}m{approach ? ' · starts when you scan' : ''}
                </p>
            </div>
        </div>
    );
};

const COMPLETED_SEEN_KEY = 'osa-completed-notice-seen';

// A session stop the page couldn't send (no internet): { username, eticketId, endReason, endedAt, lat, lng,
// distance }. Sent as soon as the connection is back, with the time it really ended (e.g. when the student
// left the area), so time away while offline isn't counted. Until then the timer isn't restarted.
const PENDING_STOP_KEY = 'osa-pending-stop';
const readPendingStop = () => {
    try { return JSON.parse(localStorage.getItem(PENDING_STOP_KEY) || 'null'); } catch { return null; }
};
const savePendingStop = (stop) => {
    try { localStorage.setItem(PENDING_STOP_KEY, JSON.stringify(stop)); } catch { /* private mode: nothing to keep */ }
};
const clearPendingStop = () => {
    try { localStorage.removeItem(PENDING_STOP_KEY); } catch { /* ignore */ }
};
const clockTime = (ms) => new Date(ms).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });

// "Community service remaining" on Home before timing in: the countdown (hh:mm:ss), the hours required
// and the site, and how much is done. Same as mobile/app/student/dashboard.jsx.
const hms = (hours) => {
    const total = Math.max(0, Math.round((hours || 0) * 3600));
    return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60].map((n) => String(n).padStart(2, '0')).join(':');
};
const hm = (hours) => {
    const mins = Math.max(0, Math.round((hours || 0) * 60));
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};
// The 3-day deadline behind the (i) under "Not timed in": shows on hover, and on tap / click (phones)
const DeadlineInfo = ({ ticket }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        if (!open) return undefined;
        const away = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
        document.addEventListener('pointerdown', away);
        return () => document.removeEventListener('pointerdown', away);
    }, [open]);
    const notice = deadlineNotice(ticket);
    if (!notice) return null;
    return (
        <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-label={notice.title}
                className={`flex h-7 w-7 items-center justify-center rounded-full ${notice.overdue ? 'text-[#dc2626]' : 'text-[var(--s-muted)] hover:text-[var(--s-text)]'}`}
            >
                <Info size={17} />
            </button>
            {open && (
                <div role="tooltip" className={`absolute right-0 top-8 z-20 w-64 rounded-xl border p-3 text-left shadow-lg ${notice.overdue ? 'border-[#fca5a5] bg-[#fee2e2]' : 'border-[#fde68a] bg-[#fffbeb]'}`}>
                    <p className={`text-sm font-black ${notice.overdue ? 'text-[#b91c1c]' : 'text-[#92400e]'}`}>{notice.title}</p>
                    <p className={`mt-0.5 text-xs font-semibold leading-5 ${notice.overdue ? 'text-[#991b1b]' : 'text-[#92400e]'}`}>{notice.message}</p>
                </div>
            )}
        </div>
    );
};
const ServiceRemaining = ({ ticket, remainingHours }) => {
    const required = ticket.total_hours_required || 0;
    const done = Math.max(0, required - remainingHours);
    const pct = required ? Math.min(100, Math.round((done / required) * 100)) : 0;
    const site = ticket.assigned_site?.name || ticket.assigned_location;
    return (
        <div className="mb-4 w-full text-left">
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-[var(--s-muted)]">Community service remaining</p>
                <span className="shrink-0 rounded-full bg-[var(--s-bg)] px-2.5 py-1 text-[11px] font-bold text-[var(--s-muted)]">Not timed in</span>
            </div>
            {/* The (i) sits beside the countdown, under the pill, so it adds no height */}
            <div className="mt-1 flex items-start justify-between gap-2">
                <p className="text-[44px] font-black leading-tight tabular-nums tracking-tight text-[var(--s-text)]">{hms(remainingHours)}</p>
                <DeadlineInfo ticket={ticket} />
            </div>
            <p className="text-[13px] font-medium text-[var(--s-muted)]">of {Math.round(required * 100) / 100} hrs required{site ? ` · ${site}` : ''}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--s-bg)]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Hours done">
                <div className="h-full rounded-full bg-[var(--s-accent)]" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-xs font-semibold text-[var(--s-muted)]">
                <span>{hm(done)} done</span>
                <span>{pct}%</span>
            </div>
        </div>
    );
};

const DashboardBody = () => {
    // Theme, and the side menu's copy of the records (its badge and "hours remaining" stay current)
    const { isDarkMode, setRecords, dataSaver } = useStudentShell();
    const [violations, setViolations] = useState([]);
    const [tickets, setTickets] = useState([]);

    const [loading, setLoading] = useState(true);
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
    // Time-out receipt shown after a session ends (scanned out or stopped automatically)
    const [receipt, setReceipt] = useState(null);
    // E-ticket opened from the list (its details and service log)
    const [openTicket, setOpenTicket] = useState(null);
    // Tickets whose "hours completed, go to OSA" notice this device already showed (the popup below)
    const [seenCompleted, setSeenCompleted] = useState(() => {
        try { return JSON.parse(localStorage.getItem(COMPLETED_SEEN_KEY) || '[]'); } catch { return []; }
    });
    const watchIdRef = React.useRef(null);

    // Sends a stop saved while offline (PENDING_STOP_KEY). Returns true while it still couldn't be sent.
    const flushingStopRef = useRef(false);
    const flushPendingStop = async () => {
        const pending = readPendingStop();
        if (!pending) return false;
        if (pending.username !== user.username) { clearPendingStop(); return false; }
        if (flushingStopRef.current) return true;
        flushingStopRef.current = true;
        try {
            const response = await fetch('/api/timelogs/log_time/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eticket_id: pending.eticketId, action: 'out', end_reason: pending.endReason,
                    // How long ago it ended, not the time: the server counts back from its own clock, so a
                    // phone clock that's off doesn't matter
                    ended_seconds_ago: Math.max(0, Math.round((Date.now() - pending.endedAt) / 1000)),
                    lat: pending.lat, lng: pending.lng, distance_m: pending.distance,
                }),
            });
            if (response.status >= 500) return true; // server trouble: try again later
            const data = await response.json().catch(() => ({}));
            clearPendingStop();
            if (data.receipt) setReceipt(data.receipt);
            return false;
        } catch {
            return true; // still offline
        } finally {
            flushingStopRef.current = false;
        }
    };

    // Starts or stops the timer right after a valid scan (no photo step)
    const submitAction = async (pendingActionData) => {
        // The last session's stop must reach the server first, or scanning in would continue that session
        if (await flushPendingStop()) {
            alert("You're offline. Your last session's time-out hasn't been sent yet. Connect to the internet and try again.");
            return;
        }
        try {
            const response = await fetch('/api/timelogs/log_time/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eticket_id: pendingActionData.ticketId,
                    action: pendingActionData.actionType,
                    // The service site's code: the server looks up its location and radius
                    site_code: pendingActionData.siteCode || null,
                    // Where the student is; the server only starts the timer inside the site's radius
                    student_lat: pendingActionData.studentLat ?? null,
                    student_lng: pendingActionData.studentLng ?? null,
                    accuracy_m: pendingActionData.accuracy ?? null
                }),
            });

            if (response.ok) {
                if (pendingActionData.actionType === 'in') {
                    setStartTime(Date.now());
                    setElapsed(0);
                    setTimerActive(true);
                } else {
                    setTimerActive(false);
                    setStartTime(null);
                    setElapsed(0);
                    const data = await response.json().catch(() => ({}));
                    if (data.receipt) setReceipt(data.receipt);
                    else alert("TIMER STOPPED");
                }
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
        }
    };


    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const activeTicket = tickets.find(t => t.status === 'Ongoing') || tickets.find(t => t.status === 'Active');
    // Stored hours (before the open session); the live elapsed time is subtracted below
    const displayHours = activeTicket ? (activeTicket.base_remaining_hours ?? activeTicket.remaining_hours) : 0;
    // Same as the mobile app: a session can't be ended in its first 20 seconds.
    // Re-rendered every second by the countdown's elapsed tick.
    const END_COOLDOWN_S = 20;
    const endCooldown = timerActive && startTime
        ? Math.max(0, END_COOLDOWN_S - Math.floor((Date.now() - startTime) / 1000))
        : 0;

    // Every 5 s while the tab is visible (the session state from the other device, the timer's base)
    // Every 5 s while a session runs (the server may stop it); otherwise every 30 s, or every 3 min with
    // data saver on (coming back to the tab always refreshes right away)
    usePolling(() => fetchStudentData(), timerActive ? 5000 : (dataSaver ? SAVER_REFRESH_MS : IDLE_REFRESH_MS), [user.username]);

    // Back online: record a stop saved while offline right away (fetchStudentData sends it first)
    useEffect(() => {
        const onOnline = () => fetchStudentData();
        window.addEventListener('online', onOnline);
        return () => window.removeEventListener('online', onOnline);
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
                    autoStopTimer("Service obligation completed! The system has automatically recorded your completion.", 'completed');
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timerActive, startTime, displayHours]);

    // Before a session: show where the student is relative to their site (no geofence yet)
    const approachWatchRef = useRef(null);
    // Latest GPS fix from either watcher: reused when scanning to start (no wait for a new fix),
    // and read by the auto-stop and event logging without re-running effects
    const lastFixRef = useRef({ lat: null, lng: null, accuracy: null, at: 0, distance: null });
    useEffect(() => {
        const hasSite = activeTicket?.lat != null && activeTicket?.lng != null;
        if (timerActive || !hasSite || !navigator.geolocation) return;
        approachWatchRef.current = navigator.geolocation.watchPosition(
            ({ coords }) => {
                setLocation({ lat: coords.latitude, lng: coords.longitude });
                lastFixRef.current = { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy, at: Date.now(), distance: null };
            },
            () => {}, // Permission is asked again (with an explanation) when they scan
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        );
        return () => {
            navigator.geolocation.clearWatch(approachWatchRef.current);
            approachWatchRef.current = null;
        };
    }, [timerActive, activeTicket?.id, activeTicket?.lat, activeTicket?.lng]);

    // Sends the student's position to the server (every 15 s while the page is open, and right away on
    // return). The server ends the session after 30 s outside the site or when location is off; then
    // the receipt shows here. Browsers pause the page in the background, so nothing is sent then.
    const lastPingRef = useRef(0);
    const sendLocationPing = async (body, force = false) => {
        if (!activeTicket || (!force && Date.now() - lastPingRef.current < 14000)) return;
        lastPingRef.current = Date.now();
        try {
            const response = await fetch('/api/timelogs/location_ping/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eticket_id: activeTicket.id, ...body }),
            });
            const data = await response.json().catch(() => ({}));
            if (data.state === 'stopped' || data.state === 'none') {
                setTimerActive(false);
                setStartTime(null);
                setElapsed(0);
                setWarningCountdown(null);
                if (data.state === 'stopped' && data.receipt) setReceipt(data.receipt);
                fetchStudentData();
            }
        } catch {
            // Offline: the next ping tries again
        }
    };

    // Back on the page during a session: check the location right away
    useEffect(() => {
        if (!timerActive) return;
        const onVisible = () => {
            if (document.visibilityState !== 'visible' || !navigator.geolocation) return;
            navigator.geolocation.getCurrentPosition(
                ({ coords }) => sendLocationPing({ lat: coords.latitude, lng: coords.longitude, accuracy_m: coords.accuracy }, true),
                (err) => {
                    // Location turned off while away: only the time up to the last confirmed location counts
                    if (err.code === 1 || err.code === 2) sendLocationPing({ location_off: true }, true);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [timerActive, activeTicket?.id]);

    const logSessionEvent = (type, extra = {}) => {
        if (!activeTicket) return;
        const { lat, lng, distance } = lastFixRef.current;
        fetch('/api/timelogs/log_event/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eticket_id: activeTicket.id, type, lat, lng, distance_m: distance, ...extra }),
        }).catch(() => {});
    };

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
                    lastFixRef.current = { lat: latitude, lng: longitude, accuracy, at: Date.now(), distance: Math.round(dist) };
                    sendLocationPing({ lat: latitude, lng: longitude, accuracy_m: accuracy });

                    // Site radius plus a GPS accuracy buffer. Only sets the flag: the countdown effect
                    // below does the counting, so repeated GPS fixes can't restart it.
                    const accuracyBuffer = accuracy * 0.7;
                    const effectiveRadius = (activeTicket.radius || 15) + accuracyBuffer;
                    setIsOutOfBounds(dist > effectiveRadius);
                },
                (err) => {
                    console.error("Location tracking error:", err);
                    // Automatically stop timer if location is disabled or permission is revoked
                    if (err.code === 1 || err.code === 2) {
                        logSessionEvent('location_off');
                        autoStopTimer("Security Alert: Location services must remain ON. Your session has been stopped.", 'location_off');
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

    // Out of bounds: count down from OUT_OF_BOUNDS_S, stop the session at 0, reset when back inside.
    // Also records leaving and coming back for the time-out receipt.
    const OUT_OF_BOUNDS_S = 30;
    const wasOutRef = useRef(false);
    const leftAtRef = useRef(null); // when the student last left the area (for a stop saved offline)
    useEffect(() => {
        if (!timerActive) {
            wasOutRef.current = false;
            setWarningCountdown(null);
            return;
        }
        if (!isOutOfBounds) {
            if (wasOutRef.current) logSessionEvent('returned');
            wasOutRef.current = false;
            setWarningCountdown(null);
            return;
        }
        wasOutRef.current = true;
        logSessionEvent('left_area');
        const leftAt = Date.now();
        leftAtRef.current = leftAt;
        setWarningCountdown(OUT_OF_BOUNDS_S);
        const timer = setInterval(() => {
            setWarningCountdown(Math.max(0, OUT_OF_BOUNDS_S - Math.floor((Date.now() - leftAt) / 1000)));
        }, 250);
        return () => clearInterval(timer);
    }, [isOutOfBounds, timerActive]);

    useEffect(() => {
        if (warningCountdown === 0) {
            autoStopTimer(`Geofencing restriction: You were out of bounds for more than ${OUT_OF_BOUNDS_S} seconds.`, 'left_area');
        }
    }, [warningCountdown]);

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

    // Ends the session for the student (left the area, location off, hours done) and shows the receipt.
    // The ref stops the countdown, GPS errors and the completion check from sending it twice.
    const autoStoppingRef = useRef(false);
    const autoStopTimer = async (reason, endReason) => {
        if (!timerActive || !activeTicket || autoStoppingRef.current) return;
        autoStoppingRef.current = true;
        try {
            const { lat, lng, distance } = lastFixRef.current;
            const response = await fetch('/api/timelogs/log_time/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eticket_id: activeTicket.id, action: 'out', end_reason: endReason, lat, lng, distance_m: distance }),
            });
            const data = await response.json().catch(() => ({}));
            setTimerActive(false);
            setStartTime(null);
            setElapsed(0);
            setWarningCountdown(null);
            fetchStudentData();
            if (data.receipt) setReceipt(data.receipt);
            else alert(reason);
        } catch (e) {
            // No internet: the server still thinks the session is running. Save the stop with the moment it
            // really ended (when the student left the area, lost location, or finished) and send it once
            // the connection is back, so the time in between isn't counted.
            const endedAt = endReason === 'left_area' && leftAtRef.current ? leftAtRef.current
                : endReason === 'location_off' && lastFixRef.current.at ? lastFixRef.current.at
                    : Date.now();
            const { lat, lng, distance } = lastFixRef.current;
            savePendingStop({ username: user.username, eticketId: activeTicket.id, endReason, endedAt, lat, lng, distance });
            setTimerActive(false);
            setStartTime(null);
            setElapsed(0);
            setWarningCountdown(null);
            alert(`${reason}\n\nYou're offline, so your session was stopped at ${clockTime(endedAt)}. It will be recorded as soon as you're connected again; the time after that isn't counted.`);
        } finally {
            autoStoppingRef.current = false;
        }
    };

    const fetchStudentData = async () => {
        if (!user.username) return;
        // A stop saved while offline goes first, so the server's open session isn't shown as running again
        await flushPendingStop();
        try {
            // Both at once (they used to load one after the other, followed by every student's
            // time logs and photos, which this page never used and which took the longest)
            const [allViolations, allTickets] = await Promise.all([
                // Only this student's records (the API used to send everyone's on every 5 s poll)
                fetch(`/api/violations/?student_id=${encodeURIComponent(user.username)}`).then((r) => r.json()),
                fetch(`/api/etickets/?student_id=${encodeURIComponent(user.username)}&t=${Date.now()}`).then((r) => r.json()).catch(() => []),
            ]);

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
            setRecords({ violations: studentViolations, tickets: studentTickets });

            // Check for active Backend Timer
            if (openTickets.length > 0) {
                const ongoingTicket = openTickets.find(t => t.status === 'Ongoing') || openTickets[0];

                // Still offline-stopped (the saved stop hasn't reached the server): keep the timer stopped
                if (ongoingTicket.active_time_in && readPendingStop()?.eticketId !== ongoingTicket.id) {
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

    // Time in: only a registered service site's QR (Admin > Settings > Service Sites), e.g. "LIB-01"
    const processCode = async (codeToProcess) => {
        const siteCode = (codeToProcess || "").trim().toUpperCase();

        if (!activeTicket) {
            alert("No active Service Obligations. Please wait for the Admin to assign your fresh violation.");
            return;
        }
        if (!SITE_CODE_PATTERN.test(siteCode)) {
            alert("Invalid QR code. Scan the QR code posted at your service site.");
            return;
        }
        try {
            // Time-in needs the student's position: the server checks they're inside the site's radius
            if (!navigator.geolocation) {
                alert("SECURITY BLOCK: Geocation is not supported by this browser.");
                return;
            }

            let position = null;
            try {
                // A fix from the last 10 s is used as is; only otherwise wait for GPS
                const fix = lastFixRef.current;
                position = fix.at && Date.now() - fix.at < 10000
                    ? { coords: { latitude: fix.lat, longitude: fix.lng, accuracy: fix.accuracy } }
                    : await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                            enableHighAccuracy: true,
                            timeout: 8000,
                            maximumAge: 10000
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

            // Outside the site: say so right away (the server checks this too)
            const assigned = activeTicket.assigned_site;
            const site = assigned?.site_code === siteCode && activeTicket.lat != null
                ? { latitude: activeTicket.lat, longitude: activeTicket.lng, radius: activeTicket.radius || 50 }
                : null;
            const outside = site && outsideSiteMessage(position.coords, site, assigned?.name);
            if (outside) {
                alert(outside);
                return;
            }

            await submitAction({
                ticketId: activeTicket.id,
                actionType: 'in',
                siteCode,
                studentLat: position.coords.latitude,
                studentLng: position.coords.longitude,
                accuracy: position.coords.accuracy
            });
        } catch (err) {
            console.error(err);
            if (err.code === 1) alert(GEO_MESSAGES.permission);
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

        // The service site's QR ends the session (the server checks it's the site where it started)
        if (!SITE_CODE_PATTERN.test(payloadCode)) {
            alert(`INVALID CODE: ${payloadCode}. Scan your service site's QR code.`);
            return;
        }

        try {
            await submitAction({
                ticketId: activeTicket.id,
                actionType: 'out',
                siteCode: payloadCode
            });
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

    // Hours served but not cleared yet: the student brings the signed ISO form and reflection paper to OSA
    const clearanceTicket = tickets.find((t) => t.status === 'Completed');
    // Hours served: the student still has to bring the signed ISO form to OSA to be cleared.
    // Shown after the time-out receipt, once per ticket.
    const completedTicket = !receipt && tickets.find((t) => t.status === 'Completed' && !seenCompleted.includes(t.id));
    const dismissCompleted = () => {
        const next = [...seenCompleted, completedTicket.id];
        setSeenCompleted(next);
        try { localStorage.setItem(COMPLETED_SEEN_KEY, JSON.stringify(next)); } catch { /* shown again next time */ }
    };

    const ticketBadge = (status) =>
        status === 'Active' ? 'bg-[#dcfce7] text-[#10b981]' :
        status === 'Completed' ? 'bg-[#fef3c7] text-[#b45309]' :
        status === 'Cleared' ? 'bg-[#f1f5f9] text-[#64748b]' :
        'bg-[#faf5ff] text-[#7c3aed]';

    return (
        <>
            {/* QR Scanner (start) */}
            {isScanning && (
                <QrScannerModal
                    title="Scan the Hub QR Code"
                    subtitle="Scan the QR code posted at your service site"
                    onClose={() => setIsScanning(false)}
                    onResult={(text) => { setIsScanning(false); processCode(text); }}
                />
            )}

            <SessionReceipt receipt={receipt} onClose={() => setReceipt(null)} />

            {completedTicket && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="completed-title">
                    <div className="w-full max-w-sm rounded-3xl bg-[var(--s-card)] p-6 text-center shadow-2xl">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#dcfce7]">
                            <CheckCircle2 size={30} className="text-[#10b981]" />
                        </div>
                        <h2 id="completed-title" className="text-lg font-black text-[var(--s-text)]">Service hours completed!</h2>
                        <p className="mt-2 text-sm font-medium leading-5 text-[var(--s-muted)]">
                            You've finished the community service for <span className="font-bold text-[var(--s-text)]">{completedTicket.violation_details?.violation_type || 'your violation'}</span>.
                            Please proceed to the <span className="font-bold text-[var(--s-text)]">OSA office</span> with your signed ISO form and reflection paper to verify and properly clear your violation.
                        </p>
                        <button onClick={dismissCompleted} className="mt-5 w-full rounded-[14px] bg-[var(--s-primary)] p-3.5 text-sm font-bold text-white">
                            OK, I'll go to the OSA office
                        </button>
                    </div>
                </div>
            )}
            <TicketDetails ticket={openTicket} onClose={() => setOpenTicket(null)} />

            {/* QR Scanner (end) */}
            {showStopScanner && (
                <QrScannerModal
                    title="Scan to End Service"
                    subtitle="Scan your service site's QR code"
                    accent="#ef4444"
                    onClose={() => setShowStopScanner(false)}
                    onResult={(text) => { setShowStopScanner(false); processStopCode(text); }}
                />
            )}

            <main className="mx-auto w-full max-w-xl px-4 pb-10 pt-4">
                {/* Header */}
                <header className="mb-4 flex items-center justify-between">
                    <div className="flex-1">
                        <p className="mb-1 text-xs font-bold uppercase tracking-[1.5px] text-[var(--s-muted)]">{todayLabel()}</p>
                        <h2 className="text-2xl font-black tracking-[0.3px] text-[var(--s-text)]">{timeGreeting()}, {displayName}</h2>
                        {(timerActive || activeTicket) && (
                            <p className="mt-1 text-sm font-semibold text-[var(--s-muted)]">{studentStatusLine({ sessionActive: timerActive, openTicket: activeTicket })}</p>
                        )}
                    </div>
                </header>

                {/* Hours done, not cleared yet: what to bring to OSA (stays until OSA approves) */}
                {clearanceTicket && (
                    <div className="mb-4 flex gap-3 rounded-[16px] border border-[#a7f3d0] bg-[#ecfdf5] p-4">
                        <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#059669]" />
                        <div>
                            <p className="text-sm font-black text-[#065f46]">Go to the OSA office to be cleared</p>
                            <p className="mt-0.5 text-xs font-semibold leading-5 text-[#047857]">
                                Your hours for {clearanceTicket.violation_details?.violation_type || 'your violation'} are complete. Bring your signed ISO form and your reflection paper to the OSA office. Your violation is cleared once OSA approves them.
                            </p>
                        </div>
                    </div>
                )}

                {/* Service card while there's community service to do; otherwise just a hello */}
                {timerActive || activeTicket ? (
                    <section className={`mb-4 rounded-[24px] bg-[var(--s-card)] p-4 sm:p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] border border-[var(--s-border)] ${isOutOfBounds ? 'border-[1.5px] border-[#ef4444]' : ''}`}>
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

                                {/* Unmounted while a scanner is open: iPhone Safari drew the map over the camera */}
                                {hub && !isScanning && !showStopScanner && (
                                    <MapGate><GeofenceMap hub={hub} location={location} isOutOfBounds={isOutOfBounds} isDarkMode={isDarkMode} /></MapGate>
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

                                {endCooldown > 0 && (
                                    <div className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-[#fde68a] bg-[#fffbeb] p-2.5 text-xs font-bold text-[#b45309]">
                                        <Clock size={13} className="text-[#f59e0b]" />
                                        Please wait {endCooldown}s before ending session
                                    </div>
                                )}
                                <button
                                    onClick={() => setShowStopScanner(true)}
                                    disabled={endCooldown > 0}
                                    className="mt-4 w-full rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 p-4 text-sm font-bold uppercase tracking-[1px] text-white disabled:opacity-50 shadow-lg shadow-rose-500/20 active:scale-[0.98] transition-all cursor-pointer"
                                >
                                    {endCooldown > 0 ? `Scan to End Service (${endCooldown}s)` : 'Scan to End Service'}
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col items-center text-center">
                                {activeTicket ? (
                                    <>
                                        {/* 1. What's left to serve */}
                                        <ServiceRemaining ticket={activeTicket} remainingHours={displayHours} />

                                        {/* 2. The map to the site */}
                                        {hub && (
                                            <div className="mb-3 w-full text-left">
                                                {!isScanning && !showStopScanner && (
                                                    <MapGate><GeofenceMap hub={hub} location={location} isOutOfBounds={false} isDarkMode={isDarkMode} approach /></MapGate>
                                                )}
                                            </div>
                                        )}

                                        {/* 3. Where to go */}
                                        <p className="mb-3 max-w-md text-xs sm:text-sm font-medium leading-relaxed text-[var(--s-muted)]">
                                            Go to <span className="font-bold text-[var(--s-text)]">{activeTicket.assigned_site?.name || activeTicket.assigned_location || 'your service site'}</span> and scan the QR code to start your timer.
                                        </p>
                                    </>
                                ) : null}

                                {/* 4. Time in */}
                                <button 
                                    onClick={() => setIsScanning(true)} 
                                    className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#1d4ed8] to-[#4338ca] hover:from-[#1e40af] hover:to-[#3730a3] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all tracking-wide cursor-pointer"
                                >
                                    <QrCode size={18} strokeWidth={2.2} />
                                    <span>Scan QR Code to Time-In</span>
                                </button>
                            </div>
                        )}
                    </section>
                ) : !loading && (
                    <section className="mb-4 flex items-center gap-3 rounded-[24px] border border-[var(--s-border)] bg-[var(--s-card)] p-4 sm:p-5">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dcfce7] text-[#059669] dark:bg-emerald-500/15 dark:text-emerald-300">
                            <CheckCircle2 size={22} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-base font-black text-[var(--s-text)]">Hello, {displayName}!</p>
                            <p className="mt-0.5 text-sm font-medium text-[var(--s-muted)]">You currently don&apos;t have any community service to render.</p>
                        </div>
                    </section>
                )}

                {/* E-Tickets */}
                <section className="mb-4">
                    <h2 className="mb-0.5 text-lg font-black text-[var(--s-text)]">E-Tickets</h2>
                    <p className="mb-3 text-sm font-medium text-[var(--s-muted)]">Tap a ticket to see its service log and forms</p>
                    {loading ? (
                        <div className="mt-4 flex justify-center">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--s-primary)] border-t-transparent" />
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-6 text-[var(--s-border)]">
                            {/* 🫡 in black and white (Noto emoji art as an image, so every device shows it) */}
                            <img src={saluteFace} alt="" className="h-11 w-11 select-none" draggable="false" />
                            <p className="text-[13px] italic text-[var(--s-muted)]">No e-tickets. You have no community service to serve.</p>
                        </div>
                    ) : (
                        tickets.map((ticket, idx) => (
                            <button
                                key={ticket.id || idx}
                                onClick={() => setOpenTicket(ticket)}
                                className="mb-2 flex w-full items-center rounded-xl border border-[var(--s-border)] bg-[var(--s-card)] p-3.5 text-left shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:border-[var(--s-primary)]"
                            >
                                <span className={`mr-3 h-2 w-2 shrink-0 rounded-full ${ticket.status === 'Active' ? 'bg-[#ff6b35]' : 'bg-[var(--s-success)]'}`} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13px] font-bold text-[var(--s-text)]">Ticket #{ticket.id}</p>
                                    <p className="mt-0.5 text-[11px] text-[var(--s-muted)]">{ticket.violation_details?.violation_type || 'Violation'}</p>
                                    <p className="mt-0.5 text-[10px] text-[var(--s-muted)]">Required: {ticket.total_hours_required || 0} hrs</p>
                                </div>
                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${ticketBadge(ticket.status)}`}>
                                    {ticketStatusLabel(ticket)}
                                </span>
                                <ChevronRight size={16} className="ml-2 shrink-0 text-[var(--s-muted)]" />
                            </button>
                        ))
                    )}
                </section>
            </main>
        </>
    );
};

// Home (inside the student layout, components/StudentShell.jsx)
export default DashboardBody;
