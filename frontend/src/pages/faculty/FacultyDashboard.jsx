import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, ClipboardList, Users, LogOut, MapPin, CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

const FacultyDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ total: 0, pending: 0, cleared: 0 });
    const [recentViolations, setRecentViolations] = useState([]);
    const [loading, setLoading] = useState(true);

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const vResponse = await fetch('/api/violations/');
            const vData = await vResponse.json();
            
            if (Array.isArray(vData)) {
                const pending = vData.filter(v => v.status === 'Pending OSA Review').length;
                const cleared = vData.filter(v => v.status === 'Cleared').length;
                setStats({ total: vData.length, pending, cleared });
                setRecentViolations(vData.slice(0, 5));
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending OSA Review': return 'bg-amber-100 text-amber-700';
            case 'Approved': return 'bg-blue-100 text-blue-700';
            case 'Dismissed': return 'bg-red-100 text-red-700';
            case 'Cleared': return 'bg-green-100 text-green-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-ustp-navy rounded-xl flex items-center justify-center shadow-lg">
                                <Shield className="text-ustp-gold" size={24} />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-slate-900">Faculty Portal</h1>
                                <p className="text-sm text-slate-500">Welcome, {user.full_name || user.username}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-semibold transition"
                        >
                            <LogOut size={18} />
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                                <ClipboardList className="text-blue-600" size={28} />
                            </div>
                            <div>
                                <p className="text-3xl font-black text-slate-900">{stats.total}</p>
                                <p className="text-sm text-slate-500 font-medium">Total Violations</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center">
                                <Clock className="text-amber-600" size={28} />
                            </div>
                            <div>
                                <p className="text-3xl font-black text-slate-900">{stats.pending}</p>
                                <p className="text-sm text-slate-500 font-medium">Pending Review</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                                <CheckCircle className="text-green-600" size={28} />
                            </div>
                            <div>
                                <p className="text-3xl font-black text-slate-900">{stats.cleared}</p>
                                <p className="text-sm text-slate-500 font-medium">Cleared</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Link
                        to="/faculty/report"
                        className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-ustp-blue/30 transition group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-ustp-blue/10 rounded-2xl flex items-center justify-center group-hover:bg-ustp-blue/20 transition">
                                <AlertTriangle className="text-ustp-blue" size={32} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Report Violation</h3>
                                <p className="text-sm text-slate-500">File a new violation report</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        to="/faculty/history"
                        className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-green-500/30 transition group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center group-hover:bg-green-100 transition">
                                <ClipboardList className="text-green-600" size={32} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900">View History</h3>
                                <p className="text-sm text-slate-500">View violation history</p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Recent Violations */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black text-slate-900">Recent Violations</h2>
                        <button
                            onClick={fetchData}
                            className="flex items-center gap-2 text-sm text-ustp-blue hover:text-blue-700 font-semibold"
                        >
                            <RefreshCw size={16} />
                            Refresh
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-12 text-slate-500">Loading...</div>
                    ) : recentViolations.length === 0 ? (
                        <div className="text-center py-12">
                            <CheckCircle className="mx-auto text-green-400 mb-4" size={48} />
                            <p className="text-slate-500">No violations recorded</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {recentViolations.map((violation) => (
                                <div key={violation.id || violation._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                                            <Users size={18} className="text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">{violation.student?.name || 'Unknown Student'}</p>
                                            <p className="text-sm text-slate-500">{violation.violation_type}</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(violation.status)}`}>
                                        {violation.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Location Tracking Section */}
                <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                        <MapPin className="text-ustp-blue" size={24} />
                        <h2 className="text-xl font-black text-slate-900">Student Location Tracking</h2>
                    </div>
                    <p className="text-slate-500 mb-4">
                        Monitor student geofence status and location compliance in real-time.
                    </p>
                    <div className="bg-slate-50 rounded-xl p-8 text-center">
                        <MapPin className="mx-auto text-slate-300 mb-3" size={48} />
                        <p className="text-slate-500 font-medium">Location tracking will be displayed here</p>
                        <p className="text-sm text-slate-400 mt-1">Students with active E-Tickets can be tracked</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default FacultyDashboard;
