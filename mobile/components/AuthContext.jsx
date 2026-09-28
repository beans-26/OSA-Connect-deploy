import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { stopActiveSession } from './studentSession';
import { setLoginRejectedHandler } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUser();
        // The server no longer accepts the saved login: clear it and go to the login screen
        let handling = false;
        setLoginRejectedHandler(async () => {
            if (handling) return;
            handling = true;
            try {
                await AsyncStorage.removeItem('user');
                setUser(null);
                router.replace('/login');
            } finally {
                handling = false;
            }
        });
    }, []);

    const loadUser = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                setUser(JSON.parse(userData));
            }
        } catch (error) {
            console.error('Failed to load user data', error);
        } finally {
            setLoading(false);
        }
    };

    const login = async (userData) => {
        try {
            await AsyncStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            
            // Redirect based on role
            if (userData.role === 'student') {
                router.replace('/student/dashboard');
            } else if (userData.role === 'guard' || userData.role === 'staff') {
                router.replace('/staff/dashboard');
            } else {
                // If they manage to log in as admin, log them out
                alert('Admin login is not supported on mobile.');
                await logout();
            }
        } catch (error) {
            console.error('Failed to save user data', error);
        }
    };

    const logout = async (reason = 'logout') => {
        // A student's running service session stops at logout, on this phone and on the website
        // onPress={logout} passes the press event, not a reason
        if (user?.role === 'student') await stopActiveSession(user.username, typeof reason === 'string' ? reason : 'logout');
        try {
            await AsyncStorage.removeItem('user');
            setUser(null);
            router.replace('/login');
        } catch (error) {
            console.error('Failed to clear user data', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
