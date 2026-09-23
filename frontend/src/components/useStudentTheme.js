import { useState, useEffect } from 'react';

// Mirrors mobile/components/ThemeContext.jsx: 'system' | 'light' | 'dark', saved under 'themeMode'
const readMode = () => {
    try {
        return localStorage.getItem('themeMode') || 'system';
    } catch {
        return 'system';
    }
};

const systemPrefersDark = () =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export const useStudentTheme = () => {
    const [themeMode, setThemeMode] = useState(readMode);
    const [systemDark, setSystemDark] = useState(systemPrefersDark);

    useEffect(() => {
        const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
        if (!mq) return;
        const onChange = (e) => setSystemDark(e.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    const changeTheme = (mode) => {
        setThemeMode(mode);
        try {
            localStorage.setItem('themeMode', mode);
        } catch {
            // Preference just won't persist
        }
    };

    const isDarkMode = themeMode === 'system' ? systemDark : themeMode === 'dark';
    return { isDarkMode, themeMode, changeTheme };
};
