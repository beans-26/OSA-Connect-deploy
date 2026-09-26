import { Stack } from 'expo-router';
import { AuthProvider } from '../components/AuthContext';
import { ThemeProvider, useTheme } from '../components/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { useAutoUpdate } from '../components/useAutoUpdate';
import { View } from 'react-native';
import { useStudentActivityGuard, markActivity } from '../components/useStudentActivityGuard';

function RootContent() {
    const { isDarkMode, colors } = useTheme();
    useAutoUpdate();
    useStudentActivityGuard();
    return (
        // Sees every touch (without taking it) so the student inactivity timeout knows the app is in use
        <View style={{ flex: 1 }} onStartShouldSetResponderCapture={() => { markActivity(); return false; }}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />
            {/* Native stack so moving between screens animates instead of jumping */}
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    contentStyle: { backgroundColor: colors.background },
                }}
            >
                {/* Logging in/out swaps the whole app, so a soft fade reads better than a slide */}
                <Stack.Screen name="index" options={{ animation: 'fade' }} />
                <Stack.Screen name="login" options={{ animation: 'fade' }} />
                <Stack.Screen name="student" options={{ animation: 'fade' }} />
                <Stack.Screen name="staff" options={{ animation: 'fade' }} />
            </Stack>
        </View>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <RootContent />
            </ThemeProvider>
        </AuthProvider>
    );
}
