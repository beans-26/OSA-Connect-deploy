import React from 'react';
import Sidebar from '../../components/Sidebar';
import { History, Shield, Search, User } from 'lucide-react';

const ScanHistory = () => {
    return (
        <div className="flex bg-slate-50 min-h-screen">
            <Sidebar role="guard" />
            <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto overflow-y-auto mobile-top-spacer">
                <header className="mb-8 lg:mb-12 flex flex-col sm:flex-row justify-between sm:items-end gap-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">Scan History</h1>
                        <p className="text-slate-500 mt-1 sm:mt-2 font-medium text-sm sm:text-base">Review your recent activity and submitted violation reports.</p>
                    </div>
                </header>

                <div className="card-premium">
                    <div className="flex justify-between items-center mb-6 lg:mb-10 pb-4 lg:pb-6 border-b border-slate-50">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input
                                type="text"
                                placeholder="Search by Student ID or Name..."
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 pl-12 font-semibold text-sm outline-none focus:border-ustp-blue transition-all"
                            />
                        </div>
                    </div>

                    <div className="py-16 sm:py-24 text-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                            <History size={32} />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">No Scan History</h2>
                        <p className="text-slate-400 mt-2 max-w-sm mx-auto font-medium text-sm sm:text-base px-4">
                            You haven't submitted any reports or performed any scans yet for this duty period.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ScanHistory;
