import { Stack } from 'expo-router';
import RequireRole from '../../components/RequireRole';
import { ReporterShellProvider } from '../../components/ReporterShell';

// Guards and faculty & staff: three tabs at the bottom (Analytics, Home = the report form, Profile), same as the
// website's guard / faculty pages. The tab bar and the "Log out?" question live in components/ReporterShell.jsx.
export default function StaffLayout() {
    return (
        <RequireRole roles={['staff', 'guard']}>
            <ReporterShellProvider>
                <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
                    <Stack.Screen name="dashboard" />
                    <Stack.Screen name="analytics" />
                    <Stack.Screen name="profile" />
                    {/* Camera gets its own native full-screen screen; the report form stays mounted underneath */}
                    <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'none' }} />
                </Stack>
            </ReporterShellProvider>
        </RequireRole>
    );
}
