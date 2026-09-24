import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '../constants/Colors';
import { useAuth } from './AuthContext';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const { user } = useAuth();
    const systemColorScheme = useColorScheme();
    // 'system', 'light', 'dark' — starts in light until the student picks something else in Settings
    const [themeMode, setThemeMode] = useState('light');
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem('themeMode');
                if (savedTheme) {
                    setThemeMode(savedTheme);
                }
            } catch (e) {
                console.log('Failed to load theme preference', e);
            }
        };
        loadTheme();
    }, []);

    useEffect(() => {
        if (themeMode === 'system') {
            setIsDarkMode(systemColorScheme === 'dark');
        } else {
            setIsDarkMode(themeMode === 'dark');
        }
    }, [themeMode, systemColorScheme]);

    const changeTheme = async (mode) => {
        setThemeMode(mode);
        try {
            await AsyncStorage.setItem('themeMode', mode);
        } catch (e) {
            console.log('Failed to save theme preference', e);
        }
    };

    // Dark mode is a student feature: signed-out screens (login, register, forgot password)
    // and staff/guard accounts always get the light theme
    const lightOnly = !user || user.role === 'staff' || user.role === 'guard';
    const dark = isDarkMode && !lightOnly;
    const colors = dark ? darkColors : lightColors;

    return (
        <ThemeContext.Provider value={{ isDarkMode: dark, themeMode, changeTheme, colors }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
