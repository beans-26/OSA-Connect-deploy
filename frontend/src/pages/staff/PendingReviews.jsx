import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { Search, Check, X, ShieldAlert, User, Eye, AlertCircle } from 'lucide-react';

const PendingReviews = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const response = await fetch('/api/violations/');
            const data = await response.json();
            const pending = data.filter(r => r.status.toLowerCase().includes('pending'));
            setReports(pending);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (reportId, newStatus) => {
        try {
            const endpoint = newStatus === 'Approved' ? 'approve' : 'dismiss';
            const response = await fetch(`/api/violations/${reportId}/${endpoint}/`, {
                method: 'POST',
            });
            if (response.ok) fetchReports();
        } catch (error) {
            console.error('Error executing action:', error);
        }
    };

    const filteredReports = reports.filter(r =>
        (r.student_details?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.student_details?.student_id?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="flex bg-slate-50 min-h-screen relative">
            <Sidebar role="staff" />
            <main className="flex-1 p-4 md:p-10 pt-24 md:pt-10 max-w-7xl mx-auto overflow-y-auto">
                <header className="mb-8 md:mb-12 text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight uppercase italic">Pending Reviews</h1>
                    <p className="text-slate-400 mt-2 font-medium italic">Validate and synchronize violation reports from field units.</p>
                </header>

                <div className="card-premium border-2 border-white shadow-xl p-6 md:p-10">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-10 pb-6 border-b border-slate-50 gap-4">
                        <div className="relative w-full md:max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                            <input
                                type="text"
                                placeholder="Search student name or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[20px] p-4 pl-14 focus:border-ustp-blue outline-none font-bold text-sm transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 px-4 py-2 rounded-full">
                            <AlertCircle size={14} className="text-ustp-blue" />
                            {filteredReports.length} reports awaiting action
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-24 text-center animate-pulse text-slate-300 font-black uppercase tracking-[0.3em] text-xs">Syncing Queue...</div>
                    ) : filteredReports.length === 0 ? (
                        <div className="py-24 text-center bg-slate-50/50 rounded-[40px] border-4 border-dotted border-slate-100">
                            <div className="w-20 h-20 bg-white shadow-lg text-ustp-blue rounded-3xl flex items-center justify-center mx-auto mb-8">
                                <ShieldAlert size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">NULL QUEUE</h2>
                            <p className="text-slate-400 mt-3 max-w-xs mx-auto font-medium leading-relaxed">All field reports have been processed. Systems are nominal.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredReports.map((report) => (
                                <div key={report.id} className="p-6 bg-white border-2 border-slate-50 hover:border-ustp-blue rounded-[32px] transition-all shadow-sm hover:shadow-xl group">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                        <div className="flex gap-6 items-center flex-1">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-ustp-blue group-hover:text-white transition-colors">
                                                <User size={24} />
                                            </div>
                                            <div className="min-w-0">
                                                <h5 className="font-black text-lg text-slate-900 uppercase tracking-tight truncate">{report.student_details?.name || 'New Student Record'}</h5>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{report.violation_type}</span>
                                                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                                    <span className="text-[10px] font-bold text-slate-300 uppercase">{report.student_details?.student_id}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 w-full md:w-auto">
                                            <button onClick={() => handleAction(report.id, 'Approved')} className="flex-1 md:flex-none px-6 py-4 bg-green-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-600 shadow-lg shadow-green-100 transition-all">Approve</button>
                                            <button onClick={() => handleAction(report.id, 'Dismissed')} className="flex-1 md:flex-none px-6 py-4 bg-red-50 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Dismiss</button>
                                            <button onClick={() => setSelectedReport(report)} className="px-4 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all"><Eye size={18} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Detail Modal */}
                {selectedReport && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md" onClick={() => setSelectedReport(null)}>
                        <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                            <div className="bg-slate-900 p-8 relative">
                                <button onClick={() => setSelectedReport(null)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"><X size={20} /></button>
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center"><User size={30} className="text-white" /></div>
                                    <div>
                                        <h2 className="text-xl font-black text-white uppercase italic">{selectedReport.student_details?.name}</h2>
                                        <p className="text-slate-400 text-xs font-black tracking-widest uppercase mt-1">{selectedReport.student_details?.student_id}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
                                <div className="bg-slate-50 p-5 rounded-3xl"><p className="text-[9px] font-black uppercase text-slate-400 mb-1">Violation Category</p><p className="font-black text-red-600 uppercase">{selectedReport.violation_type}</p></div>
                                <div className="bg-slate-50 p-5 rounded-3xl"><p className="text-[9px] font-black uppercase text-slate-400 mb-1">Description</p><p className="font-bold text-slate-700">{selectedReport.description || 'No report description available.'}</p></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-5 rounded-3xl"><p className="text-[9px] font-black uppercase text-slate-400 mb-1">Course</p><p className="font-bold text-slate-700 text-xs">{selectedReport.student_details?.course}</p></div>
                                    <div className="bg-slate-50 p-5 rounded-3xl"><p className="text-[9px] font-black uppercase text-slate-400 mb-1">Dept</p><p className="font-bold text-slate-700 text-xs">{selectedReport.student_details?.department}</p></div>
                                </div>
                            </div>
                            <div className="p-8 pt-0 flex gap-4">
                                <button onClick={() => { handleAction(selectedReport.id, 'Dismissed'); setSelectedReport(null); }} className="flex-1 py-5 bg-red-50 text-red-500 rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Dismiss Case</button>
                                <button onClick={() => { handleAction(selectedReport.id, 'Approved'); setSelectedReport(null); }} className="flex-1 py-5 bg-green-500 text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:bg-green-600 shadow-xl shadow-green-100 transition-all">Approve Case</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default PendingReviews;
