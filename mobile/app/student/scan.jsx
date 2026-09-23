import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QrScannerView from '../../components/QrScannerView';
import { emitCameraResult, clearCameraResult } from '../../components/cameraResults';

// Student hub-QR scanner, opened from the dashboard as its own full-screen screen
// (a CameraView inside a Modal or overlay didn't render on iPhone).
export default function StudentScanScreen() {
    const router = useRouter();
    const { mode } = useLocalSearchParams();
    const ending = mode === 'end';

    return (
        <QrScannerView
            title={ending ? 'Scan to End Service' : 'Scan the Hub QR Code'}
            subtitle={ending ? 'Scan the OSA stop code to end your session' : 'Start your community service session'}
            accent={ending ? '#ef4444' : '#60a5fa'}
            onScanned={(result) => {
                router.back();
                emitCameraResult('scan', result);
            }}
            onClose={() => {
                clearCameraResult('scan');
                router.back();
            }}
        />
    );
}
