import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { showAlert } from '../../components/showAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView } from 'expo-camera';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { emitCameraResult, clearCameraResult } from '../../components/cameraResults';

// Front-camera proof photo for time-in / time-out. Opened as its own full-screen screen
// (a CameraView inside a Modal or overlay didn't render on iPhone).
export default function SelfieScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const cameraRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [capturing, setCapturing] = useState(false);
    const [mountError, setMountError] = useState(null);

    const close = () => {
        clearCameraResult('selfie');
        router.back();
    };

    const capture = async () => {
        if (!cameraRef.current || !ready || capturing) return;
        setCapturing(true);
        try {
            const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
            router.back();
            emitCameraResult('selfie', photo.base64);
        } catch {
            showAlert('Capture Error', 'Failed to take photo. Please try again.');
            setCapturing(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Sized with flex: 1 as in Expo's CameraView example; absolute fill left the iOS preview black */}
            <CameraView
                ref={cameraRef}
                style={{ flex: 1 }}
                facing="front"
                onCameraReady={() => setReady(true)}
                onMountError={(e) => setMountError(e?.message || 'The camera could not start.')}
            />
            <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
                <Text style={styles.title}>{mountError ? 'Camera unavailable' : ready ? 'Take a real-time photo' : 'Starting camera…'}</Text>
                <TouchableOpacity onPress={close} style={styles.closeButton} accessibilityLabel="Close camera">
                    <X size={22} color="#fff" />
                </TouchableOpacity>
            </View>
            {mountError && <Text style={styles.error}>{mountError}</Text>}
            <View style={[styles.bottomBar, { bottom: insets.bottom + 40 }]}>
                <TouchableOpacity
                    style={[styles.captureButton, (!ready || capturing) && { opacity: 0.4 }]}
                    onPress={capture}
                    disabled={!ready || capturing}
                    accessibilityLabel="Take photo"
                >
                    {capturing ? <ActivityIndicator color="#fff" /> : <View style={styles.captureInner} />}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    title: {
        flex: 1,
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    closeButton: {
        padding: 12,
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: 24,
    },
    error: {
        position: 'absolute',
        top: '45%',
        left: 24,
        right: 24,
        color: '#fff',
        textAlign: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        borderRadius: 14,
        padding: 14,
    },
    bottomBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
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
