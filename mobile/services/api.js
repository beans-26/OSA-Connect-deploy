import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Same Django backend the website uses (the website reaches it through Vite's /api proxy).
// Override with EXPO_PUBLIC_API_URL (e.g. a deployed URL); otherwise use the dev machine's host:
// - web: the host serving this page
// - phone/emulator: the LAN IP Expo was started from (127.0.0.1 would point at the phone itself)
const resolveApiUrl = () => {
    if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        return `${window.location.protocol}//${window.location.hostname}:8000/api`;
    }
    const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
    return `http://${devHost || '127.0.0.1'}:8000/api`;
};

export const API_URL = resolveApiUrl();

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
