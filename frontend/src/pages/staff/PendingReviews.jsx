import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { Search, Check, X, ShieldAlert, User, Eye } from 'lucide-react';

const PendingReviews = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const response = await fetch('/api/violations/');
            const data = await response.json();
            // We only want pending ones for this page
            const pending = data.filter(r => r.status === "Pending OSA Review" || r.status === "PENDING" || r.status.toLowerCase().includes('pending'));
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

            if (response.ok) {
                fetchReports();
            }
        } catch (error) {
            console.error('Error executing action:', error);
        }
    };

    return (
        <div className="flex bg-slate-50 min-h-screen">
            <Sidebar role="staff" />
            <main className="flex-1 p-10 max-w-7xl mx-auto overflow-y-auto">
                <header className="mb-12 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Pending Reviews</h1>
                        <p className="text-slate-500 mt-2 font-medium">Verify and approve violation reports submitted by guards.</p>
                    </div>
                </header>

                <div className="card-premium">
                    <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-50">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input
                                type="text"
                                placeholder="Filter by Name or ID..."
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 pl-12 focus:ring-4 focus:ring-blue-100 focus:border-ustp-blue transition-all outline-none font-semibold text-sm"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest">Loading Reports...</div>
                    ) : reports.length === 0 ? (
                        <div className="py-24 text-center">
                            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <ShieldAlert size={40} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800">Queue is Empty</h2>
                            <p className="text-slate-400 mt-2 max-w-xs mx-auto font-medium">
                                All submitted reports have been reviewed. There are no pending cases at the moment.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {reports.map((report) => (
                                <div key={report.id} className="p-5 bg-white border border-slate-100 hover:border-blue-100 rounded-2xl transition-all">
                                    <div className="flex justify-between items-center">
                                        <div className="flex-1">
                                            <h5 className="font-bold text-base text-slate-800">
                                                {report.student_details?.name || 'New Student'}
                                            </h5>
                                            <p className="text-sm font-medium text-red-500 mt-1">
                                                {report.violation_type}
                                            </p>
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleAction(report.id, 'Approved')}
                                                className="px-4 py-2 bg-green-50 text-green-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleAction(report.id, 'Dismissed')}
                                                className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                                            >
                                                Dismiss
                                            </button>
                                            <button
                                                onClick={() => setSelectedReport(report)}
                                                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-600 hover:text-white transition-all"
                                            >
                                                Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Detail Modal */}
                {selectedReport && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
                        onClick={() => setSelectedReport(null)}
                    >
                        <div
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 relative">
                                <button
                                    onClick={() => setSelectedReport(null)}
                                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-white"
                                >
                                    <X size={16} />
                                </button>
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                                        <User size={26} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-extrabold text-white leading-tight">
                                            {selectedReport.student_details?.name || 'Unknown Student'}
                                        </h2>
                                        <p className="text-slate-300 text-xs font-bold tracking-widest uppercase mt-0.5">
                                            {selectedReport.student_details?.student_id || 'No ID'}
                                        </p>
                                        <span className="inline-block mt-2 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-orange-100 text-orange-800">
                                            Pending Review
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 max-h-[60vh] overflow-y-auto">
                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Course</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedReport.student_details?.course || '—'}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Department</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedReport.student_details?.department || '—'}</p>
                                    </div>
                                    <div className="p-4 bg-red-50 rounded-2xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">Violation Type</p>
                                        <p className="text-sm font-bold text-red-700">{selectedReport.violation_type || '—'}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Description</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedReport.description || 'No description provided'}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Reported By</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedReport.reporting_guard || '—'}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Date & Time Reported</p>
                                        <p className="text-sm font-bold text-slate-800">
                                            {selectedReport.created_at 
                                                ? `${new Date(selectedReport.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date(selectedReport.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}`
                                                : '—'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 pb-6 pt-2 flex gap-3">
                                <button
                                    onClick={() => { handleAction(selectedReport.id, 'Dismissed'); setSelectedReport(null); }}
                                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                >
                                    <X size={16} /> Dismiss
                                </button>
                                <button
                                    onClick={() => { handleAction(selectedReport.id, 'Approved'); setSelectedReport(null); }}
                                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                >
                                    <Check size={16} /> Approve
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default PendingReviews;
