import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';

// Light / dark switch for the admin pages (the `dark` class on <html>). Sits at the right end of each page's
// title row.
const ThemeToggle = ({ className = '' }) => {
    const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

    const toggle = () => {
        document.documentElement.classList.toggle('dark', !isDarkMode);
        setIsDarkMode(!isDarkMode);
    };

    return (
        <button
            onClick={toggle}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all ${
                isDarkMode
                    ? 'bg-ustp-blue/10 border border-ustp-blue/20 hover:bg-ustp-blue/20'
                    : 'bg-yellow-50 border border-yellow-200 hover:bg-yellow-100'
            } ${className}`}
        >
            {isDarkMode ? <Moon size={18} className="text-ustp-blue dark:text-blue-400" /> : <Sun size={20} className="text-yellow-500" />}
        </button>
    );
};

export default ThemeToggle;
