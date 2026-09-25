import { Stack } from 'expo-router';
import { AuthProvider } from '../components/AuthContext';
import { ThemeProvider, useTheme } from '../components/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { useAutoUpdate } from '../components/useAutoUpdate';

function RootContent() {
    const { isDarkMode, colors } = useTheme();
    useAutoUpdate();
    return (
        <>
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
        </>
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
