import React from 'react';
import Sidebar from '../../components/Sidebar';
import { ShieldCheck, AlertCircle } from 'lucide-react';

const ViolationInfo = () => {
    return (
        <div className="flex bg-slate-50 min-h-screen">
            <Sidebar role="student" />
            <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto mobile-top-spacer">
                <header className="mb-6 sm:mb-8 lg:mb-10">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Violation Information</h1>
                    <p className="text-slate-500 mt-1 font-medium text-sm sm:text-base">Review your record and university policies.</p>
                </header>

                <div className="card-premium py-14 sm:py-20 text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                        <ShieldCheck className="text-green-500" size={32} />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Everything looks good!</h2>
                    <p className="text-slate-400 mt-2 max-w-xs mx-auto text-sm sm:text-base px-4">
                        You have no recorded violations. Always follow the university dress code and carry your student ID at all times.
                    </p>
                </div>

                <div className="mt-6 sm:mt-8 lg:mt-10 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="card-premium">
                        <h4 className="font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                            <AlertCircle className="text-ustp-gold shrink-0" size={18} />
                            Dress Code Policy
                        </h4>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            Students must wear proper attire as per the Student Handbook. Avoid wearing slippers, shorts (unless for PE), and sleeveless shirts inside the campus.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ViolationInfo;
