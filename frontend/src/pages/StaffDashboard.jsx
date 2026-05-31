import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import QRCode from 'react-qr-code';
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
    ClipboardList,
    QrCode,
    CheckCircle
} from 'lucide-react';
import GlobalSearch from '../components/GlobalSearch';

/* ─── Violation Detail Modal ──────────────────────────────────────── */
const ViolationModal = ({ report, ticket, activeLog, onClose, onAction }) => {
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
        if (sl === 'finished') return 'bg-blue-100 text-blue-800';
        if (sl.includes('dismissed')) return 'bg-red-100 text-red-800';
        if (sl === 'completed') return 'bg-blue-100 text-blue-800';
        return 'bg-slate-100 text-slate-700 dark:text-slate-300';
    };

    const currentStatus = ticket ? ticket.status : report.status;
    const remainingHours = ticket?.remaining_hours;
    const isOngoing = ticket?.status === 'Ongoing';
    const isPending = (report.status || '').toLowerCase().includes('pending');

    const Row = ({ icon: Icon, label, value, accent }) => (
        <div className="flex items-center gap-4 p-4 border-b border-slate-200/60 dark:border-slate-800/60 last:border-0 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-100 dark:border-slate-700">
                <Icon size={18} className="text-ustp-blue dark:text-blue-400" />
            </div>
            <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">{label}</p>
                <p className={`text-sm font-bold mt-0.5 ${accent || 'text-slate-800 dark:text-slate-200'}`}>{value || '—'}</p>
            </div>
        </div>
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-800 rounded-[28px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 border-b border-blue-100 dark:border-slate-700/50 p-6 md:p-8 relative">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-[18px] bg-white dark:bg-slate-800 flex items-center justify-center shadow-md border border-blue-100 dark:border-slate-700">
                            <User size={26} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic leading-tight tracking-tight">
                                {student.name || 'Unknown Student'}
                            </h2>
                            <div className="flex items-center gap-3 mt-1.5">
                                <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black tracking-[0.15em] uppercase">
                                    {student.student_id || 'No ID'}
                                </p>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${statusColor(currentStatus)} shadow-sm`}>
                                    {currentStatus}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 md:p-8 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-6">
                    <div>
                        <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-3 ml-2">
                            <User size={12} /> Student Profile
                        </h4>
                        <div className="bg-slate-50 dark:bg-slate-900/40 rounded-[24px] border border-slate-200/80 dark:border-slate-700/60 overflow-hidden shadow-sm">
                            <Row icon={BookOpen} label="Course" value={student.course} />
                            <Row icon={MapPin} label="Department" value={student.department} />
                            <Row icon={Hash} label="Year Level" value={student.year_level} />
                        </div>
                    </div>

                    <div>
                        <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-3 ml-2">
                            <AlertTriangle size={12} /> Incident Details
                        </h4>
                        <div className="bg-slate-50 dark:bg-slate-900/40 rounded-[24px] border border-slate-200/80 dark:border-slate-700/60 overflow-hidden shadow-sm">
                            <Row icon={AlertTriangle} label="Violation Type" value={report.violation_type} accent="text-red-600 dark:text-red-400" />
                            <Row icon={FileText} label="Description" value={report.description || 'No description provided'} />
                            <Row icon={Hash} label="Offense Count" value={report.offense_count ? `#${report.offense_count} Offense` : '—'} />
                            <Row icon={Shield} label="Reported By" value={report.reporting_guard} />
                        </div>
                    </div>

                    <div>
                        <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-3 ml-2">
                            <Clock size={12} /> Time Log
                        </h4>
                        <div className="bg-slate-50 dark:bg-slate-900/40 rounded-[24px] border border-slate-200/80 dark:border-slate-700/60 overflow-hidden shadow-sm">
                            <Row icon={Calendar} label="Date Caught" value={caught.date} />
                            <Row icon={Clock} label="Time Caught" value={caught.time} />
                        </div>
                    </div>

                    {(report.punishment || isOngoing) && (
                        <div>
                            <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-3 ml-2">
                                <Award size={12} /> Required Action
                            </h4>
                            <div className="bg-slate-50 dark:bg-slate-900/40 rounded-[24px] border border-slate-200/80 dark:border-slate-700/60 overflow-hidden shadow-sm">
                                {report.punishment && (
                                    <Row icon={Award} label="Sanction" value={report.punishment} accent="text-blue-600 dark:text-blue-400" />
                                )}
                                {isOngoing && remainingHours !== undefined && remainingHours !== null && (
                                    <Row
                                        icon={Timer}
                                        label="Time Remaining"
                                        value={formatRemainingTime(remainingHours)}
                                        accent={remainingHours > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-200"}
                                    />
                                )}
                            </div>
                            
                            {activeLog && (activeLog.photo_proof_in || activeLog.photo_proof_out) && (
                                <div className="mt-6">
                                    <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-3 ml-2">
                                        <QrCode size={12} /> Proof of Action
                                    </h4>
                                    <div className="flex gap-4">
                                        {activeLog.photo_proof_in && (
                                            <div className="flex-1 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-[24px] border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 text-center">Time In</p>
                                                <img src={activeLog.photo_proof_in} alt="Time In Proof" className="w-full rounded-[16px] border border-slate-200 dark:border-slate-700 object-cover aspect-[3/4]" />
                                            </div>
                                        )}
                                        {activeLog.photo_proof_out && (
                                            <div className="flex-1 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-[24px] border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 text-center">Time Out</p>
                                                <img src={activeLog.photo_proof_out} alt="Time Out Proof" className="w-full rounded-[16px] border border-slate-200 dark:border-slate-700 object-cover aspect-[3/4]" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
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
                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
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
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 5) return 'Late Night';
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        if (hour < 21) return 'Good Evening';
        return 'Late Night';
    };

    const getSubGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) {
            const opts = [
                "Good morning! Ready to make today productive?",
                "Early start, nice! Let's keep things running smoothly.",
                "A new day, a new opportunity to serve."
            ];
            return opts[Math.floor(Math.random() * opts.length)];
        }
        if (hour >= 12 && hour < 17) {
            const opts = [
                "Good afternoon! How's everything going?",
                "Keep up the great work today.",
                "Staying on top of it all — that's the spirit."
            ];
            return opts[Math.floor(Math.random() * opts.length)];
        }
        if (hour >= 17 && hour < 22) {
            const opts = [
                "Good evening! Still keeping watch?",
                "The day isn't over yet. Keep going!",
                "Finishing strong today?"
            ];
            return opts[Math.floor(Math.random() * opts.length)];
        }
        const opts = [
            "Working late? Your dedication is showing.",
            "Burning the midnight oil, huh?",
            "Late-night shift detected. Stay sharp!",
            "Most people are asleep. You're still at it.",
            "Don't forget to rest after your shift."
        ];
        return opts[Math.floor(Math.random() * opts.length)];
    };

    const [subGreeting] = useState(() => getSubGreeting());
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
            const vResponse = await fetch('/api/violations/?t=' + Date.now());
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

            // 1. All Pending Reviews (Show all, regardless of date, sorted by newest)
            violations.filter(v => v.status.toLowerCase().includes('pending'))
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .forEach(v => {
                    const name = v.student_details?.name || 'A student';
                    newNotifications.push({
                        id: `pending-${v.id}`,
                        type: 'warning',
                        message: `Pending Review: ${name} (Action Required)`,
                        time: formatTimeAgo(v.created_at),
                        created_at: v.created_at
                    });
                });

            // 2. Completed Services (Today only)
            ticketsCompletedToday.forEach(t => {
                const name = t.student_details?.name || 'A student';
                newNotifications.push({
                    id: `completed-${t.id}`,
                    type: 'success',
                    message: `${name} completed their assigned community service`,
                    time: formatTimeAgo(t.updated_at),
                    created_at: t.updated_at
                });
            });

            // 3. Overdue Pending (Legacy warning)
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            violations.filter(v =>
                v.status.toLowerCase().includes('pending') &&
                new Date(v.created_at) < threeDaysAgo
            ).forEach(v => {
                const name = v.student_details?.name || 'A student';
                const days = Math.floor((new Date() - new Date(v.created_at)) / (1000 * 60 * 60 * 24));
                newNotifications.push({
                    id: `overdue-${v.id}`,
                    type: 'error',
                    message: `${name} has not completed their pending review for ${days} days`,
                    time: formatTimeAgo(v.created_at),
                    created_at: v.created_at
                });
            });

            // Sort all by date descending and take top 10
            const sortedNotifs = newNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setNotifications(sortedNotifs.slice(0, 10));

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

const userRole = JSON.parse(localStorage.getItem('user') || '{}').role || 'staff';

    return (
        <div className="flex bg-slate-50 dark:bg-slate-900 min-h-screen relative font-sans">
            <Sidebar role={userRole} />
            <div className="flex-1 h-screen overflow-y-auto custom-scrollbar w-full">
                <div className="sticky top-0 z-40 bg-slate-50 dark:bg-slate-900 px-6 md:px-10 pt-24 md:pt-10 pb-2 border-b border-transparent">
                    <GlobalSearch />
                </div>
                
                <div className="flex flex-col xl:flex-row w-full min-h-full">
                    {/* Main Content Area */}
                    <main className="flex-1 p-6 md:p-10 pt-0 md:pt-0 pb-10">
                        <header className="mb-6 text-center md:text-left shrink-0">
                            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{getGreeting()}, Admin!</h1>
                            <p className="text-slate-400 dark:text-slate-500 mt-1 font-medium text-sm italic">{subGreeting}</p>
                        </header>
 
                        <div className="space-y-6">
                            {/* ── Violators Feed ── */}
                            <div className="card-premium p-4 md:p-6">
                                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-50">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest text-[10px] text-blue-900">Violators Feed</h4>
                                </div>

                            <div className="mb-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search by name or student ID..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:border-ustp-blue focus:outline-none text-sm font-semibold text-slate-600 dark:text-slate-400 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {(() => {
                                    const activeViolators = violators.filter(report => {
                                        const status = (report.status || '').toLowerCase();
                                        const isDismissed = status === 'dismissed';
                                        const isCompleted = status === 'completed';
                                        const isPending = status.includes('pending');
                                        
                                        const ticket = allTickets.find(t => t.violation_details?.id === report.id || t.violation === report.id);
                                        const isTicketFinished = ticket && (
                                            ticket.status === 'Completed' || 
                                            ticket.status === 'Finished' || 
                                            (ticket.status !== 'Ongoing' && ticket.remaining_hours <= 0.001)
                                        );
                                        
                                        const matchesSearch = !searchTerm ||
                                            (report.student_details?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                            (report.student_details?.student_id?.toLowerCase().includes(searchTerm.toLowerCase()));

                                        return !isPending && !isDismissed && !isCompleted && !isTicketFinished && matchesSearch;
                                    });

                                    if (activeViolators.length === 0) {
                                        return (
                                            <div className="py-16 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                                                <Inbox className="mx-auto text-slate-200 dark:text-slate-700 mb-3" size={40} />
                                                <h5 className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-xs">No Active Violators</h5>
                                            </div>
                                        );
                                    }

                                    return activeViolators.map((report) => {
                                        const ticket = allTickets.find(t => t.violation_details?.id === report.id || t.violation === report.id);
                                        const isOngoing = ticket?.status === 'Ongoing';
                                        const isPending = (report.status || '').toLowerCase().includes('pending');

                                        return (
                                            <div
                                                key={report.id}
                                                className={`p-4 border shadow-sm rounded-3xl transition-all ${isOngoing ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}
                                            >
                                                <div className="flex gap-4 items-center">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 ${isOngoing ? 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'}`}>
                                                        {isOngoing ? <Clock size={20} className="animate-spin-slow" /> : <User size={20} />}
                                                    </div>

                                                    <div className="flex-1 overflow-hidden">
                                                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{report.student_details?.name || 'New Student Report'}</p>
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">{report.violation_type}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${isOngoing ? 'bg-green-200 text-green-800 dark:bg-green-500/20 dark:text-green-400' : isPending ? 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400' : 'bg-blue-50 text-blue-900 dark:bg-blue-500/20 dark:text-blue-400'}`}>
                                                                {ticket ? ticket.status : report.status}
                                                            </span>
                                                         </div>
                                                    </div>

                                                    <div className="flex gap-4 flex-shrink-0 relative z-10 items-center">
                                                        {isPending && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleAction(report.id, 'Approved')}
                                                                    title="Approve"
                                                                    className="flex items-center justify-center text-emerald-500 hover:text-emerald-600 transition-colors"
                                                                >
                                                                    <Check size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleAction(report.id, 'Dismissed')}
                                                                    title="Dismiss"
                                                                    className="flex items-center justify-center text-red-500 hover:text-red-600 transition-colors"
                                                                >
                                                                    <X size={18} />
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                const activeLog = logs.find(l => 
                                                                    (ticket && (l.eticket === ticket.id || l.eticket?.id === ticket.id)) && !l.time_out
                                                                );
                                                                setSelectedViolation({ report, ticket, activeLog });
                                                            }}
                                                            title="Details"
                                                            className="flex items-center justify-center text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                                                        >
                                                            <Eye size={18} />
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
                <aside className="w-96 p-6 pt-0 border-l border-transparent dark:border-transparent bg-transparent hidden xl:block">
                    <div className="sticky top-6 space-y-6">
                        {/* Today's Activity Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700 p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                                    <Calendar size={24} className="text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base uppercase tracking-wider">Today's Activity</h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">{new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-500/10 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle size={20} className="text-red-500 dark:text-red-400" />
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Violations Today</span>
                                    </div>
                                    <span className="text-2xl font-black text-red-600 dark:text-red-400">{todayStats.violations}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <ClipboardList size={20} className="text-amber-600 dark:text-amber-400" />
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Services Assigned</span>
                                    </div>
                                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{todayStats.assigned}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-500/10 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <UserCheck size={20} className="text-green-600 dark:text-green-400" />
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Completed Service</span>
                                    </div>
                                    <span className="text-2xl font-black text-green-600 dark:text-green-400">{todayStats.completed}</span>
                                </div>
                            </div>
                        </div>

                        {/* System Notifications Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700 p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                                    <Bell size={24} className="text-slate-600 dark:text-slate-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base uppercase tracking-wider">System Notifications</h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">{notifications.length} alerts</p>
                                </div>
                            </div>
                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {notifications.length === 0 ? (
                                    <div className="text-center py-10">
                                        <Bell size={40} className="mx-auto text-slate-200 mb-3" />
                                        <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">No notifications</p>
                                    </div>
                                ) : (
                                    notifications.map((notif) => (
                                        <div
                                            key={notif.id}
                                            className={`p-4 rounded-2xl border transition-all hover:shadow-md ${notif.type === 'warning' ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20' :
                                                notif.type === 'error' ? 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20' :
                                                    'bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20'
                                                }`}
                                        >
                                            <p className={`text-sm font-semibold ${notif.type === 'warning' ? 'text-orange-800 dark:text-orange-400' :
                                                notif.type === 'error' ? 'text-red-800 dark:text-red-400' :
                                                    'text-green-800 dark:text-green-400'
                                                }`}>
                                                {notif.message}
                                            </p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{notif.time}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>

            {/* Violation Detail Modal */}
            {selectedViolation && (
                <ViolationModal
                    report={selectedViolation.report}
                    ticket={selectedViolation.ticket}
                    activeLog={selectedViolation.activeLog}
                    onClose={() => setSelectedViolation(null)}
                    onAction={handleAction}
                />
            )}
        </div>
    );
};

export default StaffDashboard;
