import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { Search, Check, X, ShieldAlert, User, Eye, AlertCircle } from 'lucide-react';
import GlobalSearch from '../../components/GlobalSearch';

const PendingReviews = () => {
    const userRole = JSON.parse(localStorage.getItem('user') || '{}').role || 'staff';
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [assignedBuildings, setAssignedBuildings] = useState({});
    const [customHours, setCustomHours] = useState({});
    const BUILDINGS = ['CITC', 'CEA', 'COT', 'CSEE', 'CSM', 'Library', 'Gymnasium', 'Admin Building', 'Field/Campus'];
    const HOURS_OPTIONS = ['3', '5', '6'];

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
        const assigned_building = assignedBuildings[reportId];
        const custom_hours = customHours[reportId];
        
        if (newStatus === 'Approved' && (!assigned_building || !custom_hours)) {
            alert("Please assign a building and required hours before approval");
            return;
        }

        try {
            const endpoint = newStatus === 'Approved' ? 'approve' : 'dismiss';
            const response = await fetch(`/api/violations/${reportId}/${endpoint}/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assigned_building, custom_hours })
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
        <div className="flex bg-slate-50 dark:bg-slate-900 min-h-screen relative font-sans">
            <Sidebar role={userRole} />
            <div className="flex-1 h-screen overflow-y-auto custom-scrollbar w-full">
                <div className="sticky top-0 z-40 bg-slate-50 dark:bg-slate-900 px-6 md:px-10 pt-24 md:pt-10 pb-2 border-b border-transparent">
                    <GlobalSearch />
                </div>
                <main className="flex-1 p-4 md:p-10 pt-0 md:pt-0 w-full max-w-full">
                <header className="mb-6 md:mb-8 text-center md:text-left flex flex-col md:flex-row items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Pending Reviews</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium text-sm">Validate and synchronize violation reports from field units.</p>
                    </div>
                </header>

                <div className="card-premium border-2 border-white shadow-xl p-6 md:p-10">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-4 pb-4 border-b border-slate-50 gap-4">
                        <div className="relative w-full md:max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={20} />
                            <input
                                type="text"
                                placeholder="Search student name or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-4 pl-14 focus:border-ustp-blue outline-none text-sm font-semibold text-slate-600 dark:text-slate-400 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest bg-slate-50 dark:bg-slate-900 px-4 py-2 rounded-full">
                            <AlertCircle size={14} className="text-ustp-blue" />
                            {filteredReports.length} reports awaiting action
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-24 text-center animate-pulse text-slate-300 dark:text-slate-600 font-black uppercase tracking-[0.3em] text-xs">Syncing Queue...</div>
                    ) : filteredReports.length === 0 ? (
                        <div className="py-24 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[40px] border-4 border-dotted border-slate-100 dark:border-slate-700">
                            <div className="w-20 h-20 bg-white dark:bg-slate-800 shadow-lg text-ustp-blue rounded-3xl flex items-center justify-center mx-auto mb-8">
                                <ShieldAlert size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">NULL QUEUE</h2>
                            <p className="text-slate-400 dark:text-slate-500 mt-3 max-w-xs mx-auto font-medium leading-relaxed">All field reports have been processed. Systems are nominal.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredReports.map((report) => (
                                <div key={report.id} className="p-2 md:p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-ustp-blue rounded-xl transition-all shadow-sm group">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                        <div className="flex gap-3 items-center flex-1">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center shrink-0 transition-colors">
                                                <User size={18} />
                                            </div>
                                            <div className="min-w-0">
                                                <h5 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight truncate">{report.student_details?.name || 'New Student Record'}</h5>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider">{report.violation_type}</span>
                                                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                                    <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase">{report.student_details?.student_id}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 w-full md:w-auto mt-2 md:mt-0 items-center justify-end">
                                            <button onClick={() => setSelectedReport(report)} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-ustp-blue dark:hover:bg-ustp-blue hover:text-white text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl font-bold text-xs transition-colors"><Eye size={16} /> Review</button>
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
                        <div className="bg-white dark:bg-slate-800 rounded-[28px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                            <div className="bg-slate-50 border-b border-slate-100 dark:border-transparent dark:bg-slate-900 p-6 relative">
                                <button onClick={() => setSelectedReport(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-800 dark:text-white dark:bg-slate-800/10 dark:hover:bg-slate-800/20 flex items-center justify-center transition-all"><X size={16} /></button>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-slate-800/10 flex items-center justify-center"><User size={24} className="text-blue-600 dark:text-white" /></div>
                                    <div>
                                        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase italic">{selectedReport.student_details?.name}</h2>
                                        <p className="text-slate-500 dark:text-slate-500 text-[10px] font-black tracking-widest uppercase mt-0.5">{selectedReport.student_details?.student_id}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700/30 p-4 rounded-2xl flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-black uppercase text-yellow-600 dark:text-yellow-500 mb-0.5">Offense Count</p>
                                        <p className="font-bold text-yellow-800 dark:text-yellow-400 text-sm">Offense #{selectedReport.offense_count || 1}</p>
                                    </div>
                                    <div className="w-8 h-8 bg-yellow-200 dark:bg-yellow-800/30 rounded-full flex items-center justify-center text-yellow-700 dark:text-yellow-500 font-bold text-xs">
                                        {selectedReport.offense_count || 1}
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <p className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-500 mb-0.5">Violation Type</p>
                                    <p className="font-bold text-red-600 dark:text-red-400 text-sm uppercase">{selectedReport.violation_type}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800"><p className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-500 mb-0.5">Description</p><p className="font-semibold text-slate-800 dark:text-slate-300 text-xs leading-relaxed">{selectedReport.description || 'No report description available.'}</p></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800"><p className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-500 mb-0.5">Course</p><p className="font-bold text-slate-800 dark:text-slate-300 text-xs truncate">{selectedReport.student_details?.course}</p></div>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800"><p className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-500 mb-0.5">Dept</p><p className="font-bold text-slate-800 dark:text-slate-300 text-xs truncate">{selectedReport.student_details?.department}</p></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1.5">Assign Building *</p>
                                        <select 
                                            value={assignedBuildings[selectedReport.id] || ''} 
                                            onChange={(e) => setAssignedBuildings({...assignedBuildings, [selectedReport.id]: e.target.value})}
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:border-ustp-blue outline-none transition-all"
                                        >
                                            <option value="">Choose...</option>
                                            {BUILDINGS.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1.5">Required Hours *</p>
                                        <select 
                                            value={customHours[selectedReport.id] || ''} 
                                            onChange={(e) => setCustomHours({...customHours, [selectedReport.id]: e.target.value})}
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:border-ustp-blue outline-none transition-all"
                                        >
                                            <option value="">Select...</option>
                                            {HOURS_OPTIONS.map(h => <option key={h} value={h}>{h} Hours</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 pt-0 flex gap-3">
                                <button onClick={() => { handleAction(selectedReport.id, 'Dismissed'); setSelectedReport(null); }} className="flex-1 py-3 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Dismiss Case</button>
                                <button 
                                    onClick={() => { handleAction(selectedReport.id, 'Approved'); if (assignedBuildings[selectedReport.id] && customHours[selectedReport.id]) setSelectedReport(null); }} 
                                    disabled={!assignedBuildings[selectedReport.id] || !customHours[selectedReport.id]}
                                    className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
                                        assignedBuildings[selectedReport.id] && customHours[selectedReport.id]
                                        ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'
                                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                                    }`}
                                >
                                    Approve Case
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
            </div>
        </div>
    );
};

export default PendingReviews;
