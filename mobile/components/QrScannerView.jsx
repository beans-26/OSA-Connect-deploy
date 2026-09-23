import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Platform, Vibration, useWindowDimensions, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, Zap, ZapOff } from 'lucide-react-native';

// Full-screen QR scanner shared by the student and staff screens.
// Same look as the website's QrScannerModal: dimmed surroundings, corner-bracket viewfinder,
// sweeping laser line, success flash, and a flashlight toggle.
// `validate(data)` is optional: return an error message to reject a code and keep scanning.
export default function QrScannerView({ title, subtitle, accent = '#60a5fa', onScanned, onClose, validate }) {
    const { width, height } = useWindowDimensions();
    const size = Math.min(width * 0.7, 280);
    const [torchOn, setTorchOn] = useState(false);
    const [detected, setDetected] = useState(false);
    const doneRef = useRef(false);
    const laser = useRef(new Animated.Value(0)).current;
    // Rendered as a full-screen layer (not a Modal), so clear the notch ourselves
    // and let Android's back button close the scanner
    const insets = useSafeAreaInsets();
    // Camera status shown on screen, so a blank preview on a real device explains itself
    const [permission] = useCameraPermissions();
    const [cameraReady, setCameraReady] = useState(false);
    const [mountError, setMountError] = useState(null);
    const [scanError, setScanError] = useState(null);
    const lastRejectRef = useRef({ data: null, at: 0 });
    const errorTimerRef = useRef(null);

    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            onClose();
            return true;
        });
        return () => sub.remove();
    }, [onClose]);

    useEffect(() => () => clearTimeout(errorTimerRef.current), []);

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(laser, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(laser, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [laser]);

    // CameraView reports the same code many times per second; only hand off the first one
    const handleScan = (result) => {
        if (doneRef.current) return;
        const error = validate?.(result.data);
        if (error) {
            // The same code is reported many times per second; react to it once every 2.5 s
            const now = Date.now();
            const last = lastRejectRef.current;
            if (last.data === result.data && now - last.at < 2500) return;
            lastRejectRef.current = { data: result.data, at: now };
            setScanError(error);
            if (Platform.OS !== 'web') Vibration.vibrate([0, 80, 80, 80]);
            clearTimeout(errorTimerRef.current);
            errorTimerRef.current = setTimeout(() => setScanError(null), 3000);
            return;
        }
        setScanError(null);
        doneRef.current = true;
        setDetected(true);
        if (Platform.OS !== 'web') Vibration.vibrate(60);
        setTimeout(() => onScanned(result), 350);
    };

    const frameColor = detected ? '#10b981' : scanError ? '#ef4444' : '#ffffff';
    const sideHeight = (height - size) / 2;
    const laserY = laser.interpolate({ inputRange: [0, 1], outputRange: [size * 0.08, size * 0.9] });

    return (
        <View style={styles.container}>
            {/* Sized with flex: 1 as in Expo's CameraView example; absolute fill left the iOS preview black */}
            <CameraView
                style={{ flex: 1 }}
                facing="back"
                enableTorch={torchOn}
                onBarcodeScanned={detected ? undefined : handleScan}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onCameraReady={() => setCameraReady(true)}
                onMountError={(e) => setMountError(e?.message || 'The camera could not start.')}
            />

            {/* Dimmed surroundings with a clear square in the middle */}
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <View style={[styles.dim, { height: sideHeight }]} />
                <View style={{ flexDirection: 'row', height: size }}>
                    <View style={[styles.dim, { flex: 1 }]} />
                    <View style={{ width: size, height: size }}>
                        {[
                            { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 28 },
                            { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 28 },
                            { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 28 },
                            { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 28 },
                        ].map((corner, i) => (
                            <View key={i} style={[styles.corner, corner, { borderColor: frameColor }]} />
                        ))}
                        {detected ? (
                            <View style={styles.detectedTint} />
                        ) : (
                            <Animated.View
                                style={[
                                    styles.laser,
                                    { backgroundColor: accent, shadowColor: accent, transform: [{ translateY: laserY }] },
                                ]}
                            />
                        )}
                    </View>
                    <View style={[styles.dim, { flex: 1 }]} />
                </View>
                <View style={[styles.dim, { flex: 1 }]} />
            </View>

            {/* Top bar */}
            <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.brand}>OSACONNECT SCANNER</Text>
                    <Text style={styles.title}>{title}</Text>
                    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                </View>
                <TouchableOpacity onPress={onClose} style={styles.roundButton} accessibilityLabel="Close scanner">
                    <X size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Bottom hint + flashlight */}
            <View style={[styles.bottomBar, { bottom: insets.bottom + 32 }]}>
                {mountError || (permission && !permission.granted) ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorTitle}>Camera unavailable</Text>
                        <Text style={styles.errorText}>
                            {mountError || 'Camera permission is off. Allow it in Settings > Expo Go > Camera, then reopen the scanner.'}
                        </Text>
                    </View>
                ) : scanError ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorTitle}>Invalid QR code</Text>
                        <Text style={styles.errorText}>{scanError}</Text>
                    </View>
                ) : (
                    <Text style={styles.hint}>
                        {detected ? 'QR code detected' : cameraReady ? 'Align the QR code inside the frame' : 'Starting camera…'}
                    </Text>
                )}
                {Platform.OS !== 'web' && (
                    <TouchableOpacity
                        onPress={() => setTorchOn((on) => !on)}
                        style={[styles.torchButton, torchOn && styles.torchButtonOn]}
                        accessibilityLabel={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
                    >
                        {torchOn ? <ZapOff size={22} color="#0f172a" /> : <Zap size={22} color="#fff" />}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    dim: {
        backgroundColor: 'rgba(2, 6, 23, 0.62)',
    },
    corner: {
        position: 'absolute',
        width: 48,
        height: 48,
    },
    laser: {
        position: 'absolute',
        left: 20,
        right: 20,
        height: 3,
        borderRadius: 2,
        shadowOpacity: 0.9,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
    },
    detectedTint: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 28,
        backgroundColor: 'rgba(52, 211, 153, 0.2)',
    },
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 44 : 56,
        gap: 16,
    },
    brand: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 2,
        lineHeight: 16,
    },
    title: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '900',
        marginTop: 4,
        lineHeight: 26,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        fontWeight: '500',
        marginTop: 4,
        lineHeight: 20,
    },
    roundButton: {
        padding: 12,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    bottomBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 48,
        alignItems: 'center',
        gap: 20,
        paddingHorizontal: 20,
    },
    errorBox: {
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        borderRadius: 14,
        padding: 14,
        maxWidth: 360,
    },
    errorTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '900',
        textAlign: 'center',
    },
    errorText: {
        color: '#fff',
        fontSize: 13,
        lineHeight: 18,
        marginTop: 4,
        textAlign: 'center',
    },
    hint: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    torchButton: {
        padding: 16,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    torchButtonOn: {
        backgroundColor: '#fbbf24',
    },
});
