import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Image } from 'react-native';
import { Shield, Clock, Scan, AlertTriangle, Play, X, MapPin, Camera as CameraIcon } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import MapView, { Marker, Circle } from 'react-native-maps';
import { useAuth } from '../../components/AuthContext';
import { Colors } from '../../constants/Colors';
import api from '../../services/api';

// Haversine formula to calculate distance in meters
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180; // φ, λ in radians
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // in metres
};

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

    return <Text style={styles.timerText}>{formatTime(elapsed)}</Text>;
};

export default function Dashboard() {
    const { user } = useAuth();
    const [violations, setViolations] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isScanning, setIsScanning] = useState(false);
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [scannedData, setScannedData] = useState(null);

    const [timerActive, setTimerActive] = useState(false);
    const [startTime, setStartTime] = useState(null);
    
    // Geolocation
    const [location, setLocation] = useState(null);
    const [targetLocation, setTargetLocation] = useState(null);
    const [isOutOfBounds, setIsOutOfBounds] = useState(false);
    const [currentDistance, setCurrentDistance] = useState(0);
    const locationSubscription = useRef(null);
    
    useEffect(() => {
        fetchData();
        setupLocationTracking();
        
        return () => {
            if (locationSubscription.current) {
                locationSubscription.current.remove();
            }
        };
    }, []);

    const fetchData = async () => {
        if (!user?.username) return;
        try {
            const [violationRes, ticketRes] = await Promise.all([
                api.get(`/violations/`),
                api.get(`/etickets/`)
            ]);
            
            // Filter by student ID on the client side since there is no nested route
            const studentViolations = Array.isArray(violationRes.data) 
                ? violationRes.data.filter(v => v.student_details?.student_id === user.username)
                : [];
                
            const studentTickets = Array.isArray(ticketRes.data)
                ? ticketRes.data.filter(t => t.violation_details?.student_details?.student_id === user.username)
                : [];

            setViolations(studentViolations);
            setTickets(studentTickets);
            
            // If there's an active ticket, set up the target location
            const activeTicket = studentTickets.find(t => t.status === 'Active' && t.timelogs?.some(l => !l.time_out));
            if (activeTicket) {
                setTimerActive(true);
                // Find the open log to get start time
                const openLog = activeTicket.timelogs.find(l => !l.time_out);
                if (openLog) setStartTime(openLog.time_in);
                
                // Assuming ticket has lat/lng or we use a default hub location
                setTargetLocation({
                    lat: parseFloat(activeTicket.station?.lat || 8.4859),
                    lng: parseFloat(activeTicket.station?.lng || 124.6567),
                    radius: parseFloat(activeTicket.station?.radius || 50)
                });
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    const setupLocationTracking = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission to access location was denied');
            return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);

        locationSubscription.current = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.High,
                timeInterval: 5000,
                distanceInterval: 5,
            },
            (newLoc) => {
                setLocation(newLoc.coords);
                checkGeofence(newLoc.coords);
            }
        );
    };

    const checkGeofence = (coords) => {
        if (!targetLocation || !timerActive) return;
        
        const dist = getDistance(coords.latitude, coords.longitude, targetLocation.lat, targetLocation.lng);
        setCurrentDistance(dist);
        
        if (dist > targetLocation.radius) {
            setIsOutOfBounds(true);
            // On web it triggers a countdown warning. MVP: just show alert if it just happened
        } else {
            setIsOutOfBounds(false);
        }
    };

    const handleBarCodeScanned = async ({ type, data }) => {
        setIsScanning(false);
        let action = 'in';
        let parsedData = {};

        try {
            parsedData = JSON.parse(data);
            action = parsedData.action || 'in';
        } catch (e) {
            // If it's plain text, we just treat it as a generic scan
            action = timerActive ? 'out' : 'in';
        }
        
        // If the QR code didn't contain an eticket_id, automatically use their active ticket!
        if (!parsedData.eticket_id) {
            const activeTicket = tickets.find(t => t.status === 'Active' || t.status === 'Ongoing');
            if (activeTicket) {
                parsedData.eticket_id = activeTicket.id;
            } else {
                Alert.alert("Error", "You don't have any active service tickets.");
                return;
            }
        }

        await submitLog(action, parsedData);
    };

    const submitLog = async (actionType, scannedData) => {
        if (!scannedData) return;

        setLoading(true);
        try {
            await api.post('/timelogs/log_time/', {
                eticket_id: scannedData.eticket_id,
                action: actionType,
                lat: location?.latitude,
                lng: location?.longitude,
                radius: 50, // default radius
                photo_proof: null // Selfie step removed as requested
            });

            if (actionType === 'in') {
                setTimerActive(true);
                setStartTime(Date.now());
                Alert.alert('Success', 'Timer Started!');
            } else {
                setTimerActive(false);
                setStartTime(null);
                Alert.alert('Success', 'Timer Stopped!');
            }
            fetchData(); // Refresh data
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to start timer');
        } finally {
            setLoading(false);
        }
    };

    const startScan = async () => {
        if (!cameraPermission?.granted) {
            const { status } = await requestCameraPermission();
            if (status !== 'granted') {
                Alert.alert('Camera permission is required to scan QR codes');
                return;
            }
        }
        setIsScanning(true);
    };

    if (loading && !violations.length) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    const activeTickets = tickets.filter(t => t.status === 'Active');

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                {/* Header Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Shield size={24} color={Colors.danger} />
                        <Text style={styles.statValue}>{violations.length}</Text>
                        <Text style={styles.statLabel}>Violations</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Clock size={24} color={Colors.primary} />
                        <Text style={styles.statValue}>{activeTickets.length}</Text>
                        <Text style={styles.statLabel}>Active Services</Text>
                    </View>
                </View>

                {/* Live Tracking Card */}
                {timerActive && (
                    <View style={[styles.card, isOutOfBounds ? styles.cardWarning : null]}>
                        <View style={styles.cardHeader}>
                            <Play size={18} color={isOutOfBounds ? Colors.danger : Colors.success} />
                            <Text style={[styles.cardTitle, isOutOfBounds && {color: Colors.danger}]}>Live Community Service</Text>
                        </View>
                        
                        <View style={styles.timerContainer}>
                            <LiveTimer startTime={startTime} />
                            {isOutOfBounds && (
                                <View style={styles.warningBox}>
                                    <AlertTriangle size={16} color={Colors.danger} />
                                    <Text style={styles.warningText}>Return to designated area! ({Math.round(currentDistance)}m away)</Text>
                                </View>
                            )}
                        </View>

                        {/* Map View */}
                        {location && (
                            <View style={styles.mapContainer}>
                                <MapView 
                                    style={styles.map}
                                    initialRegion={{
                                        latitude: targetLocation?.lat || location.latitude,
                                        longitude: targetLocation?.lng || location.longitude,
                                        latitudeDelta: 0.005,
                                        longitudeDelta: 0.005,
                                    }}
                                >
                                    <Marker coordinate={location} title="You" />
                                    {targetLocation && (
                                        <>
                                            <Marker 
                                                coordinate={{latitude: targetLocation.lat, longitude: targetLocation.lng}} 
                                                title="Service Hub"
                                                pinColor={Colors.primary}
                                            />
                                            <Circle 
                                                center={{latitude: targetLocation.lat, longitude: targetLocation.lng}}
                                                radius={targetLocation.radius}
                                                fillColor="rgba(30, 58, 138, 0.2)"
                                                strokeColor={Colors.primary}
                                                strokeWidth={2}
                                            />
                                        </>
                                    )}
                                </MapView>
                            </View>
                        )}
                    </View>
                )}

                {/* Actions */}
                <TouchableOpacity style={styles.scanButton} onPress={startScan}>
                    <Scan size={24} color="#fff" style={{marginRight: 8}}/>
                    <Text style={styles.scanButtonText}>
                        {timerActive ? 'Scan to End Service' : 'Scan to Start Service'}
                    </Text>
                </TouchableOpacity>

                {/* Tickets List */}
                <Text style={styles.sectionTitle}>Your Tickets</Text>
                {tickets.length === 0 ? (
                    <Text style={styles.emptyText}>No service tickets available.</Text>
                ) : (
                    tickets.map(ticket => (
                        <View key={ticket.id} style={styles.ticketCard}>
                            <Text style={styles.ticketId}>{ticket.id}</Text>
                            <Text style={styles.ticketStatus}>{ticket.status}</Text>
                            <Text style={styles.ticketDetails}>Required: {ticket.required_hours} hours</Text>
                        </View>
                    ))
                )}

            </ScrollView>

            {/* QR Scanner Modal */}
            <Modal visible={isScanning} animationType="slide" transparent={false}>
                <View style={styles.scannerContainer}>
                    <CameraView
                        style={StyleSheet.absoluteFillObject}
                        facing="back"
                        onBarcodeScanned={handleBarCodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ["qr"],
                        }}
                    />
                    <View style={styles.scannerOverlay}>
                        <Text style={styles.scannerText}>Scan the Hub QR Code</Text>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setIsScanning(false)}>
                            <X size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.card,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        marginHorizontal: 4,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
        marginVertical: 8,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: Colors.textMuted,
        textTransform: 'uppercase',
    },
    card: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: Colors.border,
    },
    cardWarning: {
        borderColor: Colors.danger,
        backgroundColor: '#fef2f2',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: Colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginLeft: 12,
    },
    timerContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    timerText: {
        fontSize: 48,
        fontWeight: '900',
        color: Colors.success,
        fontVariant: ['tabular-nums'],
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fee2e2',
        padding: 8,
        borderRadius: 8,
        marginTop: 8,
    },
    warningText: {
        color: Colors.danger,
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    mapContainer: {
        height: 200,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    scanButton: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    scanButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.text,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
    emptyText: {
        color: Colors.textMuted,
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 24,
    },
    ticketCard: {
        backgroundColor: Colors.card,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: 8,
    },
    ticketId: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    ticketStatus: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.accent,
        marginTop: 4,
    },
    ticketDetails: {
        fontSize: 12,
        color: Colors.textMuted,
        marginTop: 8,
    },
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
        top: 40,
        right: 20,
        padding: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 24,
    },
    captureButton: {
        position: 'absolute',
        bottom: 50,
        width: 80,
        height: 80,
        backgroundColor: Colors.primary,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#fff',
    },
    previewContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    previewImage: {
        flex: 1,
        resizeMode: 'contain',
    },
    previewActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 24,
        paddingBottom: 40,
        backgroundColor: '#000',
    },
    primaryButton: {
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 8,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        textTransform: 'uppercase',
    },
});
