import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Modal, StatusBar, SafeAreaView, Platform
} from 'react-native';
import { QrCode, Play, AlertTriangle, X, Clock, FileText, User } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useAuth } from '../../components/AuthContext';
import api from '../../services/api';
import { useRouter } from 'expo-router';
import MapView, { Circle, Marker } from 'react-native-maps';
import { useTheme } from '../../components/ThemeContext';

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

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'GOOD MORNING,';
    if (h < 18) return 'GOOD AFTERNOON,';
    return 'GOOD EVENING,';
};

const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

export default function Dashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const { isDarkMode, colors } = useTheme();
    const styles = getStyles(colors);

    const [subGreeting, setSubGreeting] = useState('');
    const [violations, setViolations] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [timerActive, setTimerActive] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [requiredSeconds, setRequiredSeconds] = useState(0);
    const [previouslyRendered, setPreviouslyRendered] = useState(0);
    const [location, setLocation] = useState(null);
    const [targetLocation, setTargetLocation] = useState(null);
    const [isOutOfBounds, setIsOutOfBounds] = useState(false);
    const [currentDistance, setCurrentDistance] = useState(0);
    const [isTakingPicture, setIsTakingPicture] = useState(false);
    const [pendingScanData, setPendingScanData] = useState(null);
    const [scanCooldown, setScanCooldown] = useState(0);
    const [outOfBoundsTimer, setOutOfBoundsTimer] = useState(0);
    const [locationEnabled, setLocationEnabled] = useState(true);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const cameraRef = useRef(null);
    const cooldownRef = useRef(null);
    const outOfBoundsIntervalRef = useRef(null);
    const locationSubscription = useRef(null);

    useEffect(() => {
        fetchData();
        setupLocationTracking();

        const getSubGreetingText = () => {
            const hour = new Date().getHours();
            if (hour >= 5 && hour < 12) {
                const options = [
                    "Good morning! Ready to make today productive?",
                    "Early start, nice! Let's get those hours in.",
                    "A new day, a new opportunity to serve."
                ];
                return options[Math.floor(Math.random() * options.length)];
            }
            if (hour >= 12 && hour < 17) {
                const options = [
                    "Good afternoon! How's your service going?",
                    "Keep up the great work today.",
                    "Another step closer to completing your hours."
                ];
                return options[Math.floor(Math.random() * options.length)];
            }
            if (hour >= 17 && hour < 22) {
                const options = [
                    "Good evening! Still making progress?",
                    "The day isn't over yet. Keep going!",
                    "Finishing strong today?"
                ];
                return options[Math.floor(Math.random() * options.length)];
            }
            const options = [
                "Working late? Your dedication is showing.",
                "Burning the midnight oil, huh?",
                "Late-night grind detected.",
                "Most people are asleep. You're still making progress.",
                "Don't forget to rest after your shift.",
                "The stars are out, and so are your service hours."
            ];
            return options[Math.floor(Math.random() * options.length)];
        };
        setSubGreeting(getSubGreetingText());

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
                api.get('/violations/'),
                api.get('/etickets/')
            ]);
            const studentViolations = Array.isArray(violationRes.data)
                ? violationRes.data.filter(v => v.student_details?.student_id === user.username)
                : [];
            const studentTickets = Array.isArray(ticketRes.data)
                ? ticketRes.data.filter(t => t.violation_details?.student_details?.student_id === user.username)
                : [];
            setViolations(studentViolations);
            setTickets(studentTickets);
            const activeTicket = studentTickets.find(t =>
                (t.status === 'Active' || t.status === 'Ongoing')
            );
            if (activeTicket) {
                setRequiredSeconds(Math.floor((activeTicket.total_hours_required || 0) * 3600));
                setTargetLocation({
                    lat: parseFloat(activeTicket.station?.lat || 8.4859),
                    lng: parseFloat(activeTicket.station?.lng || 124.6567),
                    radius: parseFloat(activeTicket.station?.radius || 50)
                });

                if (activeTicket.timelogs?.length > 0) {
                    let pastSeconds = 0;
                    activeTicket.timelogs.forEach(log => {
                        if (log.time_in && log.time_out) {
                            pastSeconds += (new Date(log.time_out).getTime() - new Date(log.time_in).getTime()) / 1000;
                        }
                    });
                    setPreviouslyRendered(Math.floor(pastSeconds));

                    const openLog = activeTicket.timelogs.find(l => !l.time_out);
                    if (openLog) {
                        setTimerActive(true);
                        setStartTime(openLog.time_in);

                        const sinceStart = Math.floor((Date.now() - new Date(openLog.time_in).getTime()) / 1000);
                        setElapsedSeconds(Math.floor(pastSeconds + sinceStart));

                        const elapsedSinceIn = Math.floor((Date.now() - new Date(openLog.time_in).getTime()) / 1000);
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
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOutOfBounds && timerActive) {
            if (!outOfBoundsIntervalRef.current) {
                outOfBoundsIntervalRef.current = setInterval(() => {
                    setOutOfBoundsTimer(prev => {
                        if (prev >= 20) return 20;
                        return prev + 1;
                    });
                }, 1000);
            }
        } else {
            if (outOfBoundsIntervalRef.current) {
                clearInterval(outOfBoundsIntervalRef.current);
                outOfBoundsIntervalRef.current = null;
            }
            setOutOfBoundsTimer(0);
        }

        return () => {
            if (outOfBoundsIntervalRef.current) {
                clearInterval(outOfBoundsIntervalRef.current);
                outOfBoundsIntervalRef.current = null;
            }
        };
    }, [isOutOfBounds, timerActive]);

    useEffect(() => {
        const checkLocationActive = async () => {
            try {
                const enabled = await Location.hasServicesEnabledAsync();
                const { status } = await Location.getForegroundPermissionsAsync();
                const isActive = enabled && status === 'granted';
                setLocationEnabled(isActive);
                if (!isActive) {
                    setIsOutOfBounds(true);
                }
            } catch (e) {
                setLocationEnabled(false);
                setIsOutOfBounds(true);
                console.log(e);
            }
        };

        checkLocationActive();
        const interval = setInterval(checkLocationActive, 1500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!timerActive) return;

        const tickInterval = setInterval(() => {
            if (locationEnabled && !isOutOfBounds) {
                setElapsedSeconds(prev => prev + 1);
            }
        }, 1000);

        return () => clearInterval(tickInterval);
    }, [timerActive, locationEnabled, isOutOfBounds]);

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
            setLocation(loc.coords);
            locationSubscription.current = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 0 },
                (newLoc) => {
                    setLocation(newLoc.coords);
                    checkGeofence(newLoc.coords);
                }
            );
        } catch (e) {
            console.log('Location setup failed silently:', e.message);
        }
    };

    const checkGeofence = (coords) => {
        if (!targetLocation || !timerActive) return;
        const dist = getDistance(coords.latitude, coords.longitude, targetLocation.lat, targetLocation.lng);
        setCurrentDistance(dist);
        setIsOutOfBounds(dist > targetLocation.radius);
    };

    const handleBarCodeScanned = async ({ type, data }) => {
        setIsScanning(false);
        let action = 'in';
        let parsedData = {};
        try {
            parsedData = JSON.parse(data);
            action = parsedData.action || 'in';
        } catch (e) {
            action = timerActive ? 'out' : 'in';
        }
        if (!parsedData.eticket_id) {
            const activeTicket = tickets.find(t => t.status === 'Active' || t.status === 'Ongoing');
            if (activeTicket) {
                parsedData.eticket_id = activeTicket.id;
            } else {
                Alert.alert('Error', "You don't have any active service tickets.");
                return;
            }
        }
        setPendingScanData({ action, parsedData });
        setTimeout(() => {
            setIsTakingPicture(true);
        }, 600);
    };

    const submitLog = async (actionType, scannedData, photoBase64) => {
        if (!scannedData) return;
        setLoading(true);
        try {
            await api.post('/timelogs/log_time/', {
                eticket_id: scannedData.eticket_id,
                action: actionType,
                lat: location?.latitude,
                lng: location?.longitude,
                radius: 50,
                photo_proof: photoBase64 ? `data:image/jpeg;base64,${photoBase64}` : null
            });
            if (actionType === 'in') {
                setTimerActive(true);
                setStartTime(Date.now());
                setPreviouslyRendered(0);
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
                Alert.alert('Success', 'Timer Started!');
                setTimeout(() => fetchData(), 2000);
            } else {
                setTimerActive(false);
                setStartTime(null);
                setScanCooldown(0);
                if (cooldownRef.current) clearInterval(cooldownRef.current);
                Alert.alert('Success', 'Timer Stopped!');
                fetchData();
            }
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to log time');
        } finally {
            setLoading(false);
        }
    };

    const startScan = async () => {
        const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
        if (locStatus !== 'granted') {
            Alert.alert('Location Required', 'Please enable location permissions to scan the QR code.');
            return;
        }

        const isLocationEnabled = await Location.hasServicesEnabledAsync();
        if (!isLocationEnabled) {
            Alert.alert('Location Disabled', 'Please turn on your device location to scan the QR code.');
            return;
        }

        if (!location) {
            try {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                setLocation(loc.coords);
                locationSubscription.current = await Location.watchPositionAsync(
                    { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 0 },
                    (newLoc) => {
                        setLocation(newLoc.coords);
                        checkGeofence(newLoc.coords);
                    }
                );
            } catch (e) {
                Alert.alert('Location Error', 'Unable to fetch your current location. Please try again.');
                return;
            }
        }

        if (!cameraPermission?.granted) {
            const { status } = await requestCameraPermission();
            if (status !== 'granted') {
                Alert.alert('Camera permission is required to scan QR codes');
                return;
            }
        }
        setIsScanning(true);
    };

    const capturePhoto = async () => {
        if (!cameraRef.current || loading) return;
        try {
            setLoading(true);
            const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
            setIsTakingPicture(false);
            await new Promise(resolve => setTimeout(resolve, 300));
            if (pendingScanData) {
                await submitLog(pendingScanData.action, pendingScanData.parsedData, photo.base64);
                setPendingScanData(null);
            }
        } catch (e) {
            Alert.alert('Capture Error', 'Failed to take photo. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const displayName = user?.name?.split(' ')[0] || user?.username || 'User';

    return (
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
                        <Text style={styles.greeting}>{getGreeting()}</Text>
                        <Text style={styles.userName}>Hi, {displayName}!</Text>
                        <Text style={styles.subGreeting}>{subGreeting}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/settings')}>
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
                                <MapView
                                    style={styles.map}
                                    region={{
                                        latitude: targetLocation ? targetLocation.lat : 8.4859,
                                        longitude: targetLocation ? targetLocation.lng : 124.6567,
                                        latitudeDelta: 0.0015,
                                        longitudeDelta: 0.0015,
                                    }}
                                    scrollEnabled={false}
                                    zoomEnabled={false}
                                    pitchEnabled={false}
                                    rotateEnabled={false}
                                    showsUserLocation={false}
                                    customMapStyle={isDarkMode ? darkMapStyle : []}
                                >
                                    <Circle
                                        center={{
                                            latitude: targetLocation ? targetLocation.lat : 8.4859,
                                            longitude: targetLocation ? targetLocation.lng : 124.6567,
                                        }}
                                        radius={targetLocation ? targetLocation.radius : 50}
                                        fillColor={isOutOfBounds ? 'rgba(220,38,38,0.06)' : 'rgba(5,150,105,0.08)'}
                                        strokeColor={isOutOfBounds ? '#dc2626' : '#059669'}
                                        strokeWidth={3}
                                    />
                                    <Marker
                                        coordinate={{
                                            latitude: targetLocation ? targetLocation.lat : 8.4859,
                                            longitude: targetLocation ? targetLocation.lng : 124.6567,
                                        }}
                                        title="Service Hub"
                                    >
                                        <View style={styles.hubMarkerDot} />
                                    </Marker>
                                    {location && (
                                        <Marker
                                            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
                                            title="You are here"
                                        >
                                            <View style={[
                                                styles.studentMarkerDot,
                                                { backgroundColor: isOutOfBounds ? '#ef4444' : '#10b981' }
                                            ]} />
                                        </Marker>
                                    )}
                                </MapView>
                                <View style={styles.mapLegend}>
                                    <View style={styles.mapLegendItem}>
                                        <View style={[styles.mapLegendDot, { backgroundColor: '#1e3a8a' }]} />
                                        <Text style={styles.mapLegendText}>Hub</Text>
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
                                        <Text style={styles.redWarningTimerText}>{outOfBoundsTimer}</Text>
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
                                                Enable location services to resume timer!
                                            </Text>
                                        </View>
                                    </View>
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
                            <Text style={styles.noSessionSubtitle}>
                                Scan an activity QR code to start{'\n'}tracking your community service hours.
                            </Text>
                            <TouchableOpacity style={styles.scanCta} onPress={startScan}>
                                <Text style={styles.scanCtaText}>Scan QR Code</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* E-Tickets */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>E-Tickets</Text>
                    <Text style={styles.sectionSubtitle}>Your violation tickets</Text>

                    {loading ? (
                        <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
                    ) : tickets.length === 0 ? (
                        <View style={styles.emptyLogs}>
                            <FileText size={32} color={colors.border} />
                            <Text style={styles.emptyLogsText}>No tickets found</Text>
                        </View>
                    ) : (
                        tickets.map((ticket, idx) => (
                            <View key={ticket.id || idx} style={styles.logRow}>
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
                            </View>
                        ))
                    )}
                </View>

                {/* Bottom padding */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* QR Scanner Modal */}
            <Modal visible={isScanning} animationType="slide" transparent={false}>
                <View style={styles.scannerContainer}>
                    <CameraView
                        style={StyleSheet.absoluteFillObject}
                        facing="back"
                        onBarcodeScanned={handleBarCodeScanned}
                        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    />
                    <View style={styles.scannerOverlay}>
                        <Text style={styles.scannerText}>Scan the Hub QR Code</Text>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setIsScanning(false)}>
                            <X size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Take Picture Modal */}
            <Modal visible={isTakingPicture} animationType="slide" transparent={false}>
                <View style={styles.cameraContainer}>
                    <CameraView
                        ref={cameraRef}
                        style={StyleSheet.absoluteFillObject}
                        facing="front"
                    />
                    <TouchableOpacity
                        style={styles.cameraCloseButton}
                        onPress={() => setIsTakingPicture(false)}
                    >
                        <X size={22} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.cameraLabelContainer}>
                        <Text style={styles.cameraText}>Take a real-time photo</Text>
                    </View>
                    <View style={styles.cameraBottomBar}>
                        <TouchableOpacity style={styles.captureButton} onPress={capturePhoto}>
                            <View style={styles.captureInner} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
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
    },
    userName: {
        fontSize: 24,
        fontWeight: '900',
        color: colors.text,
        letterSpacing: 0.5,
    },
    subGreeting: {
        fontSize: 14,
        color: colors.textMuted,
        fontWeight: '600',
        marginTop: 4,
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
    timerContainer: {
        marginVertical: 8,
    },
    timerText: {
        fontSize: 52,
        fontWeight: '900',
        color: colors.text,
        fontVariant: ['tabular-nums'],
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
    },
    noSessionSubtitle: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: '500',
        lineHeight: 20,
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
    },
    sectionSubtitle: {
        fontSize: 14,
        color: colors.textMuted,
        fontWeight: '500',
        marginBottom: 16,
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
    },
    logTime: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 2,
    },
    logTimeSmall: {
        fontSize: 10,
        color: colors.textMuted,
        marginTop: 2,
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
    scannerContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    scannerOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    scannerText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        position: 'absolute',
        top: 100,
    },
    closeButton: {
        position: 'absolute',
        top: 56,
        right: 20,
        padding: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 24,
    },
    cameraContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    cameraCloseButton: {
        position: 'absolute',
        top: 56,
        right: 20,
        padding: 12,
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: 24,
    },
    cameraLabelContainer: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    cameraText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 16,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    cameraBottomBar: {
        position: 'absolute',
        bottom: 60,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureButton: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#fff',
    },
    captureInner: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: '#fff',
    },
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
