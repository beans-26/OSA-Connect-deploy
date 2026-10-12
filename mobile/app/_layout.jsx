import { Stack } from 'expo-router';
import { AuthProvider } from '../components/AuthContext';
import { ThemeProvider, useTheme } from '../components/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { useAutoUpdate } from '../components/useAutoUpdate';
import { useState } from 'react';
import { View } from 'react-native';
import LogoIntro from '../components/LogoIntro';
import { useStudentActivityGuard, markActivity } from '../components/useStudentActivityGuard';
// Registers the background location task at startup (Android can wake it without the UI)
import '../components/backgroundTracking';

function RootContent() {
    const { isDarkMode, colors } = useTheme();
    useAutoUpdate();
    useStudentActivityGuard();
    // The opening logo animation, over the app while the first screen (usually the login) loads under it
    const [introShown, setIntroShown] = useState(true);
    return (
        // Sees every touch (without taking it) so the student inactivity timeout knows the app is in use
        <View style={{ flex: 1 }} onStartShouldSetResponderCapture={() => { markActivity(); return false; }}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />
            {/* Native stack so moving between screens animates instead of jumping */}
            <Stack
                screenOptions={{
                    headerShown: false,
                    // No screen transitions in the app: only the opening logo animates
                    animation: 'none',
                    contentStyle: { backgroundColor: colors.background },
                }}
            >
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
                <Stack.Screen name="student" />
                <Stack.Screen name="staff" />
            </Stack>
            {introShown && <LogoIntro onDone={() => setIntroShown(false)} />}
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
