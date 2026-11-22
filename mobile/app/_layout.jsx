import { Stack } from 'expo-router';
import { AuthProvider } from '../components/AuthContext';
import { ThemeProvider, useTheme } from '../components/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { useAutoUpdate } from '../components/useAutoUpdate';
import { useState } from 'react';
import { View } from 'react-native';
// Moves screens out of the keyboard's way (Android draws edge to edge, so the screen no longer shrinks for it)
import { KeyboardProvider } from 'react-native-keyboard-controller';
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
                <Stack.Screen name="welcome" />
                <Stack.Screen name="login" />
                <Stack.Screen name="student" />
                <Stack.Screen name="staff" />
                {/* Faculty without an account (the faculty login's "Report without an account") */}
                <Stack.Screen name="faculty-report" />
            </Stack>
            {introShown && <LogoIntro onDone={() => setIntroShown(false)} />}
        </View>
    );
}

export default function RootLayout() {
    return (
        <KeyboardProvider>
            <AuthProvider>
                <ThemeProvider>
                    <RootContent />
                </ThemeProvider>
            </AuthProvider>
        </KeyboardProvider>
    );
}
