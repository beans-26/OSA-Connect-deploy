import React from 'react';
import Sidebar from '../../components/Sidebar';
import { Clock, History } from 'lucide-react';

const TimeLogs = () => {
    return (
        <div className="flex bg-slate-50 min-h-screen">
            <Sidebar role="student" />
            <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto mobile-top-spacer">
                <header className="mb-6 sm:mb-8 lg:mb-10">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Time Logs</h1>
                    <p className="text-slate-500 mt-1 font-medium text-sm sm:text-base">Keep track of your community service hours.</p>
                </header>

                <div className="card-premium py-14 sm:py-20 text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                        <Clock className="text-slate-300" size={32} />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">No Active Service Logs</h2>
                    <p className="text-slate-400 mt-2 max-w-sm mx-auto font-medium text-sm sm:text-base px-4">
                        You have no current or past community service logs recorded in the system.
                    </p>
                </div>

                <div className="mt-6 sm:mt-8 border-t border-slate-100 pt-6 sm:pt-8 lg:pt-10">
                    <h3 className="font-extrabold text-slate-800 text-base sm:text-lg flex items-center gap-3 mb-6 sm:mb-8">
                        <History className="text-slate-300" size={22} />
                        Detailed Session History
                    </h3>
                    <div className="text-center py-14 sm:py-20 bg-slate-50/50 rounded-2xl sm:rounded-[32px] border-2 border-dashed border-slate-100">
                        <p className="text-slate-300 font-bold uppercase tracking-widest text-xs">No history to display</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TimeLogs;
