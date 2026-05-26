import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace this with your computer's local IP address when testing on physical device
// Keep the port 8000 for Django development server
export const API_URL = 'https://osa-connect-deploy.vercel.app/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
