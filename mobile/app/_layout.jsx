import { Slot } from 'expo-router';
import { AuthProvider } from '../components/AuthContext';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
    return (
        <AuthProvider>
            <StatusBar style="dark" />
            <Slot />
        </AuthProvider>
    );
}
