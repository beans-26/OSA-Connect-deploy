import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { Search, X, User, AlertCircle, Inbox } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import { useServiceSites, ServiceSiteOptions, postAssignment } from '../../components/useServiceSites';

// The OSA handbook penalty a report gets on approval, from GET /api/violations/punishments/ (same rule as
// get_punishment in backend core/views.py): its type's penalty for this offense number, the last listed one
// for later offenses, and the default for types not in the table. Admins don't choose the hours.
const penaltyFor = (table, report) => {
    if (!table) return null;
    const rule = table.rules.find((r) => r.violation_type === report.violation_type);
    if (!rule) return table.default;
    const offense = Number(report.offense_count) || 1;
    return rule.offenses.find((o) => o.offense === offense) || rule.offenses[rule.offenses.length - 1];
};

const PendingReviews = () => {
    const userRole = JSON.parse(localStorage.getItem('user') || '{}').role || 'staff';
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [assignedBuildings, setAssignedBuildings] = useState({});
    // null while loading, false if it couldn't be loaded
    const [penalties, setPenalties] = useState(null);
    // Buildings are the registered service sites (Settings > Service Sites)
    const serviceSites = useServiceSites();

    useEffect(() => {
        fetchReports();
        fetch('/api/violations/punishments/')
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then(setPenalties)
            .catch(() => setPenalties(false));
    }, []);

    const fetchReports = async () => {
        try {
            const response = await fetch('/api/violations/?scope=open');
            const data = await response.json();
            const pending = data.filter(r => r.status.toLowerCase().includes('pending'));
            setReports(pending);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (report, newStatus) => {
        const reportId = report.id;
        // Community service needs a building; a sanction with no hours (no entry into the campus) doesn't
        const needsBuilding = (penaltyFor(penalties, report)?.hours || 0) > 0;
        const assigned_building = needsBuilding ? assignedBuildings[reportId] : undefined;

        if (newStatus === 'Approved' && needsBuilding && !assigned_building) {
            alert("Please assign a building before approval");
            return;
        }

        try {
            const endpoint = newStatus === 'Approved' ? 'approve' : 'dismiss';
            // Approving into a full building asks "assign anyway?" first
            const { ok, cancelled, data } = await postAssignment(`/api/violations/${reportId}/${endpoint}/`, { assigned_building });
            if (ok) {
                setSelectedReport(null);
                fetchReports();
            } else if (!cancelled) {
                alert(data.error || 'Something went wrong. Please try again.');
            }
        } catch (error) {
            console.error('Error executing action:', error);
            alert("Can't reach the server. Please try again.");
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
                <main className="page-enter flex-1 px-4 pt-[76px] pb-8 md:p-10 lg:pt-10 w-full max-w-full">
                <header className="mb-6 md:mb-8 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Pending Reviews</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium text-sm">Validate and synchronize violation reports from field units.</p>
                    </div>
                    <ThemeToggle />
                </header>

                <div className="card-premium border-2 border-white shadow-xl p-4 md:p-10">
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
                        <div className="text-center py-20">
                            <div className="animate-spin w-12 h-12 border-4 border-ustp-blue border-t-transparent rounded-full mx-auto"></div>
                            <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium">Loading reports...</p>
                        </div>
                    ) : filteredReports.length === 0 ? (
                        // Same empty look as All Students
                        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-700">
                            <Inbox className="mx-auto text-slate-200 mb-4" size={48} />
                            <h5 className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-xs">No Reports to Review</h5>
                            {searchTerm && (
                                <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Try adjusting your search terms</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredReports.map((report) => (
                                <button type="button" key={report.id} onClick={() => setSelectedReport(report)} className="block w-full text-left cursor-pointer p-2 md:p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-ustp-blue hover:bg-slate-50 dark:hover:bg-slate-700/40 focus-visible:outline-2 focus-visible:outline-ustp-blue rounded-xl transition-all shadow-sm group">
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
                                    </div>
                                </button>
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
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800"><p className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-500 mb-0.5">Course</p><p className="font-bold text-slate-800 dark:text-slate-300 text-xs truncate">{selectedReport.student_details?.course}</p></div>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800"><p className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-500 mb-0.5">Dept</p><p className="font-bold text-slate-800 dark:text-slate-300 text-xs truncate">{selectedReport.student_details?.department}</p></div>
                                </div>
                                {(() => {
                                    // The handbook penalty for this offense; only community service needs a building
                                    const penalty = penaltyFor(penalties, selectedReport);
                                    const hasHours = (penalty?.hours || 0) > 0;
                                    return (
                                        <>
                                            <div className={`p-4 rounded-2xl border ${penalty && !hasHours ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-700/30' : 'bg-slate-50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-800'}`}>
                                                <p className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-500 mb-0.5">Penalty (OSA Student Handbook)</p>
                                                <p className={`font-bold text-sm ${penalty && !hasHours ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                    {penalties === null ? 'Loading penalty…'
                                                        : penalties === false ? "Couldn't load the penalty table. Reload the page." : penalty?.punishment}
                                                </p>
                                                {penalty && !hasHours && (
                                                    <p className="mt-1 text-[11px] font-semibold text-red-600/80 dark:text-red-400/80">No community service: approving records this sanction and moves the case to the archives.</p>
                                                )}
                                            </div>
                                            {hasHours && (
                                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                    <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1.5">Assign Building *</p>
                                                    <select
                                                        value={assignedBuildings[selectedReport.id] || ''}
                                                        onChange={(e) => setAssignedBuildings({...assignedBuildings, [selectedReport.id]: e.target.value})}
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:border-ustp-blue outline-none transition-all"
                                                    >
                                                        <ServiceSiteOptions {...serviceSites} placeholder="Choose..." />
                                                    </select>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="p-6 pt-0 flex gap-3">
                                <button onClick={() => handleAction(selectedReport, 'Dismissed')} className="flex-1 py-3 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Dismiss Case</button>
                                {(() => {
                                    const penalty = penaltyFor(penalties, selectedReport);
                                    const ready = penalty && ((penalty.hours || 0) <= 0 || assignedBuildings[selectedReport.id]);
                                    return (
                                        <button
                                            onClick={() => handleAction(selectedReport, 'Approved')}
                                            disabled={!ready}
                                            className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
                                                ready
                                                ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'
                                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                                            }`}
                                        >
                                            Approve Case
                                        </button>
                                    );
                                })()}
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
