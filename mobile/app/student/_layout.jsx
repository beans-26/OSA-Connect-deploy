import { Stack } from 'expo-router';
import RequireRole from '../../components/RequireRole';
import { StudentShellProvider } from '../../components/StudentShell';

export default function StudentLayout() {
    return (
        <RequireRole roles={['student']}>
            {/* The side menu, top bar data and notifications shared by the student screens */}
            <StudentShellProvider>
                <Stack
                    screenOptions={{
                        headerShown: false,
                        animation: 'slide_from_right',
                    }}
                >
                    <Stack.Screen name="dashboard" />
                    {/* Switching between the side menu's screens: a quick fade instead of a full slide */}
                    <Stack.Screen name="settings" options={{ animation: 'fade_from_bottom' }} />
                    <Stack.Screen name="personal-info" options={{ animation: 'fade_from_bottom' }} />
                    <Stack.Screen name="notifications" options={{ animation: 'fade_from_bottom' }} />
                    <Stack.Screen name="change-password" />
                    {/* The scanner gets its own native full-screen screen; the dashboard stays mounted underneath */}
                    <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
                </Stack>
            </StudentShellProvider>
        </RequireRole>
    );
}
