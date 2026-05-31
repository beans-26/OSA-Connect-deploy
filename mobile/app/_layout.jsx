import { Slot } from 'expo-router';
import { AuthProvider } from '../components/AuthContext';
import { ThemeProvider, useTheme } from '../components/ThemeContext';
import { StatusBar } from 'expo-status-bar';

function RootContent() {
    const { isDarkMode } = useTheme();
    return (
        <>
            <StatusBar style={isDarkMode ? "light" : "dark"} />
            <Slot />
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
