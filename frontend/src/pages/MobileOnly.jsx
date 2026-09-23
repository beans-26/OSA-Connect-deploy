import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, ChevronLeft } from 'lucide-react';

// Students use OSAConnect only through the mobile app; the website is for OSA personnel.
const MobileOnly = () => {
    useEffect(() => {
        // Drop any student session left in this browser so no student page can load
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user.role === 'student') localStorage.removeItem('user');
        } catch {
            localStorage.removeItem('user');
        }
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="flex justify-center">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <div className="absolute -top-1 -left-1 w-4 h-3 bg-amber-400 rounded-tr-[4px] rounded-tl-[2px]" />
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight relative z-10 leading-none">OSA</h2>
                        </div>
                        <span className="text-xl font-bold text-blue-900">Connect</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 text-center">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-900">
                        <Smartphone size={30} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Please use the mobile app</h1>
                    <p className="mt-3 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                        Student accounts are available on the <span className="font-bold text-slate-700 dark:text-slate-300">OSAConnect mobile app</span> only.
                        Open the app on your phone and sign in with the same student ID and password to view your e-tickets and log your community service hours.
                    </p>
                    <p className="mt-4 text-xs font-medium text-slate-400 dark:text-slate-500">
                        This website is for OSA administrators, staff, and guards.
                    </p>
                    <Link
                        to="/login"
                        replace
                        className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-900 text-sm font-bold tracking-widest text-white hover:bg-slate-800 transition-colors"
                    >
                        <ChevronLeft size={16} /> Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default MobileOnly;
