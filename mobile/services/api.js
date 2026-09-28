import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Every request carries the login token from /login/ (saved with the user), so the server knows who is
// asking and what they may do (backend/core/auth.py). This also covers the background location task.
api.interceptors.request.use(async (config) => {
    if (!String(config.url || '').includes('/login/')) {
        try {
            const token = JSON.parse((await AsyncStorage.getItem('user')) || 'null')?.token;
            if (token) config.headers.Authorization = `Bearer ${token}`;
        } catch {
            // No saved login: the request goes without one
        }
    }
    return config;
});

// The server refused the saved login (expired, password changed, account disabled): AuthContext
// registers a handler that logs out and returns to the login screen
let onLoginRejected = null;
export const setLoginRejectedHandler = (handler) => {
    onLoginRejected = handler;
};
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && !String(error.config?.url || '').includes('/login/')) onLoginRejected?.();
        return Promise.reject(error);
    }
);

export default api;
