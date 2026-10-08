import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, AppState, Modal, Image, RefreshControl
} from 'react-native';
import { showAlert } from '../../components/showAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QrCode, Play, AlertTriangle, Clock, Info, ChevronRight, CheckCircle2 } from 'lucide-react-native';
import { useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useAuth } from '../../components/AuthContext';
import api, { API_URL } from '../../services/api';
import { useRouter } from 'expo-router';
import MapViewComponent from '../../components/MapViewComponent';
import { onCameraResult } from '../../components/cameraResults';
import { parseServiceQr, serviceQrAction, NOT_A_START_QR, NOT_A_STOP_QR } from '../../components/serviceQr';
import { useTheme } from '../../components/ThemeContext';
import { timeGreeting, todayLabel, studentStatusLine } from '../../components/greeting';
import { outsideSiteMessage } from '../../components/geo';
import SessionReceipt from '../../components/SessionReceipt';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { canTrackInBackground, startTracking, stopTracking, isTrackingSession, sendLocationPing, notifyTimerStopped, LAST_RECEIPT_KEY } from '../../components/backgroundTracking';
import TicketDetails from '../../components/TicketDetails';
import { ticketStatusLabel, deadlineNotice } from '../../components/ticketStatus';
import { StudentTopBar, useStudentShell } from '../../components/StudentShell';
import MapGate from '../../components/MapGate';
import { IDLE_REFRESH_MS, SAVER_REFRESH_MS } from '../../components/studentNotifications';

// Location off this long stops the session; same as the website
const OUT_OF_BOUNDS_S = 30;
// Outside the service area the timer pauses; this long away in one go ends the session (the server decides)
const PAUSE_LIMIT_TEXT = '10 seconds'; // DEMO (normally '30 minutes')

// Haversine formula
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const LiveTimer = ({ elapsedSeconds, requiredSeconds, textStyle }) => {
    const remaining = Math.max(0, requiredSeconds - elapsedSeconds);
    const h = Math.floor(remaining / 3600);
    const m = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0');
    const s = String(remaining % 60).padStart(2, '0');
    return <Text style={textStyle}>{h}:{m}:{s}</Text>;
};

const COMPLETED_SEEN_KEY = 'osa-completed-notice-seen';

// "Community service remaining" before timing in: the countdown (hh:mm:ss), the hours required and the
// site, and how much is done. Same as ServiceRemaining in frontend/src/pages/StudentDashboard.jsx.
const hms = (hours) => {
    const total = Math.max(0, Math.round((hours || 0) * 3600));
    return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60].map((n) => String(n).padStart(2, '0')).join(':');
};
const hm = (hours) => {
    const mins = Math.max(0, Math.round((hours || 0) * 60));
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};
// The (i) under "Not timed in" shows the 3-day deadline when tapped (hover on the website)
function ServiceRemaining({ ticket, colors, isDarkMode }) {
    const [showDeadline, setShowDeadline] = useState(false);
    const notice = deadlineNotice(ticket);
    const remainingHours = ticket.base_remaining_hours ?? ticket.remaining_hours ?? 0;
    const required = ticket.total_hours_required || 0;
    const done = Math.max(0, required - remainingHours);
    const pct = required ? Math.min(100, Math.round((done / required) * 100)) : 0;
    const site = ticket.assigned_site?.name || ticket.assigned_location;
    const accent = isDarkMode ? '#3b82f6' : '#2563eb';
    return (
        <View style={{ alignSelf: 'stretch', marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ flexShrink: 1, fontSize: 14, fontWeight: '700', color: colors.textMuted }}>Community service remaining</Text>
                <View style={{ backgroundColor: colors.background, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>Not timed in</Text>
                </View>
            </View>
            {/* The (i) sits beside the countdown, under the pill, so it adds no height */}
            <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ fontSize: 44, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'], letterSpacing: -0.5 }}>{hms(remainingHours)}</Text>
                {notice && (
                    <TouchableOpacity onPress={() => setShowDeadline((v) => !v)} hitSlop={10} style={{ paddingTop: 6, paddingRight: 4 }} accessibilityRole="button" accessibilityLabel={notice.title} accessibilityState={{ expanded: showDeadline }}>
                        <Info size={18} color={notice.overdue ? '#dc2626' : colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>
            {notice && showDeadline && (
                <View style={{ marginBottom: 8, borderWidth: 1, borderRadius: 12, padding: 12, borderColor: notice.overdue ? '#fca5a5' : '#fde68a', backgroundColor: notice.overdue ? '#fee2e2' : '#fffbeb' }}>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: notice.overdue ? '#b91c1c' : '#92400e' }}>{notice.title}</Text>
                    <Text style={{ marginTop: 2, fontSize: 12, lineHeight: 18, fontWeight: '600', color: notice.overdue ? '#991b1b' : '#92400e' }}>{notice.message}</Text>
                </View>
            )}
            <Text style={{ fontSize: 13, color: colors.textMuted }}>of {Math.round(required * 100) / 100} hrs required{site ? ` · ${site}` : ''}</Text>
            <View style={{ marginTop: 12, height: 8, borderRadius: 4, backgroundColor: colors.background, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }}>
                <View style={{ height: '100%', width: `${pct}%`, borderRadius: 4, backgroundColor: accent }} />
            </View>
            <View style={{ marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>{hm(done)} done</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>{pct}%</Text>
            </View>
        </View>
    );
}

export default function Dashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const { isDarkMode, colors } = useTheme();
    // The side menu's copy of the records (its badge and "hours remaining" stay current)
    const { setRecords, dataSaver } = useStudentShell();
    const [refreshing, setRefreshing] = useState(false);
    const styles = getStyles(colors);

    const [violations, setViolations] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [timerActive, setTimerActive] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [requiredSeconds, setRequiredSeconds] = useState(0);
    const [location, setLocation] = useState(null);
    const [targetLocation, setTargetLocation] = useState(null);
    const [isOutOfBounds, setIsOutOfBounds] = useState(false);
    const [currentDistance, setCurrentDistance] = useState(0);
    const [scanCooldown, setScanCooldown] = useState(0);
    // Seconds left before a location-off session is stopped (null when fine)
    const [warningCountdown, setWarningCountdown] = useState(null);
    // Seconds the student has been outside the service area (the timer is paused), or null when inside
    const [awaySeconds, setAwaySeconds] = useState(null);
    // Time-out receipt shown after a session ends
    const [receipt, setReceipt] = useState(null);
    // E-ticket opened from the list (its details and service log)
    const [openedTicket, setOpenedTicket] = useState(null);
    // Tickets whose "hours completed, go to OSA" notice this phone already showed (the popup below)
    const [seenCompleted, setSeenCompleted] = useState(null);
    useEffect(() => {
        AsyncStorage.getItem(COMPLETED_SEEN_KEY)
            .then((v) => setSeenCompleted(JSON.parse(v || '[]')))
            .catch(() => setSeenCompleted([]));
    }, []);
    const lastFixRef = useRef({ lat: null, lng: null, distance: null });
    const problemRef = useRef(null);
    const autoStoppingRef = useRef(false);
    const [locationEnabled, setLocationEnabled] = useState(true);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const cooldownRef = useRef(null);
    const locationSubscription = useRef(null);

    // Keyed on the user: AuthContext restores the session asynchronously, so it may be null on first render.
    // Polls like the web dashboard so actions taken on either platform show up here: every 5 s while a
    // session runs (the server may stop it), otherwise every 30 s (every 3 min with data saver on), and not
    // while the app is in the background. Coming back to the app, or pulling the screen down, refreshes now.
    useEffect(() => {
        if (!user?.username) return;
        fetchData();
        const poll = setInterval(() => AppState.currentState === 'active' && fetchData(), timerActive ? 5000 : (dataSaver ? SAVER_REFRESH_MS : IDLE_REFRESH_MS));
        const sub = AppState.addEventListener('change', (state) => state === 'active' && fetchData());
        return () => { clearInterval(poll); sub.remove(); };
    }, [user?.username, timerActive, dataSaver]);
    const pullRefresh = async () => {
        setRefreshing(true);
        try { await fetchData(); } finally { setRefreshing(false); }
    };

    useEffect(() => {
        setupLocationTracking();


        return () => {
            if (locationSubscription.current) {
                try {
                    locationSubscription.current.remove();
                } catch (e) {
                    console.log("Failed to remove location subscription:", e);
                }
            }
        };
    }, []);

    const fetchData = async () => {
        if (!user?.username) return;
        try {
            const [violationRes, ticketRes] = await Promise.all([
                // Only this student's records (the API used to send everyone's on every 5 s poll)
                api.get('/violations/', { params: { student_id: user.username } }),
                api.get('/etickets/', { params: { student_id: user.username } })
            ]);
            const studentViolations = Array.isArray(violationRes.data)
                ? violationRes.data.filter(v => v.student_details?.student_id === user.username)
                : [];
            const studentTickets = Array.isArray(ticketRes.data)
                ? ticketRes.data.filter(t => t.violation_details?.student_details?.student_id === user.username)
                : [];
            setViolations(studentViolations);
            setTickets(studentTickets);
            setRecords({ violations: studentViolations, tickets: studentTickets });
            // Same ticket selection and countdown source as the web dashboard
            const activeTicket = studentTickets.find(t => t.status === 'Ongoing')
                || studentTickets.find(t => t.status === 'Active');
            // Ended while the app was closed (background tracking saved its receipt)
            const saved = await AsyncStorage.getItem(LAST_RECEIPT_KEY);
            if (saved) {
                await AsyncStorage.removeItem(LAST_RECEIPT_KEY);
                setReceipt(JSON.parse(saved));
            }
            const running = studentTickets.find(t => t.active_time_in);
            if (!running && await isTrackingSession()) await stopTracking();
            if (!activeTicket) {
                setTimerActive(false);
                setStartTime(null);
                setElapsedSeconds(0);
            } else {
                const baseHours = activeTicket.base_remaining_hours ?? activeTicket.remaining_hours ?? 0;
                setRequiredSeconds(Math.floor(baseHours * 3600));
                const station = activeTicket.station || {};
                setTargetLocation({
                    lat: station.lat != null ? parseFloat(station.lat) : 8.4859,
                    lng: station.lng != null ? parseFloat(station.lng) : 124.6567,
                    radius: station.radius != null ? parseFloat(station.radius) : 50
                });

                if (!activeTicket.active_time_in) {
                    setTimerActive(false);
                    setStartTime(null);
                    setElapsedSeconds(0);
                } else {
                    // Time served so far, measured by the server's own clock: balance before this session
                    // minus the live balance. Parsing active_time_in instead broke on Vercel, which stores
                    // naive UTC that phones read as local time (sessions looked 8 h old and showed 0:00:00).
                    const liveHours = activeTicket.remaining_hours ?? baseHours;
                    const elapsedSinceIn = Math.max(0, Math.round((baseHours - liveHours) * 3600));
                    setTimerActive(true);
                    // Anchor to this phone's clock so the countdown keeps ticking between polls
                    setStartTime(Date.now() - elapsedSinceIn * 1000);
                    setElapsedSeconds(elapsedSinceIn);

                    if (elapsedSinceIn < 10 && elapsedSinceIn >= 0) { // DEMO (normally 20)
                        const remainingCooldown = 10 - elapsedSinceIn;
                        setScanCooldown(remainingCooldown);
                        if (cooldownRef.current) clearInterval(cooldownRef.current);
                        cooldownRef.current = setInterval(() => {
                            setScanCooldown(prev => {
                                if (prev <= 1) {
                                    clearInterval(cooldownRef.current);
                                    return 0;
                                }
                                return prev - 1;
                            });
                        }, 1000);
                    } else {
                        setScanCooldown(0);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    const openTicket = tickets.find(t => t.status === 'Ongoing') || tickets.find(t => t.status === 'Active');
    const completedTicket = !receipt && seenCompleted
        ? tickets.find((t) => t.status === 'Completed' && !seenCompleted.includes(t.id))
        : null;
    const dismissCompleted = () => {
        if (!completedTicket) return;
        const next = [...seenCompleted, completedTicket.id];
        setSeenCompleted(next);
        AsyncStorage.setItem(COMPLETED_SEEN_KEY, JSON.stringify(next)).catch(() => {});
    };

    // Hours served but not cleared yet: the student brings the signed ISO form and reflection paper to OSA
    const clearanceTicket = tickets.find((t) => t.status === 'Completed');
    // Records something that happened during the session for the time-out receipt
    const logSessionEvent = (type) => {
        if (!openTicket) return;
        const { lat, lng, distance } = lastFixRef.current;
        api.post('/timelogs/log_event/', { eticket_id: openTicket.id, type, lat, lng, distance_m: distance }).catch(() => {});
    };

    // Ends the session for the student and shows the receipt (the ref stops a double send)
    const autoStopSession = async (endReason) => {
        if (!openTicket || autoStoppingRef.current) return;
        autoStoppingRef.current = true;
        const { lat, lng, distance } = lastFixRef.current;
        try {
            const { data } = await api.post('/timelogs/log_time/', {
                eticket_id: openTicket.id, action: 'out', end_reason: endReason, lat, lng, distance_m: distance,
            });
            await stopTracking();
            await notifyTimerStopped(endReason); // only shows when the app isn't on screen
            setTimerActive(false);
            setStartTime(null);
            setScanCooldown(0);
            setWarningCountdown(null);
            if (data?.receipt) setReceipt(data.receipt);
            else showAlert('Session stopped', endReason === 'location_off'
                ? 'Your location was off for too long, so your timer was stopped.'
                : `You were away from your service area for more than ${PAUSE_LIMIT_TEXT}, so your timer was stopped.`);
            fetchData();
        } catch (e) {
            showAlert('Error', e.response?.data?.error || 'Could not stop the session. Check your connection.');
        } finally {
            autoStoppingRef.current = false;
        }
    };

    // Location off: count down from OUT_OF_BOUNDS_S and stop the session at 0 (recorded for the receipt).
    // Out of the area: the timer pauses until the student is back (the server leaves that time out, and
    // records leaving and coming back); see the effect below.
    const problem = !timerActive ? null : !locationEnabled ? 'location_off' : isOutOfBounds ? 'left_area' : null;
    useEffect(() => {
        const previous = problemRef.current;
        problemRef.current = problem;
        if (timerActive && previous !== problem) {
            if (previous === 'location_off') logSessionEvent('location_on');
            if (problem === 'location_off') logSessionEvent(problem);
        }
        if (problem !== 'location_off') {
            setWarningCountdown(null);
            return;
        }
        const since = Date.now();
        setWarningCountdown(OUT_OF_BOUNDS_S);
        const timer = setInterval(() => {
            setWarningCountdown(Math.max(0, OUT_OF_BOUNDS_S - Math.floor((Date.now() - since) / 1000)));
        }, 250);
        return () => clearInterval(timer);
    }, [problem]);

    useEffect(() => {
        if (warningCountdown === 0 && problem === 'location_off') autoStopSession(problem);
    }, [warningCountdown]);

    // Out of the area: the timer pauses and resumes when the student is back, so being sent on an errand
    // doesn't end the session. Leaving and coming back are sent to the server right away, so its record
    // matches what the student sees; back inside, the timer is taken from the server (time away left out).
    const away = timerActive && locationEnabled && isOutOfBounds;
    const wasAwayRef = useRef(false);
    useEffect(() => {
        const { lat, lng, accuracy } = lastFixRef.current;
        const ping = () => (lat != null
            ? sendLocationPing({ lat, lng, accuracy_m: accuracy }, { force: true }).catch(() => null)
            : Promise.resolve(null));
        if (!away) {
            setAwaySeconds(null);
            if (wasAwayRef.current && timerActive) ping().then(() => fetchData());
            wasAwayRef.current = false;
            return;
        }
        wasAwayRef.current = true;
        ping();
        const leftAt = Date.now();
        setAwaySeconds(0);
        const timer = setInterval(() => setAwaySeconds(Math.floor((Date.now() - leftAt) / 1000)), 1000);
        return () => clearInterval(timer);
    }, [away]);


    useEffect(() => {
        const checkLocationActive = async () => {
            try {
                const enabled = await Location.hasServicesEnabledAsync();
                const { status } = await Location.getForegroundPermissionsAsync();
                const isActive = enabled && status === 'granted';
                // Location off is its own warning and countdown (see `problem`), not "out of bounds"
                setLocationEnabled(isActive);
            } catch (e) {
                setLocationEnabled(false);
                console.log(e);
            }
        };

        checkLocationActive();
        const interval = setInterval(checkLocationActive, 1500);
        return () => clearInterval(interval);
    }, []);

    // Wall-clock elapsed since time-in, matching how the backend deducts hours. Paused while the student is
    // outside the service area: the shown time stays where it was.
    useEffect(() => {
        if (!timerActive || !startTime || away) return;

        const tickInterval = setInterval(() => {
            setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
        }, 1000);

        return () => clearInterval(tickInterval);
    }, [timerActive, startTime, away]);

    const setupLocationTracking = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            const isEnabled = await Location.hasServicesEnabledAsync();
            if (!isEnabled) {
                console.log('Location services are disabled on this device.');
                return;
            }

            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            setLocation({ ...loc.coords, timestamp: loc.timestamp });
            locationSubscription.current = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 0 },
                (newLoc) => {
                    setLocation({ ...newLoc.coords, timestamp: newLoc.timestamp });
                }
            );
        } catch (e) {
            console.log('Location setup failed silently:', e.message);
        }
    };

    // Back in the app during a session: check the location right away (sessions not tracked in the
    // background are only checked here; tracked ones get an extra up-to-date reading)
    useEffect(() => {
        if (!timerActive) return;
        const sub = AppState.addEventListener('change', async (state) => {
            if (state !== 'active') return;
            try {
                let res;
                if (!(await Location.hasServicesEnabledAsync())) {
                    res = await sendLocationPing({ location_off: true }, { force: true });
                } else {
                    const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                    res = await sendLocationPing({ lat: coords.latitude, lng: coords.longitude, accuracy_m: coords.accuracy }, { force: true });
                }
                if (res?.state === 'stopped' || res?.state === 'none') {
                    setTimerActive(false);
                    setStartTime(null);
                    if (res.receipt) setReceipt(res.receipt);
                    AsyncStorage.removeItem(LAST_RECEIPT_KEY);
                    fetchData();
                }
            } catch {
                // Offline: the regular checks continue once the connection is back
            }
        });
        return () => sub.remove();
    }, [timerActive]);

    // Recomputed on every change; the watchPositionAsync callback would otherwise see stale state
    useEffect(() => {
        if (!location || !targetLocation || !timerActive || !locationEnabled) return;
        const dist = getDistance(location.latitude, location.longitude, targetLocation.lat, targetLocation.lng);
        setCurrentDistance(dist);
        lastFixRef.current = { lat: location.latitude, lng: location.longitude, accuracy: location.accuracy, distance: Math.round(dist) };
        // Radius plus a GPS accuracy buffer, the same rule as the website
        setIsOutOfBounds(dist > targetLocation.radius + (location.accuracy || 0) * 0.7);
        // The server keeps the session only while it keeps hearing where the student is
        sendLocationPing({ lat: location.latitude, lng: location.longitude, accuracy_m: location.accuracy })
            .then((res) => {
                if (res?.state === 'stopped') {
                    setTimerActive(false);
                    setStartTime(null);
                    if (res.receipt) setReceipt(res.receipt);
                    AsyncStorage.removeItem(LAST_RECEIPT_KEY);
                    fetchData();
                }
            })
            .catch(() => {});
    }, [location, targetLocation, timerActive, locationEnabled]);

    const handleBarCodeScanned = async ({ data }) => {
        // The scanner already rejects anything that isn't a service site code (app/student/scan.jsx); checked again here
        const code = parseServiceQr(data);
        const action = serviceQrAction(code, timerActive);
        if (!action) {
            showAlert('Invalid QR Code', timerActive ? NOT_A_STOP_QR : NOT_A_START_QR);
            return;
        }
        const activeTicket = tickets.find(t => t.status === 'Ongoing') || tickets.find(t => t.status === 'Active');
        if (!activeTicket) {
            showAlert('Error', "You don't have any active service tickets.");
            return;
        }
        const scannedData = { eticket_id: activeTicket.id, siteCode: code.siteCode };
        if (action === 'in') {
            // Where the student is right now; the server only starts the timer inside the site's radius
            // A fix from the watcher in the last 10 s is used as is; only otherwise wait for GPS
            let coords = location?.timestamp && Date.now() - location.timestamp < 10000 ? location : null;
            if (!coords) {
                try {
                    coords = (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })).coords;
                } catch {
                    coords = location; // the last reading, however old
                }
            }
            if (!coords) {
                showAlert('Location Required', "We couldn't get your location. Turn on location and try again.");
                return;
            }
            // Outside the site: say so right away (the server checks this too)
            const assigned = activeTicket.assigned_site;
            const station = activeTicket.station || {};
            const site = assigned?.site_code === code.siteCode && station.lat != null
                ? { latitude: station.lat, longitude: station.lng, radius: station.radius || 50 }
                : null;
            const outside = site && outsideSiteMessage(coords, site, assigned?.name);
            if (outside) {
                showAlert('Not at your service site', outside);
                return;
            }
            scannedData.studentLat = coords.latitude;
            scannedData.studentLng = coords.longitude;
            scannedData.accuracy = coords.accuracy;
            // Asked now so the server knows whether this session is tracked with the app closed
            scannedData.trackLocation = await canTrackInBackground();
        }
        // Starts or stops the timer right away (no photo step)
        submitLog(action, scannedData);
    };

    const submitLog = async (actionType, scannedData) => {
        if (!scannedData) return;
        setLoading(true);
        try {
            const { data } = await api.post('/timelogs/log_time/', {
                eticket_id: scannedData.eticket_id,
                action: actionType,
                // The service site's code: the server looks up its location and radius
                site_code: scannedData.siteCode,
                // Where the student is (time-in only); outside the site's radius the server refuses to start
                student_lat: scannedData.studentLat ?? null,
                student_lng: scannedData.studentLng ?? null,
                accuracy_m: scannedData.accuracy ?? null,
                // This app keeps sending the location, also in the background
                track_location: actionType === 'in' && !!scannedData.trackLocation
            });
            if (actionType === 'in') {
                setTimerActive(true);
                setStartTime(Date.now());
                setElapsedSeconds(0);
                setScanCooldown(10); // DEMO (normally 20)
                if (cooldownRef.current) clearInterval(cooldownRef.current);
                cooldownRef.current = setInterval(() => {
                    setScanCooldown(prev => {
                        if (prev <= 1) {
                            clearInterval(cooldownRef.current);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
                // Keep checking the location while the app is in the background
                const { background } = await startTracking(scannedData.eticket_id, scannedData.trackLocation);
                showAlert('Timer Started!', background
                    ? 'You can leave the app. Your location is still checked; if you leave your service area or turn off location, your timer stops and you get a notification.'
                    : 'You can leave the app. When you come back, your location is checked right away: if location was turned off, only the time until then counts, and if you are outside your service area, the 30-second countdown starts.');
                setTimeout(() => fetchData(), 2000);
            } else {
                await stopTracking();
                setTimerActive(false);
                setStartTime(null);
                setScanCooldown(0);
                if (cooldownRef.current) clearInterval(cooldownRef.current);
                if (data?.receipt) setReceipt(data.receipt);
                else showAlert('Success', 'Timer Stopped!');
                fetchData();
            }
        } catch (error) {
            // Ending a session with no internet: the time-out has to reach the server, so say how to fix it
            if (!error.response && actionType === 'out') {
                showAlert('No Internet Connection', "Turn on your Wi-Fi or mobile data, then scan your service site's QR code again to end your session.");
                return;
            }
            // Say whether the server refused (its message), crashed, or couldn't be reached at all
            showAlert('Error', error.response
                ? (error.response.data?.error || `Server error (${error.response.status}). Please try again.`)
                : `Can't reach the server (${API_URL.replace(/^https?:\/\//, '').replace(/\/api$/, '')}). Check your internet connection and try again.`);
        } finally {
            setLoading(false);
        }
    };

    const startScan = async () => {
        const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
        if (locStatus !== 'granted') {
            showAlert('Location Required', 'Please enable location permissions to scan the QR code.');
            return;
        }

        const isLocationEnabled = await Location.hasServicesEnabledAsync();
        if (!isLocationEnabled) {
            showAlert('Location Disabled', 'Please turn on your device location to scan the QR code.');
            return;
        }

        if (!location) {
            try {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                setLocation({ ...loc.coords, timestamp: loc.timestamp });
                locationSubscription.current = await Location.watchPositionAsync(
                    { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 0 },
                    (newLoc) => {
                        setLocation({ ...newLoc.coords, timestamp: newLoc.timestamp });
                    }
                );
            } catch (e) {
                showAlert('Location Error', 'Unable to fetch your current location. Please try again.');
                return;
            }
        }

        if (!cameraPermission?.granted) {
            const { status } = await requestCameraPermission();
            if (status !== 'granted') {
                showAlert('Camera permission is required to scan QR codes');
                return;
            }
        }
        // The scanner is its own screen (app/student/scan.jsx); it hands the result back here
        onCameraResult('scan', handleBarCodeScanned);
        router.push({ pathname: '/student/scan', params: { mode: timerActive ? 'end' : 'start' } });
    };

    const displayName = user?.name?.split(' ')[0] || user?.username || 'User';
    const assignedSite = (tickets.find(t => t.status === 'Ongoing') || tickets.find(t => t.status === 'Active'))?.assigned_site;
    // Before a session: how far and which way the student's site is (targetLocation comes from the open ticket)
    // (only when the ticket has a real location; targetLocation falls back to a default campus point)
    const openStation = (tickets.find(t => t.status === 'Ongoing') || tickets.find(t => t.status === 'Active'))?.station;
    const siteTarget = targetLocation && openStation?.lat != null ? { latitude: targetLocation.lat, longitude: targetLocation.lng } : null;

    return (
        <View style={{ flex: 1 }}>
        <SessionReceipt receipt={receipt} onClose={() => setReceipt(null)} />

        {/* Hours served: the student still has to bring the signed ISO form to OSA to be cleared.
            Shown after the time-out receipt, once per ticket. Same as the website. */}
        <Modal visible={!!completedTicket} transparent animationType="fade" onRequestClose={dismissCompleted}>
            <View style={styles.completedOverlay}>
                <View style={styles.completedCard}>
                    <View style={styles.completedIcon}>
                        <CheckCircle2 size={30} color="#10b981" />
                    </View>
                    <Text style={styles.completedTitle}>Service hours completed!</Text>
                    <Text style={styles.completedText}>
                        You've finished the community service for{' '}
                        <Text style={styles.completedBold}>{completedTicket?.violation_details?.violation_type || 'your violation'}</Text>.
                        Please proceed to the <Text style={styles.completedBold}>OSA office</Text> with your signed ISO form and reflection paper to verify and properly clear your violation.
                    </Text>
                    <TouchableOpacity style={styles.completedButton} onPress={dismissCompleted} accessibilityRole="button">
                        <Text style={styles.completedButtonText}>OK, I'll go to the OSA office</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
        <TicketDetails ticket={openedTicket} onClose={() => setOpenedTicket(null)} />
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.card} />
            <StudentTopBar title="Home" />
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pullRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.greeting}>{todayLabel()}</Text>
                        <Text style={styles.userName}>{timeGreeting()}, {displayName}</Text>
                        {(timerActive || openTicket) && (
                            <Text style={styles.subGreeting}>{studentStatusLine({ sessionActive: timerActive, openTicket })}</Text>
                        )}
                    </View>
                </View>

                {/* Hours done, not cleared yet: what to bring to OSA (stays until OSA approves). Same as the website. */}
                {clearanceTicket && (
                    <View style={[styles.deadlineBox, styles.clearanceBox]}>
                        <CheckCircle2 size={20} color="#059669" style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.deadlineTitle, { color: '#065f46' }]}>Go to the OSA office to be cleared</Text>
                            <Text style={[styles.deadlineText, { color: '#047857' }]}>
                                Your hours for {clearanceTicket.violation_details?.violation_type || 'your violation'} are complete. Bring your signed ISO form and your reflection paper to the OSA office. Your violation is cleared once OSA approves them.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Service card while there's community service to do; otherwise just a hello. Same as the website. */}
                {timerActive || openTicket ? (
                    <View style={[styles.sessionCard, isOutOfBounds && styles.sessionCardWarning]}>
                        {timerActive ? (
                            <>
                                <View style={styles.sessionCardHeader}>
                                    <Play size={16} color={isOutOfBounds ? '#ef4444' : colors.success} />
                                    <Text style={[styles.sessionCardTitle, isOutOfBounds && { color: '#ef4444' }]}>
                                        Live Community Service
                                    </Text>
                                </View>
                                <View style={styles.timerContainer}>
                                    <LiveTimer
                                        elapsedSeconds={elapsedSeconds}
                                        requiredSeconds={requiredSeconds}
                                        textStyle={styles.timerText}
                                    />
                                </View>
                                {/* Location status */}
                                <View style={[styles.locationCard, isOutOfBounds && styles.locationCardWarn]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <View style={[styles.locationDot, isOutOfBounds && styles.locationDotWarn]} />
                                        <Text style={[styles.locationStatus, isOutOfBounds && { color: '#ef4444' }]}>
                                            {location
                                                ? isOutOfBounds
                                                    ? `Out of bounds — ${Math.round(currentDistance)}m away`
                                                    : `Within service area — ${Math.round(currentDistance)}m from hub`
                                                : 'Fetching location...'}
                                        </Text>
                                    </View>
                                </View>

                                {/* 20-second cooldown indicator */}
                                {scanCooldown > 0 && (
                                    <View style={styles.cooldownBox}>
                                        <Clock size={13} color="#f59e0b" />
                                        <Text style={styles.cooldownText}>
                                            Please wait {scanCooldown}s before ending session
                                        </Text>
                                    </View>
                                )}

                                {/* Geofence Map (on tap with data saver on) */}
                                <MapGate>
                                <View style={styles.mapContainer}>
                                    <View style={styles.liveGpsBadge}>
                                        <Text style={styles.liveGpsText}>LIVE GPS FEED</Text>
                                    </View>
                                    <MapViewComponent
                                        style={styles.map}
                                        region={{
                                            latitude: targetLocation ? targetLocation.lat : 8.4859,
                                            longitude: targetLocation ? targetLocation.lng : 124.6567,
                                            latitudeDelta: 0.0015,
                                            longitudeDelta: 0.0015,
                                        }}
                                        isDarkMode={isDarkMode}
                                        darkMapStyle={darkMapStyle}
                                        targetLocation={targetLocation}
                                        isOutOfBounds={isOutOfBounds}
                                        location={location}
                                        hubMarkerDotStyle={styles.hubMarkerDot}
                                        studentMarkerDotStyle={[
                                            styles.studentMarkerDot,
                                            { backgroundColor: isOutOfBounds ? '#ef4444' : '#10b981' }
                                        ]}
                                    />
                                    <View style={styles.mapLegend}>
                                        <View style={styles.mapLegendItem}>
                                            <View style={[styles.mapLegendDot, { backgroundColor: '#1e3a8a' }]} />
                                            <Text style={styles.mapLegendText}>Service site</Text>
                                        </View>
                                        {location && (
                                            <View style={styles.mapLegendItem}>
                                                <View style={[styles.mapLegendDot, { backgroundColor: isOutOfBounds ? '#ef4444' : '#10b981' }]} />
                                                <Text style={styles.mapLegendText}>You</Text>
                                            </View>
                                        )}
                                        <Text style={styles.mapLegendRadius}>Radius: {targetLocation ? targetLocation.radius : 50}m</Text>
                                    </View>
                                </View>
                                </MapGate>
                                {/* Outside the area: the timer is paused until the student is back */}
                                {away && (
                                    <View style={[styles.redWarningBanner, { backgroundColor: '#d97706', shadowColor: '#d97706' }]}>
                                        <View style={styles.redWarningLeft}>
                                            <AlertTriangle size={24} color="#ffffff" strokeWidth={2.5} />
                                            <View style={styles.redWarningTextContainer}>
                                                <Text style={styles.redWarningTitle}>TIMER PAUSED: OUT OF AREA</Text>
                                                <Text style={[styles.redWarningSubtitle, { color: '#fef3c7' }]}>
                                                    Go back to your service site to continue. Your session ends after {PAUSE_LIMIT_TEXT} away.
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.redWarningTimerBox}>
                                            <Text style={[styles.redWarningTimerText, { color: '#d97706' }]}>
                                                {Math.floor((awaySeconds || 0) / 60)}:{String((awaySeconds || 0) % 60).padStart(2, '0')}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                                {!locationEnabled && (
                                    <View style={[styles.redWarningBanner, { backgroundColor: '#f59e0b', shadowColor: '#f59e0b' }]}>
                                        <View style={styles.redWarningLeft}>
                                            <AlertTriangle size={24} color="#ffffff" strokeWidth={2.5} />
                                            <View style={styles.redWarningTextContainer}>
                                                <Text style={styles.redWarningTitle}>GPS SIGNAL LOST</Text>
                                                <Text style={[styles.redWarningSubtitle, { color: '#fef3c7' }]}>
                                                    Turn location back on or your timer stops!
                                                </Text>
                                            </View>
                                        </View>
                                        {timerActive && warningCountdown != null && (
                                            <View style={styles.redWarningTimerBox}>
                                                <Text style={[styles.redWarningTimerText, { color: '#f59e0b' }]}>{warningCountdown}</Text>
                                            </View>
                                        )}
                                    </View>
                                )}
                                {/* Greyed out while the student is outside the site's area (the time-out QR is at the
                                    site); it comes back as soon as they're inside again */}
                                <TouchableOpacity
                                    style={[styles.endButtonBlue, (scanCooldown > 0 || isOutOfBounds) && styles.endButtonDisabled]}
                                    onPress={scanCooldown === 0 && !isOutOfBounds ? startScan : null}
                                    activeOpacity={scanCooldown > 0 || isOutOfBounds ? 1 : 0.7}
                                    accessibilityState={{ disabled: scanCooldown > 0 || isOutOfBounds }}
                                >
                                    <Text style={styles.endButtonBlueText}>
                                        {scanCooldown > 0 ? `Scan to End (${scanCooldown}s)` : 'Scan to End Service'}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                {openTicket ? (
                                    // 1. What's left to serve
                                    <ServiceRemaining ticket={openTicket} colors={colors} isDarkMode={isDarkMode} />
                                ) : null}
                                {/* 2. The map to the site */}
                                {siteTarget && (
                                    <View style={styles.approachBox}>
                                        <MapGate>
                                        <View style={[styles.mapContainer, { height: 240, marginTop: 0 }]}>
                                            <View style={styles.liveGpsBadge}>
                                                <Text style={styles.liveGpsText}>ROUTE TO SITE</Text>
                                            </View>
                                            <MapViewComponent
                                                style={[styles.map, { height: 240 }]}
                                                region={{ latitude: targetLocation.lat, longitude: targetLocation.lng, latitudeDelta: 0.004, longitudeDelta: 0.004 }}
                                                isDarkMode={isDarkMode}
                                                darkMapStyle={darkMapStyle}
                                                targetLocation={targetLocation}
                                                isOutOfBounds={false}
                                                location={location}
                                                approach
                                                hubMarkerDotStyle={styles.hubMarkerDot}
                                                studentMarkerDotStyle={[styles.studentMarkerDot, { backgroundColor: '#0ea5e9' }]}
                                            />
                                            {/* Same legend as the website's map */}
                                            <View style={styles.mapLegend}>
                                                <View style={styles.mapLegendItem}>
                                                    <View style={[styles.mapLegendDot, { backgroundColor: '#1e3a8a' }]} />
                                                    <Text style={styles.mapLegendText}>Service site</Text>
                                                </View>
                                                {location && (
                                                    <View style={styles.mapLegendItem}>
                                                        <View style={[styles.mapLegendDot, { backgroundColor: '#0ea5e9' }]} />
                                                        <Text style={styles.mapLegendText}>You</Text>
                                                    </View>
                                                )}
                                                <Text style={styles.mapLegendRadius}>Radius: {targetLocation.radius}m · starts when you scan</Text>
                                            </View>
                                        </View>
                                        </MapGate>
                                    </View>
                                )}
                                {/* 3. Where to go */}
                                {openTicket && (
                                    <Text style={styles.reportText}>
                                        Go to <Text style={{ fontWeight: '800', color: colors.text }}>{assignedSite?.name || openTicket.assigned_location || 'your service site'}</Text> and scan the QR code to start your timer.
                                    </Text>
                                )}
                                {/* 4. Time in */}
                                <TouchableOpacity style={styles.scanCta} onPress={startScan}>
                                    <QrCode size={18} color="#fff" strokeWidth={2.2} />
                                    <Text style={styles.scanCtaText}>Scan QR Code to Time-In</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                ) : !loading && (
                    <View style={styles.helloCard}>
                        <View style={styles.helloIcon}><CheckCircle2 size={22} color="#059669" /></View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.helloTitle}>Hello, {displayName}!</Text>
                            <Text style={styles.helloText}>You currently don't have any community service to render.</Text>
                        </View>
                    </View>
                )}

                {/* E-Tickets */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>E-Tickets</Text>
                    <Text style={styles.sectionSubtitle}>Tap a ticket to see its service log and forms</Text>
                    {loading ? (
                        <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
                    ) : tickets.length === 0 ? (
                        <View style={styles.emptyLogs}>
                            {/* 🫡 in black and white, same image as the website */}
                            <Image source={require('../../assets/images/salute.png')} style={{ width: 44, height: 44 }} accessibilityIgnoresInvertColors />
                            <Text style={styles.emptyLogsText}>No e-tickets. You have no community service to serve.</Text>
                        </View>
                    ) : (
                        tickets.map((ticket, idx) => (
                            <TouchableOpacity key={ticket.id || idx} style={styles.logRow} onPress={() => setOpenedTicket(ticket)} accessibilityRole="button">
                                <View style={[styles.logDot, ticket.status === 'Active' && styles.logDotActive]} />
                                <View style={styles.logInfo}>
                                    <Text style={styles.logTicket}>Ticket #{ticket.id}</Text>
                                    <Text style={styles.logTime}>
                                        {ticket.violation_details?.violation_type || 'Violation'}
                                    </Text>
                                    <Text style={styles.logTimeSmall}>
                                        Required: {ticket.total_hours_required || 0} hrs
                                    </Text>
                                </View>
                                <View style={[styles.logStatusBadge,
                                    ticket.status === 'Active' ? styles.logStatusActive :
                                    ticket.status === 'Completed' ? styles.logStatusAwaiting :
                                    ticket.status === 'Cleared' ? styles.logStatusDone :
                                    styles.logStatusPending
                                ]}>
                                    <Text style={[styles.logStatusText,
                                        ticket.status === 'Active' ? styles.logStatusTextActive :
                                        ticket.status === 'Completed' ? styles.logStatusTextAwaiting :
                                        ticket.status === 'Cleared' ? styles.logStatusTextDone :
                                        styles.logStatusTextPending
                                    ]}>
                                        {ticketStatusLabel(ticket)}
                                    </Text>
                                </View>
                                <ChevronRight size={16} color={colors.textMuted} style={{ marginLeft: 8 }} />
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* Bottom padding */}
                <View style={{ height: 100 }} />
            </ScrollView>

        </SafeAreaView>

        </View>
    );
}

const getStyles = (colors) => StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    // Centered 576px column on wide screens, like the website's max-w-xl
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        width: '100%',
        maxWidth: 576,
        alignSelf: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerLeft: {
        flex: 1,
    },
    greeting: {
        fontSize: 12,
        fontWeight: '900',
        color: colors.textMuted,
        letterSpacing: 2,
        marginBottom: 4,
        textTransform: 'uppercase',
        lineHeight: 16,
    },
    userName: {
        fontSize: 24,
        fontWeight: '900',
        color: colors.text,
        letterSpacing: 0.5,
        lineHeight: 32,
    },
    subGreeting: {
        fontSize: 14,
        color: colors.textMuted,
        fontWeight: '600',
        marginTop: 4,
        lineHeight: 20,
    },
    sessionCard: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sessionCardWarning: {
        borderColor: '#ef4444',
        borderWidth: 1.5,
    },
    sessionCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sessionCardTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: colors.success,
        marginLeft: 8,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    // No vertical margin: the header's 12px bottom margin sets the gap (matches web's collapsed margins)
    timerContainer: {
        marginVertical: 0,
    },
    timerText: {
        fontSize: 52,
        fontWeight: '900',
        color: colors.text,
        fontVariant: ['tabular-nums'],
        lineHeight: 65,
    },
    helloCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 16 },
    helloIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
    helloTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
    helloText: { marginTop: 2, fontSize: 14, fontWeight: '500', color: colors.textMuted },
    reportText: { fontSize: 13, lineHeight: 19, color: colors.textMuted, textAlign: 'center', marginTop: 0, marginBottom: 12, paddingHorizontal: 4 },
    approachBox: {
        width: '100%',
        marginBottom: 12,
    },
    scanCta: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 28,
        borderRadius: 12,
        alignSelf: 'center',
    },
    scanCtaText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
        letterSpacing: 0.5,
        lineHeight: 20,
    },
    locationCard: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: colors.border,
    },
    locationCardWarn: {
        backgroundColor: '#fee2e2',
        borderColor: '#fca5a5',
    },
    locationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.success,
    },
    locationDotWarn: {
        backgroundColor: '#ef4444',
    },
    locationStatus: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textMuted,
        lineHeight: 20,
    },
    cooldownBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#fef3c7',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#fde68a',
        justifyContent: 'center',
    },
    cooldownText: {
        color: '#d97706',
        fontSize: 13,
        fontWeight: '700',
        flexShrink: 1,
    },
    endButtonBlue: {
        backgroundColor: colors.primary,
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        marginTop: 16,
    },
    endButtonDisabled: {
        backgroundColor: colors.border,
    },
    endButtonBlueText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1,
        lineHeight: 20,
    },
    mapContainer: {
        marginTop: 12,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        width: '100%',
        height: 200,
    },
    map: {
        width: '100%',
        height: 200,
    },
    liveGpsBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: colors.card,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 3,
        elevation: 3,
    },
    liveGpsText: {
        fontSize: 9,
        fontWeight: '900',
        color: colors.text,
        letterSpacing: 1,
    },
    mapLegend: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: colors.card,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    mapLegendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    mapLegendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    mapLegendText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.text,
    },
    mapLegendRadius: {
        fontSize: 10,
        color: colors.textMuted,
        marginTop: 2,
        fontWeight: '600',
    },
    hubMarkerDot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#1d4ed8',
        borderWidth: 3,
        borderColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 4,
    },
    studentMarkerDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 3,
    },
    redWarningBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e11d48',
        borderRadius: 18,
        paddingHorizontal: 18,
        paddingVertical: 14,
        marginTop: 16,
        justifyContent: 'space-between',
        shadowColor: '#e11d48',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    redWarningLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    redWarningTextContainer: {
        marginLeft: 12,
    },
    redWarningTitle: {
        color: '#ffffff',
        fontWeight: '900',
        fontSize: 13,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    redWarningSubtitle: {
        color: '#fecdd3',
        fontSize: 12,
        marginTop: 2,
        fontWeight: '600',
    },
    redWarningTimerBox: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        elevation: 1,
    },
    redWarningTimerText: {
        color: '#e11d48',
        fontSize: 20,
        fontWeight: '900',
    },
    section: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: colors.text,
        marginBottom: 4,
        lineHeight: 28,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: colors.textMuted,
        fontWeight: '500',
        marginBottom: 12,
        lineHeight: 20,
    },
    emptyLogs: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 8,
    },
    emptyLogsText: {
        fontSize: 13,
        color: colors.textMuted,
        fontStyle: 'italic',
    },
    logRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
        borderWidth: 1,
        borderColor: colors.border,
    },
    logDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.success,
        marginRight: 12,
    },
    logDotActive: {
        backgroundColor: '#ff6b35',
    },
    logInfo: {
        flex: 1,
    },
    logTicket: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.text,
        lineHeight: 20,
    },
    logTime: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 2,
        lineHeight: 16,
    },
    logTimeSmall: {
        fontSize: 10,
        color: colors.textMuted,
        marginTop: 2,
        lineHeight: 15,
    },
    logStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    logStatusActive: { backgroundColor: '#dcfce7' },
    logStatusDone: { backgroundColor: '#f1f5f9' },
    logStatusPending: { backgroundColor: '#faf5ff' },
    logStatusText: { fontSize: 10, fontWeight: '700' },
    logStatusTextActive: { color: '#10b981' },
    logStatusTextDone: { color: '#64748b' },
    logStatusTextPending: { color: '#7c3aed' },
    logStatusAwaiting: { backgroundColor: '#fef3c7' },
    logStatusTextAwaiting: { color: '#b45309' },
    deadlineBox: { flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: '#fde68a', backgroundColor: '#fffbeb', borderRadius: 16, padding: 16, marginBottom: 16 },
    clearanceBox: { borderColor: '#a7f3d0', backgroundColor: '#ecfdf5' },
    deadlineTitle: { fontSize: 14, fontWeight: '900', color: '#92400e' },
    deadlineText: { marginTop: 2, fontSize: 12, lineHeight: 18, fontWeight: '600', color: '#92400e' },
    completedOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    completedCard: { width: '100%', maxWidth: 380, backgroundColor: colors.card, borderRadius: 24, padding: 24, alignItems: 'center' },
    completedIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    completedTitle: { fontSize: 18, fontWeight: '900', color: colors.text, textAlign: 'center' },
    completedText: { marginTop: 8, fontSize: 14, lineHeight: 20, fontWeight: '500', color: colors.textMuted, textAlign: 'center' },
    completedBold: { fontWeight: '700', color: colors.text },
    completedButton: { marginTop: 20, alignSelf: 'stretch', backgroundColor: colors.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
    completedButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
});

const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8f979e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1e293b' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1e293b' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#020617' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
];
