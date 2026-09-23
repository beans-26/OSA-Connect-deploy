import React from 'react';
import { useRouter } from 'expo-router';
import QrScannerView from '../../components/QrScannerView';
import { emitCameraResult, clearCameraResult } from '../../components/cameraResults';
import { parseStudentQr, NOT_A_STUDENT_QR } from '../../components/studentQr';

// Guard/staff student-QR scanner, opened from the report form as its own full-screen screen
// (a CameraView inside a Modal or overlay didn't render on iPhone). The form stays mounted underneath.
export default function StaffScanScreen() {
    const router = useRouter();

    return (
        <QrScannerView
            title="Scan Student QR"
            subtitle="Scan the student's ID or OSAConnect QR code"
            // Only student ID codes; OSA action/location codes and other QRs are rejected on the spot
            validate={(data) => (parseStudentQr(data) ? null : NOT_A_STUDENT_QR)}
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
