import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Platform, Linking
} from 'react-native';
import { showAlert } from '../../components/showAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QrCode, Play, AlertTriangle, X, Clock, FileText, User, CircleQuestionMark, Navigation, ChevronRight } from 'lucide-react-native';
import { useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useAuth } from '../../components/AuthContext';
import api from '../../services/api';
import { useRouter } from 'expo-router';
import MapViewComponent from '../../components/MapViewComponent';
import { onCameraResult } from '../../components/cameraResults';
import { parseServiceQr, serviceQrAction, NOT_A_START_QR, NOT_A_STOP_QR } from '../../components/serviceQr';
import { useTheme } from '../../components/ThemeContext';
import { timeGreeting, todayLabel, studentStatusLine } from '../../components/greeting';
import { compassDirection, formatDistance, directionsUrl, outsideSiteMessage } from '../../components/geo';
import SessionReceipt from '../../components/SessionReceipt';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startTracking, stopTracking, isTrackingSession, sendLocationPing, notifyTimerStopped, LAST_RECEIPT_KEY } from '../../components/backgroundTracking';
import TicketDetails from '../../components/TicketDetails';

// Out of the area (or location off) this long stops the session; same as the website
const OUT_OF_BOUNDS_S = 30;

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

const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

export default function Dashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const { isDarkMode, colors } = useTheme();
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
    // Seconds left before an out-of-area / location-off session is stopped (null when fine)
    const [warningCountdown, setWarningCountdown] = useState(null);
    // Time-out receipt shown after a session ends
    const [receipt, setReceipt] = useState(null);
    // E-ticket opened from the list (its details and service log)
    const [openedTicket, setOpenedTicket] = useState(null);
    const lastFixRef = useRef({ lat: null, lng: null, distance: null });
    const problemRef = useRef(null);
    const autoStoppingRef = useRef(false);
    const [locationEnabled, setLocationEnabled] = useState(true);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const cooldownRef = useRef(null);
    const locationSubscription = useRef(null);

    // Keyed on the user: AuthContext restores the session asynchronously, so it may be null on first render.
    // Polls like the web dashboard so actions taken on either platform show up here.
    useEffect(() => {
        if (!user?.username) return;
        fetchData();
        const poll = setInterval(fetchData, 5000);
        return () => clearInterval(poll);
    }, [user?.username]);

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

                    if (elapsedSinceIn < 20 && elapsedSinceIn >= 0) {
                        const remainingCooldown = 20 - elapsedSinceIn;
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
                : `You were outside your service area for more than ${OUT_OF_BOUNDS_S} seconds, so your timer was stopped.`);
            fetchData();
        } catch (e) {
            showAlert('Error', e.response?.data?.error || 'Could not stop the session. Check your connection.');
        } finally {
            autoStoppingRef.current = false;
        }
    };

    // Out of the area or location off: count down from OUT_OF_BOUNDS_S and stop the session at 0.
    // Leaving, coming back, and location off/on are recorded for the receipt.
    const problem = !timerActive ? null : !locationEnabled ? 'location_off' : isOutOfBounds ? 'left_area' : null;
    useEffect(() => {
        const previous = problemRef.current;
        problemRef.current = problem;
        if (timerActive && previous !== problem) {
            if (previous === 'left_area') logSessionEvent('returned');
            if (previous === 'location_off') logSessionEvent('location_on');
            if (problem) logSessionEvent(problem);
        }
        if (!problem) {
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
        if (warningCountdown === 0 && problem) autoStopSession(problem);
    }, [warningCountdown]);


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

    // Wall-clock elapsed since time-in, matching how the backend deducts hours
    useEffect(() => {
        if (!timerActive || !startTime) return;

        const tickInterval = setInterval(() => {
            setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
        }, 1000);

        return () => clearInterval(tickInterval);
    }, [timerActive, startTime]);

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

    // Recomputed on every change; the watchPositionAsync callback would otherwise see stale state
    useEffect(() => {
        if (!location || !targetLocation || !timerActive || !locationEnabled) return;
        const dist = getDistance(location.latitude, location.longitude, targetLocation.lat, targetLocation.lng);
        setCurrentDistance(dist);
        lastFixRef.current = { lat: location.latitude, lng: location.longitude, distance: Math.round(dist) };
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
        // The scanner already rejects anything that isn't an OSA code (app/student/scan.jsx); checked again here
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
        const scannedData = { eticket_id: activeTicket.id, lat: code.lat, lng: code.lng, radius: code.radius, siteCode: code.siteCode || null };
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
            const site = code.siteCode
                ? (assigned?.site_code === code.siteCode && station.lat != null
                    ? { latitude: station.lat, longitude: station.lng, radius: station.radius || 50 }
                    : null)
                : (code.lat != null ? { latitude: code.lat, longitude: code.lng, radius: code.radius || 5 } : null);
            const outside = site && outsideSiteMessage(coords, site, code.siteCode ? assigned?.name : 'the service point');
            if (outside) {
                showAlert('Not at your service site', outside);
                return;
            }
            scannedData.studentLat = coords.latitude;
            scannedData.studentLng = coords.longitude;
            scannedData.accuracy = coords.accuracy;
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
                // The hub from the QR code, as the website sends it. Never the phone's own position:
                // the backend saves these as the service area, so that would move the geofence to the student.
                lat: scannedData.lat,
                lng: scannedData.lng,
                radius: scannedData.radius,
                // Registered service site: the server looks up its location and radius from the code
                site_code: scannedData.siteCode,
                // Where the student is (time-in only); outside the site's radius the server refuses to start
                student_lat: scannedData.studentLat ?? null,
                student_lng: scannedData.studentLng ?? null,
                accuracy_m: scannedData.accuracy ?? null,
                // This app keeps sending the location, also in the background
                track_location: actionType === 'in'
            });
            if (actionType === 'in') {
                setTimerActive(true);
                setStartTime(Date.now());
                setElapsedSeconds(0);
                setScanCooldown(20);
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
                const { background } = await startTracking(scannedData.eticket_id);
                showAlert('Timer Started!', background
                    ? 'You can leave the app. Your location is still checked; if you leave your service area or turn off location, your timer stops and you get a notification.'
                    : 'Keep OSAConnect open while you serve. To leave the app, allow location "All the time" for OSAConnect in your phone settings. Without it, your timer stops after 3 minutes.');
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
            showAlert('Error', error.response?.data?.error || 'Failed to log time');
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
    const approachDistance = siteTarget && location ? getDistance(location.latitude, location.longitude, siteTarget.latitude, siteTarget.longitude) : null;
    const approachInside = approachDistance != null && approachDistance <= (targetLocation?.radius || 50);
    const approachDirection = siteTarget && location ? compassDirection(location, siteTarget) : '';

    return (
        <View style={{ flex: 1 }}>
        <SessionReceipt receipt={receipt} onClose={() => setReceipt(null)} />
        <TicketDetails ticket={openedTicket} onClose={() => setOpenedTicket(null)} />
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.greeting}>{todayLabel()}</Text>
                        <Text style={styles.userName}>{timeGreeting()}, {displayName}</Text>
                        <Text style={styles.subGreeting}>{studentStatusLine({ sessionActive: timerActive, openTicket: tickets.find(t => t.status === 'Ongoing') || tickets.find(t => t.status === 'Active') })}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/help')} accessibilityLabel="Help">
                            <CircleQuestionMark size={22} color={colors.text} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/student/settings')}>
                            <User size={22} color={colors.text} strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Active Session Card */}
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

                            {/* Geofence Map */}
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
                            {isOutOfBounds && locationEnabled && (
                                <View style={styles.redWarningBanner}>
                                    <View style={styles.redWarningLeft}>
                                        <AlertTriangle size={24} color="#ffffff" strokeWidth={2.5} />
                                        <View style={styles.redWarningTextContainer}>
                                            <Text style={styles.redWarningTitle}>WARNING: OUT OF BOUNDARY</Text>
                                            <Text style={styles.redWarningSubtitle}>Return to area immediately!</Text>
                                        </View>
                                    </View>
                                    <View style={styles.redWarningTimerBox}>
                                        <Text style={styles.redWarningTimerText}>{warningCountdown ?? OUT_OF_BOUNDS_S}</Text>
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
                            <TouchableOpacity
                                style={[styles.endButtonBlue, scanCooldown > 0 && styles.endButtonDisabled]}
                                onPress={scanCooldown === 0 ? startScan : null}
                                activeOpacity={scanCooldown > 0 ? 1 : 0.7}
                            >
                                <Text style={styles.endButtonBlueText}>
                                    {scanCooldown > 0 ? `Scan to End (${scanCooldown}s)` : 'Scan to End Service'}
                                </Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <View style={styles.noSessionIcon}>
                                <QrCode size={48} color={colors.border} strokeWidth={1.5} />
                            </View>
                            <Text style={styles.noSessionTitle}>No Active Session</Text>
                            {assignedSite ? (
                                // Assigned by the admin: only this site's QR starts the timer
                                <Text style={styles.noSessionSubtitle}>
                                    Go to <Text style={{ fontWeight: '900', color: colors.text }}>{assignedSite.name}</Text> and scan{'\n'}the QR code posted there to start.
                                </Text>
                            ) : (
                                <Text style={styles.noSessionSubtitle}>
                                    Scan an activity QR code to start{'\n'}tracking your community service hours.
                                </Text>
                            )}
                            {/* Guide to the site: where you are, how far, which way */}
                            {siteTarget && (
                                <View style={styles.approachBox}>
                                    <View style={[styles.approachStatus, approachInside && styles.approachStatusInside]}>
                                        <Navigation size={14} color={approachInside ? '#059669' : colors.primary} />
                                        <Text style={[styles.approachStatusText, approachInside && { color: '#047857' }]}>
                                            {!location
                                                ? 'Finding your location…'
                                                : approachInside
                                                    ? "You're at the site. Scan the QR code to start."
                                                    : `${assignedSite?.name || 'Service site'}: ${formatDistance(approachDistance)} away, ${approachDirection}`}
                                        </Text>
                                    </View>
                                    <View style={[styles.mapContainer, { height: 280 }]}>
                                        <View style={styles.liveGpsBadge}>
                                            <Text style={styles.liveGpsText}>ROUTE TO SITE</Text>
                                        </View>
                                        <MapViewComponent
                                            style={[styles.map, { height: 280 }]}
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
                                    {!approachInside && (
                                        <TouchableOpacity
                                            style={styles.directionsButton}
                                            onPress={() => Linking.openURL(directionsUrl(siteTarget)).catch(() => showAlert('Maps unavailable', "Couldn't open a maps app on this phone."))}
                                        >
                                            <Navigation size={15} color={colors.text} />
                                            <Text style={styles.directionsText}>Get directions</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                            <TouchableOpacity style={styles.scanCta} onPress={startScan}>
                                <Text style={styles.scanCtaText}>Scan QR Code</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* E-Tickets */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>E-Tickets</Text>
                    <Text style={styles.sectionSubtitle}>Tap a ticket to see its service log</Text>

                    {loading ? (
                        <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
                    ) : tickets.length === 0 ? (
                        <View style={styles.emptyLogs}>
                            <FileText size={32} color={colors.border} />
                            <Text style={styles.emptyLogsText}>No tickets found</Text>
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
                                    ticket.status === 'Completed' ? styles.logStatusDone :
                                    styles.logStatusPending
                                ]}>
                                    <Text style={[styles.logStatusText,
                                        ticket.status === 'Active' ? styles.logStatusTextActive :
                                        ticket.status === 'Completed' ? styles.logStatusTextDone :
                                        styles.logStatusTextPending
                                    ]}>
                                        {ticket.status || 'Pending'}
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
        marginBottom: 24,
    },
    headerLeft: {
        flex: 1,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
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
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sessionCard: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
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
    noSessionIcon: {
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 8,
    },
    noSessionTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
        lineHeight: 28,
    },
    noSessionSubtitle: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: '500',
        lineHeight: 20,
    },
    approachBox: {
        width: '100%',
        marginBottom: 16,
    },
    approachStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
    },
    approachStatusInside: {
        borderColor: '#a7f3d0',
        backgroundColor: '#ecfdf5',
    },
    approachStatusText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '700',
        color: colors.textMuted,
    },
    directionsButton: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
    },
    directionsText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.text,
    },
    scanCta: {
        backgroundColor: colors.primary,
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
        marginBottom: 24,
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
        marginBottom: 16,
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
