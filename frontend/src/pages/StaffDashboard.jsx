import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import {
    AlertTriangle,
    Clock,
    FileText,
    Inbox,
    User,
    Check,
    X,
    Search,
    Eye,
    Shield,
    Calendar,
    BookOpen,
    Hash,
    MapPin,
    Award,
    Timer,
    Bell,
    UserCheck,
    ClipboardList
} from 'lucide-react';

/* ─── Violation Detail Modal ──────────────────────────────────────── */
const ViolationModal = ({ report, ticket, onClose, onAction }) => {
    if (!report) return null;
    const student = report.student_details || {};

    const formatDateTime = (iso) => {
        if (!iso) return { date: '—', time: '—' };
        const d = new Date(iso);
        return {
            date: d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
            time: d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
        };
    };

    const formatRemainingTime = (hours) => {
        if (!hours && hours !== 0) return '—';
        const h = Math.floor(hours);
        const m = Math.floor((hours - h) * 60);
        return `${h}h ${m}m remaining`;
    };

    const caught = formatDateTime(report.created_at);

    const statusColor = (s = '') => {
        const sl = s.toLowerCase();
        if (sl.includes('pending')) return 'bg-orange-100 text-orange-800';
        if (sl.includes('approved') || sl === 'ongoing' || sl === 'active') return 'bg-green-100 text-green-800';
        if (sl.includes('dismissed')) return 'bg-red-100 text-red-800';
        if (sl === 'completed') return 'bg-blue-100 text-blue-800';
        return 'bg-slate-100 text-slate-700';
    };

    const currentStatus = ticket ? ticket.status : report.status;
    const remainingHours = ticket?.remaining_hours;
    const isOngoing = ticket?.status === 'Ongoing';
    const isPending = report.status.toLowerCase().includes('pending');

    const Row = ({ icon: Icon, label, value, accent }) => (
        <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon size={15} className="text-slate-400" />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                <p className={`text-sm font-bold mt-0.5 ${accent || 'text-slate-800'}`}>{value || '—'}</p>
            </div>
        </div>
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 relative">
                    <button
                        onClick={onClose}
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
                                {student.name || 'Unknown Student'}
                            </h2>
                            <p className="text-slate-300 text-xs font-bold tracking-widest uppercase mt-0.5">
                                {student.student_id || 'No ID'}
                            </p>
                            <span className={`inline-block mt-2 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${statusColor(currentStatus)}`}>
                                {currentStatus}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 max-h-[65vh] overflow-y-auto">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Student Information</p>
                    <Row icon={BookOpen} label="Course" value={student.course} />
                    <Row icon={MapPin} label="Department" value={student.department} />
                    <Row icon={Hash} label="Year Level" value={student.year_level} />

                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 mt-5">Incident Report</p>
                    <Row icon={AlertTriangle} label="Violation Type" value={report.violation_type} accent="text-red-600" />
                    <Row icon={FileText} label="Description" value={report.description || 'No description provided'} />
                    <Row icon={Hash} label="Offense Count" value={report.offense_count ? `#${report.offense_count} Offense` : '—'} />
                    <Row icon={Shield} label="Reported By" value={report.reporting_guard} />

                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 mt-5">Date & Time Caught</p>
                    <Row icon={Calendar} label="Date" value={caught.date} />
                    <Row icon={Clock} label="Time" value={caught.time} />

                    {(report.punishment || isOngoing) && (
                        <>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 mt-5">Sanction</p>
                            {report.punishment && (
                                <Row icon={Award} label="Required Sanction" value={report.punishment} accent="text-blue-700" />
                            )}
                            {isOngoing && remainingHours !== undefined && remainingHours !== null && (
                                <Row
                                    icon={Timer}
                                    label="Time Remaining"
                                    value={formatRemainingTime(remainingHours)}
                                    accent={remainingHours > 0 ? "text-green-600" : "text-slate-800"}
                                />
                            )}
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 pb-6 pt-2 flex flex-col gap-2">
                    {isPending && (
                        <div className="grid grid-cols-2 gap-3 mb-2">
                            <button
                                onClick={() => {
                                    onAction(report.id, 'Approved');
                                    onClose();
                                }}
                                className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-100"
                            >
                                <Check size={16} /> Approve
                            </button>
                            <button
                                onClick={() => {
                                    onAction(report.id, 'Dismissed');
                                    onClose();
                                }}
                                className="flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-red-100"
                            >
                                <X size={16} /> Dismiss
                            </button>
                        </div>
                    )}

                    {/* Special case for 0-hour punishments that aren't pending but need "Mark Done" (if status is Approved) */}
                    {!isPending && report.status === 'Approved' && !ticket && (
                        <button
                            onClick={() => {
                                onAction(report.id, 'Approved'); // 'approve' endpoint also marks as Completed if hours=0
                                onClose();
                            }}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all mb-2"
                        >
                            Mark as Handled / Done
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─── Staff Dashboard ─────────────────────────────────────────────── */
const StaffDashboard = () => {
    const [stats, setStats] = useState({ pending: 0, active: 0, completed: 0, warnings: 0 });
    const [violators, setViolators] = useState([]);
    const [allTickets, setAllTickets] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedViolation, setSelectedViolation] = useState(null);
    const [todayStats, setTodayStats] = useState({ violations: 0, assigned: 0, completed: 0 });
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        fetchDashboardData();
        const poll = setInterval(fetchDashboardData, 5000);
        return () => clearInterval(poll);
    }, []);

    const handleAction = async (reportId, newStatus) => {
        try {
            const endpoint = newStatus === 'Approved' ? 'approve' : 'dismiss';
            const response = await fetch(`/api/violations/${reportId}/${endpoint}/`, { method: 'POST' });
            if (response.ok) fetchDashboardData();
        } catch (error) {
            console.error('Error executing action:', error);
        }
    };

    const fetchDashboardData = async () => {
        try {
            const vResponse = await fetch('/api/violations/');
            const violations = await vResponse.json();

            let tickets = [];
            try {
                const tResponse = await fetch('/api/etickets/?t=' + Date.now());
                tickets = await tResponse.json();
            } catch (e) { console.log('ETickets error', e); }

            let fetchedLogs = [];
            try {
                const lResponse = await fetch('/api/timelogs/?t=' + Date.now());
                fetchedLogs = await lResponse.json();
            } catch (e) { console.log('Timelogs error', e); }

            const today = new Date().toDateString();

            const violationsToday = violations.filter(v => new Date(v.created_at).toDateString() === today);
            const ticketsAssignedToday = tickets.filter(t => {
                const created = t.created_at ? new Date(t.created_at).toDateString() : '';
                return created === today;
            });
            const ticketsCompletedToday = tickets.filter(t => {
                const updated = t.updated_at ? new Date(t.updated_at).toDateString() : '';
                return t.status === 'Completed' && updated === today;
            });

            setTodayStats({
                violations: violationsToday.length,
                assigned: ticketsAssignedToday.length,
                completed: ticketsCompletedToday.length,
            });

            const newNotifications = [];

            violationsToday.filter(v => v.status.toLowerCase().includes('pending')).forEach(v => {
                const name = v.student_details?.name || 'A student';
                newNotifications.push({
                    id: `pending-${v.id}`,
                    type: 'warning',
                    message: `${name} violation is pending OSA review`,
                    time: formatTimeAgo(v.created_at),
                });
            });

            ticketsCompletedToday.forEach(t => {
                const name = t.student_details?.name || 'A student';
                newNotifications.push({
                    id: `completed-${t.id}`,
                    type: 'success',
                    message: `${name} completed their assigned community service`,
                    time: formatTimeAgo(t.updated_at),
                });
            });

            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            const overduePending = violations.filter(v =>
                v.status.toLowerCase().includes('pending') &&
                new Date(v.created_at) < threeDaysAgo
            );
            overduePending.forEach(v => {
                const name = v.student_details?.name || 'A student';
                const days = Math.floor((new Date() - new Date(v.created_at)) / (1000 * 60 * 60 * 24));
                newNotifications.push({
                    id: `overdue-${v.id}`,
                    type: 'error',
                    message: `${name} has not completed their pending review for ${days} days`,
                    time: formatTimeAgo(v.created_at),
                });
            });

            setNotifications(newNotifications.slice(0, 10));

            const pending = violations.filter(v => v.status.toLowerCase().includes('pending'));
            const activeTickets = tickets.filter(t => t.status === 'Ongoing');
            const completedTickets = tickets.filter(t => t.status === 'Completed');

            setStats({
                pending: pending.length,
                active: activeTickets.length,
                completed: completedTickets.length,
                warnings: 0,
            });

            setViolators(violations);
            setAllTickets(tickets);
            setLogs(fetchedLogs);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTimeAgo = (isoDate) => {
        if (!isoDate) return '';
        const diff = Date.now() - new Date(isoDate).getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);
        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (mins > 0) return `${mins}m ago`;
        return 'Just now';
    };

    return (
        <div className="flex bg-slate-50 min-h-screen relative">
            <Sidebar role="staff" />
            <div className="flex-1 flex flex-col lg:flex-row">
                <main className="flex-1 p-4 md:p-10 pt-24 md:pt-10 max-w-7xl mx-auto overflow-y-auto">
                    <header className="mb-8 text-center md:text-left">
                        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight uppercase italic">Staff Command Center</h1>
                        <p className="text-slate-500 mt-2 font-medium italic">
                            {loading
                                ? 'Syncing cloud databases...'
                                : 'Awaiting compliance updates from field units'}
                        </p>
                    </header>

                    <div className="space-y-8">
                        {/* ── Violators Feed ── */}
                        <div className="card-premium">
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-50">
                                <h4 className="font-bold text-slate-800 uppercase tracking-widest text-sm text-blue-900">Violators Feed</h4>
                            </div>

                            <div className="mb-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search by name or student ID..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-ustp-blue focus:outline-none text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {(() => {
                                    const activeViolators = violators.filter(report => {
                                        const status = report.status.toLowerCase();
                                        const isDismissed = status === 'dismissed';
                                        const isCompleted = status === 'completed';
                                        const isPending = status.includes('pending');
                                        const ticket = allTickets.find(t => t.violation_details?.id === report.id || t.violation === report.id);
                                        const matchesSearch = !searchTerm ||
                                            (report.student_details?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                            (report.student_details?.student_id?.toLowerCase().includes(searchTerm.toLowerCase()));
                                        return !isDismissed && !isCompleted && (!ticket || ticket.status !== 'Completed') && matchesSearch;
                                    });

                                    if (activeViolators.length === 0) {
                                        return (
                                            <div className="py-16 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                                                <Inbox className="mx-auto text-slate-200 mb-3" size={40} />
                                                <h5 className="font-bold text-slate-400 uppercase tracking-[0.2em] text-xs">No Active Violators</h5>
                                            </div>
                                        );
                                    }

                                    return activeViolators.map((report) => {
                                        const ticket = allTickets.find(t => t.violation_details?.id === report.id || t.violation === report.id);
                                        const isOngoing = ticket?.status === 'Ongoing';
                                        const isPending = report.status.toLowerCase().includes('pending');

                                        return (
                                            <div
                                                key={report.id}
                                                className={`p-4 border shadow-sm rounded-3xl transition-all ${isOngoing ? 'bg-green-50/50 border-green-200' : 'bg-white border-slate-100'}`}
                                            >
                                                <div className="flex gap-4 items-center">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 ${isOngoing ? 'bg-green-500 text-white shadow-green-200/50' : 'bg-slate-50 text-slate-400'}`}>
                                                        {isOngoing ? <Clock size={20} className="animate-spin-slow" /> : <User size={20} />}
                                                    </div>

                                                    <div className="flex-1 overflow-hidden">
                                                        <p className="font-bold text-slate-800 text-sm truncate">{report.student_details?.name || 'New Student Report'}</p>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{report.violation_type}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${isOngoing ? 'bg-green-200 text-green-800' : isPending ? 'bg-orange-100 text-orange-800' : 'bg-blue-50 text-blue-900'}`}>
                                                                {ticket ? ticket.status : report.status}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2 flex-shrink-0">
                                                        {isPending && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleAction(report.id, 'Approved')}
                                                                    className="flex items-center gap-1 p-2 bg-green-50 hover:bg-green-500 hover:text-white text-green-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                                                                >
                                                                    <Check size={14} /> Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => handleAction(report.id, 'Dismissed')}
                                                                    className="flex items-center gap-1 p-2 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                                                                >
                                                                    <X size={14} /> Dismiss
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => setSelectedViolation({ report, ticket })}
                                                            className="flex items-center gap-1 p-2 bg-slate-50 hover:bg-slate-800 hover:text-white text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                                                        >
                                                            <Eye size={14} /> Details
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Right Sidebar */}
                <aside className="w-96 p-6 border-l border-slate-100 bg-white hidden xl:block">
                    <div className="sticky top-10 space-y-6">
                        {/* Today's Activity Card */}
                        <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                                    <Calendar size={24} className="text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-base uppercase tracking-wider">Today's Activity</h3>
                                    <p className="text-xs text-slate-400 font-semibold">{new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-red-50 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle size={20} className="text-red-500" />
                                        <span className="text-sm font-semibold text-slate-700">Violations Today</span>
                                    </div>
                                    <span className="text-2xl font-black text-red-600">{todayStats.violations}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <ClipboardList size={20} className="text-amber-600" />
                                        <span className="text-sm font-semibold text-slate-700">Services Assigned</span>
                                    </div>
                                    <span className="text-2xl font-black text-amber-600">{todayStats.assigned}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <UserCheck size={20} className="text-green-600" />
                                        <span className="text-sm font-semibold text-slate-700">Completed Service</span>
                                    </div>
                                    <span className="text-2xl font-black text-green-600">{todayStats.completed}</span>
                                </div>
                            </div>
                        </div>

                        {/* System Notifications Card */}
                        <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                                    <Bell size={24} className="text-slate-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-base uppercase tracking-wider">System Notifications</h3>
                                    <p className="text-xs text-slate-400 font-semibold">{notifications.length} alerts</p>
                                </div>
                            </div>
                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {notifications.length === 0 ? (
                                    <div className="text-center py-10">
                                        <Bell size={40} className="mx-auto text-slate-200 mb-3" />
                                        <p className="text-sm text-slate-400 font-medium">No notifications</p>
                                    </div>
                                ) : (
                                    notifications.map((notif) => (
                                        <div
                                            key={notif.id}
                                            className={`p-4 rounded-2xl border transition-all hover:shadow-md ${notif.type === 'warning' ? 'bg-orange-50 border-orange-100' :
                                                notif.type === 'error' ? 'bg-red-50 border-red-100' :
                                                    'bg-green-50 border-green-100'
                                                }`}
                                        >
                                            <p className={`text-sm font-semibold ${notif.type === 'warning' ? 'text-orange-800' :
                                                notif.type === 'error' ? 'text-red-800' :
                                                    'text-green-800'
                                                }`}>
                                                {notif.message}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-2">{notif.time}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Violation Detail Modal */}
            {selectedViolation && (
                <ViolationModal
                    report={selectedViolation.report}
                    ticket={selectedViolation.ticket}
                    onClose={() => setSelectedViolation(null)}
                    onAction={handleAction}
                />
            )}
        </div>
    );
};

export default StaffDashboard;
