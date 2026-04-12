import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import {
    Users,
    AlertTriangle,
    Clock,
    CheckCircle,
    Shield,
    Activity,
    TrendingUp,
    Calendar,
    UserCheck,
    AlertCircle,
    Settings,
    RefreshCw
} from 'lucide-react';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalViolations: 0,
        pendingReviews: 0,
        activeTickets: 0,
        completedToday: 0,
        guards: 0,
        staff: 0,
        faculty: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [systemHealth, setSystemHealth] = useState({ online: true, lastSync: new Date() });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAdminData();
        const poll = setInterval(fetchAdminData, 10000);
        return () => clearInterval(poll);
    }, []);

    const fetchAdminData = async () => {
        try {
            const [violationsRes, ticketsRes, logsRes] = await Promise.all([
                fetch('/api/violations/').catch(() => ({ ok: false, json: async () => [] })),
                fetch('/api/etickets/').catch(() => ({ ok: false, json: async () => [] })),
                fetch('/api/timelogs/').catch(() => ({ ok: false, json: async () => [] }))
            ]);

            const violations = violationsRes.ok ? await violationsRes.json() : [];
            const tickets = ticketsRes.ok ? await ticketsRes.json() : [];
            const logs = logsRes.ok ? await logsRes.json() : [];

            const pending = violations.filter(v => v.status?.toLowerCase().includes('pending')).length;
            const activeTickets = tickets.filter(t => t.status === 'Ongoing').length;
            const today = new Date().toDateString();
            const completedToday = tickets.filter(t => {
                const updated = t.updated_at ? new Date(t.updated_at).toDateString() : '';
                return t.status === 'Completed' && updated === today;
            }).length;

            const uniqueStudents = new Set(violations.map(v => v.student_details?.student_id).filter(Boolean));

            setStats({
                totalStudents: uniqueStudents.size,
                totalViolations: violations.length,
                pendingReviews: pending,
                activeTickets,
                completedToday,
                guards: 3,
                staff: 2,
                faculty: 5
            });

            const activities = [
                ...violations.slice(0, 5).map(v => ({
                    id: v.id,
                    type: 'violation',
                    message: `${v.student_details?.name || 'Unknown'} - ${v.violation_type}`,
                    time: v.created_at,
                    status: v.status
                })),
                ...tickets.slice(0, 5).map(t => ({
                    id: t.id,
                    type: 'ticket',
                    message: `${t.student_details?.name || 'Unknown'} - ${t.punishment}`,
                    time: t.updated_at || t.created_at,
                    status: t.status
                }))
            ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

            setRecentActivity(activities);
            setSystemHealth({ online: true, lastSync: new Date() });
        } catch (error) {
            console.error('Error fetching admin data:', error);
            setSystemHealth({ online: false, lastSync: new Date() });
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

    const StatCard = ({ icon: Icon, label, value, color, bgColor }) => (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl ${bgColor} flex items-center justify-center shadow-lg`}>
                    <Icon className={color} size={28} />
                </div>
                <div>
                    <p className="text-3xl font-black text-slate-900">{loading ? '...' : value}</p>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex bg-slate-50 min-h-screen relative">
            <Sidebar role="admin" />
            <div className="flex-1 flex flex-col lg:flex-row">
                <main className="flex-1 p-4 md:p-10 pt-24 md:pt-10 max-w-7xl mx-auto overflow-y-auto">
                    <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight uppercase italic">
                                Admin Command Center
                            </h1>
                            <p className="text-slate-500 mt-2 font-medium">
                                {loading ? 'Loading system data...' : 'System overview and management'}
                            </p>
                        </div>
                        <button
                            onClick={fetchAdminData}
                            className="flex items-center gap-2 px-4 py-2 bg-ustp-blue text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </header>

                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                icon={Users}
                                label="Total Students"
                                value={stats.totalStudents}
                                color="text-blue-600"
                                bgColor="bg-blue-50"
                            />
                            <StatCard
                                icon={AlertTriangle}
                                label="Total Violations"
                                value={stats.totalViolations}
                                color="text-red-600"
                                bgColor="bg-red-50"
                            />
                            <StatCard
                                icon={Clock}
                                label="Pending Reviews"
                                value={stats.pendingReviews}
                                color="text-orange-600"
                                bgColor="bg-orange-50"
                            />
                            <StatCard
                                icon={CheckCircle}
                                label="Active Tickets"
                                value={stats.activeTickets}
                                color="text-green-600"
                                bgColor="bg-green-50"
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <StatCard
                                icon={Activity}
                                label="Completed Today"
                                value={stats.completedToday}
                                color="text-emerald-600"
                                bgColor="bg-emerald-50"
                            />
                            <StatCard
                                icon={Shield}
                                label="System Status"
                                value={systemHealth.online ? 'Online' : 'Offline'}
                                color={systemHealth.online ? 'text-green-600' : 'text-red-600'}
                                bgColor={systemHealth.online ? 'bg-green-50' : 'bg-red-50'}
                            />
                            <StatCard
                                icon={Calendar}
                                label="Last Sync"
                                value={formatTimeAgo(systemHealth.lastSync)}
                                color="text-slate-600"
                                bgColor="bg-slate-50"
                            />
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-slate-800 uppercase tracking-wider text-lg">User Roles Overview</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-blue-50 rounded-2xl">
                                    <Shield className="mx-auto text-blue-600 mb-2" size={32} />
                                    <p className="text-2xl font-black text-blue-700">{stats.guards}</p>
                                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Guards</p>
                                </div>
                                <div className="text-center p-4 bg-purple-50 rounded-2xl">
                                    <UserCheck className="mx-auto text-purple-600 mb-2" size={32} />
                                    <p className="text-2xl font-black text-purple-700">{stats.staff}</p>
                                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Staff</p>
                                </div>
                                <div className="text-center p-4 bg-indigo-50 rounded-2xl">
                                    <Users className="mx-auto text-indigo-600 mb-2" size={32} />
                                    <p className="text-2xl font-black text-indigo-700">{stats.faculty}</p>
                                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Faculty</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-slate-800 uppercase tracking-wider text-lg">Recent Activity</h3>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    {recentActivity.length} events
                                </span>
                            </div>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {recentActivity.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Activity className="mx-auto text-slate-200 mb-3" size={48} />
                                        <p className="text-slate-400 font-semibold">No recent activity</p>
                                    </div>
                                ) : (
                                    recentActivity.map((activity) => (
                                        <div
                                            key={activity.id}
                                            className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors"
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                activity.type === 'violation' ? 'bg-red-100' : 'bg-blue-100'
                                            }`}>
                                                {activity.type === 'violation' ? (
                                                    <AlertCircle className="text-red-600" size={20} />
                                                ) : (
                                                    <CheckCircle className="text-blue-600" size={20} />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-slate-800 text-sm">{activity.message}</p>
                                                <p className="text-xs text-slate-500 mt-1">{formatTimeAgo(activity.time)}</p>
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                                                activity.status?.toLowerCase().includes('pending') ? 'bg-orange-100 text-orange-700' :
                                                activity.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                activity.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                                {activity.status}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
                            <div className="flex items-center gap-4 mb-4">
                                <TrendingUp className="text-ustp-gold" size={28} />
                                <h3 className="font-bold uppercase tracking-wider">Quick Actions</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <a
                                    href="/staff/analytics"
                                    className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                                >
                                    <Activity size={24} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Analytics</span>
                                </a>
                                <a
                                    href="/staff/settings"
                                    className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                                >
                                    <Settings size={24} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Settings</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;
