import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { Shield, Scan, Send, AlertCircle, CheckCircle2, User, UserPlus, ClipboardList } from 'lucide-react';

const GuardDashboard = () => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        studentId: '',
        name: '',
        course: '',
        department: '',
        contact: '',
        email: '',
        violation: '',
        description: ''
    });

    const handleScan = () => {
        setLoading(true);
        setTimeout(() => {
            setForm({
                ...form,
                studentId: '2022-300123',
                name: 'Vince User',
                course: 'BSIT',
                department: 'CEA',
                contact: '0917-XXX-XXXX',
                email: 'vince@example.com'
            });
            setLoading(false);
        }, 1500);
    };

    const handleIdChange = (e) => {
        const id = e.target.value;
        setForm({ ...form, studentId: id });

        if (id.length >= 8) {
            setForm(prev => ({
                ...prev,
                name: 'Vince User',
                course: 'BSIT',
                department: 'CEA',
                contact: '0917-XXX-XXXX',
                email: 'vince@example.com'
            }));
        } else {
            setForm(prev => ({
                ...prev,
                name: '',
                course: '',
                department: '',
                contact: '',
                email: ''
            }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setStep(2);
    };

    return (
        <div className="flex bg-slate-50 min-h-screen">
            <Sidebar role="guard" />
            <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto overflow-y-auto mobile-top-spacer">
                <header className="mb-8 lg:mb-12 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">Security Portal</h1>
                        <p className="text-slate-500 mt-1 sm:mt-2 font-medium text-sm sm:text-base">Laguindingan Campus Gate 1</p>
                    </div>
                    <div className="glass px-4 sm:px-6 py-2 sm:py-3 rounded-2xl flex items-center gap-3 self-start sm:self-auto">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs sm:text-sm font-bold text-slate-700">Gate Active</span>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
                    <div className="lg:col-span-8 space-y-6 lg:space-y-8">
                        {step === 1 && (
                            <div className="card-premium">
                                <div className="flex items-center justify-between mb-6 lg:mb-8 pb-4 border-b border-slate-50">
                                    <h3 className="font-extrabold text-lg lg:text-xl text-slate-800 flex items-center gap-3">
                                        <ClipboardList className="text-blue-600" size={24} />
                                        Violation Report Form
                                    </h3>
                                </div>

                                <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-6 lg:space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-4">Identity Information</h4>
                                            <div className="relative">
                                                <input
                                                    required
                                                    type="text"
                                                    placeholder="Student ID Number"
                                                    value={form.studentId}
                                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-3 sm:p-4 pr-14 sm:pr-16 font-black text-slate-800 outline-none focus:border-blue-600 transition-all placeholder:text-slate-400 text-sm sm:text-base"
                                                    onChange={handleIdChange}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleScan}
                                                    title="Optional ID Scanner"
                                                    className="absolute right-2 top-2 bottom-2 aspect-square bg-slate-200 hover:bg-slate-300 rounded-xl flex items-center justify-center text-slate-600 transition-colors"
                                                >
                                                    <Scan size={20} />
                                                </button>
                                            </div>

                                            <div>
                                                <input
                                                    required
                                                    readOnly={form.name !== ''}
                                                    placeholder="Full Student Name"
                                                    value={form.name}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 sm:p-4 font-bold text-slate-700 outline-none focus:border-blue-600 transition-all opacity-80 text-sm sm:text-base"
                                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                                <input
                                                    required
                                                    readOnly={form.course !== ''}
                                                    placeholder="Course"
                                                    value={form.course}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 sm:p-4 font-bold text-slate-700 outline-none focus:border-blue-600 transition-all text-sm opacity-80"
                                                    onChange={(e) => setForm({ ...form, course: e.target.value })}
                                                />
                                                <input
                                                    required
                                                    readOnly={form.department !== ''}
                                                    placeholder="Department"
                                                    value={form.department}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 sm:p-4 font-bold text-slate-700 outline-none focus:border-blue-600 transition-all text-sm opacity-80"
                                                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-4">Contact & Communication</h4>
                                            <div>
                                                <input
                                                    required
                                                    readOnly={form.contact !== ''}
                                                    placeholder="Contact Number"
                                                    value={form.contact}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 sm:p-4 font-bold text-slate-700 outline-none focus:border-blue-600 transition-all opacity-80 text-sm sm:text-base"
                                                    onChange={(e) => setForm({ ...form, contact: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <input
                                                    required
                                                    readOnly={form.email !== ''}
                                                    type="email"
                                                    placeholder="Email Address"
                                                    value={form.email}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 sm:p-4 font-bold text-slate-700 outline-none focus:border-blue-600 transition-all opacity-80 text-sm sm:text-base"
                                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-50 pt-6 lg:pt-8">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 mb-4 lg:mb-6 font-bold">Violation Details</h4>
                                        <div className="w-full">
                                            <select
                                                required
                                                className="w-full bg-red-50/30 border-2 border-red-50 rounded-2xl p-3 sm:p-4 font-bold text-slate-700 outline-none focus:border-red-500 transition-all appearance-none cursor-pointer text-sm sm:text-base"
                                                onChange={(e) => setForm({ ...form, violation: e.target.value })}
                                                value={form.violation}
                                            >
                                                <option value="">Select Category</option>
                                                <option value="No ID">No Identification (ID)</option>
                                                <option value="Dress Code">Dress Code Violation</option>
                                                <option value="Others">Others</option>
                                            </select>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn-premium bg-blue-600 hover:bg-slate-900 text-white w-full py-4 sm:py-5 text-base sm:text-lg shadow-2xl shadow-blue-900/10 flex items-center justify-center gap-3 mt-4"
                                    >
                                        <Send size={20} />
                                        Finalize & Submit Report
                                    </button>
                                </form>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="card-premium text-center py-16 sm:py-24 border-2 border-green-100 bg-green-50/30">
                                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-xl shadow-green-200">
                                    <CheckCircle2 className="text-white" size={40} />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Report In Flight</h2>
                                <p className="text-slate-500 mt-3 sm:mt-4 max-w-sm mx-auto text-base sm:text-lg leading-relaxed font-medium px-4">
                                    Violation report for <span className="text-blue-600 font-bold">{form.name}</span> has been dispatched for OSA Review.
                                </p>
                                <button
                                    onClick={() => {
                                        setStep(1);
                                        setForm({ studentId: '', name: '', course: '', department: '', contact: '', email: '', violation: '', description: '' });
                                    }}
                                    className="mt-8 sm:mt-12 btn-premium bg-slate-900 text-white w-full max-w-xs transition-transform hover:scale-105 py-4"
                                >
                                    Return to Duty
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-4 space-y-6 lg:space-y-8">
                        <div className="card-premium bg-ustp-navy text-white relative overflow-hidden p-6 sm:p-8 shadow-2xl">
                            <div className="relative z-10">
                                <h4 className="flex items-center gap-2 text-ustp-gold font-black text-xs tracking-widest uppercase mb-6 lg:mb-8">
                                    <AlertCircle size={14} />
                                    Reporting Guide
                                </h4>
                                <div className="space-y-6 lg:space-y-8">
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-black text-ustp-gold text-xs shrink-0">01</div>
                                        <p className="text-sm text-slate-300 font-medium leading-relaxed">Fetch data using Scanner OR enter ID manually.</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-black text-ustp-gold text-xs shrink-0">02</div>
                                        <p className="text-sm text-slate-300 font-medium leading-relaxed">Ensure all contact details are accurate for OSA follow-up.</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-black text-ustp-gold text-xs shrink-0">03</div>
                                        <p className="text-sm text-slate-300 font-medium leading-relaxed">Clearly specify the violation category to speed up review.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
                        </div>

                        <div className="card-premium">
                            <h4 className="font-extrabold text-slate-800 text-sm mb-6 lg:mb-8 uppercase tracking-widest text-center">Duty History</h4>
                            <div className="py-16 sm:py-20 text-center bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-100">
                                <p className="text-slate-300 font-black uppercase tracking-[0.2em] text-[10px]">Clean Duty Log</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default GuardDashboard;
