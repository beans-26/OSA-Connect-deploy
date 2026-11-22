import { Stack } from 'expo-router';

// Faculty without an account (the faculty login's "Report without an account"): no login needed. The report form
// (app/staff/dashboard.jsx in publicFaculty mode) and its QR scanner. Same as the website's /faculty/report.
export default function FacultyReportLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
            <Stack.Screen name="index" />
            {/* Camera gets its own native full-screen screen; the report form stays mounted underneath */}
            <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'none' }} />
        </Stack>
    );
}
