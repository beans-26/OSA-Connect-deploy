import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '../constants/Colors';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [themeMode, setThemeMode] = useState('system'); // 'system', 'light', 'dark'
    const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');

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

    const colors = isDarkMode ? darkColors : lightColors;

    return (
        <ThemeContext.Provider value={{ isDarkMode, themeMode, changeTheme, colors }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
