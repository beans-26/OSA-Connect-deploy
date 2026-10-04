import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QrScannerView from '../../components/QrScannerView';
import { emitCameraResult, clearCameraResult } from '../../components/cameraResults';
import { parseServiceQr, serviceQrAction, NOT_A_START_QR, NOT_A_STOP_QR } from '../../components/serviceQr';

// Student hub-QR scanner, opened from the dashboard as its own full-screen screen
// (a CameraView inside a Modal or overlay didn't render on iPhone).
export default function StudentScanScreen() {
    const router = useRouter();
    const { mode } = useLocalSearchParams();
    const ending = mode === 'end';

    return (
        <QrScannerView
            title={ending ? 'Scan to End Service' : 'Scan the Hub QR Code'}
            subtitle={ending ? "Scan your service site's QR code" : 'Scan the QR code posted at your service site'}
            accent={ending ? '#ef4444' : '#60a5fa'}
            // Only service site codes; other QRs are rejected on the spot and scanning continues
            validate={(data) => {
                if (serviceQrAction(parseServiceQr(data), ending)) return null;
                return ending ? NOT_A_STOP_QR : NOT_A_START_QR;
            }}
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
