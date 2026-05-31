import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Activity, TrendingUp, Users, Calendar, AlertTriangle, CheckCircle, Clock, Filter, BarChart2 } from 'lucide-react';
import GlobalSearch from '../../components/GlobalSearch';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const TopViolationsChart = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="py-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-700">
                <BarChart2 className="mx-auto text-slate-200 mb-2" size={32} />
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">No Data</p>
            </div>
        );
    }

    const top = data.slice(0, 6);

    const COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#a855f7'];

    const chartData = {
        labels: top.map(d => d.violation_type),
        datasets: [{
            label: 'Reports',
            data: top.map(d => d.count),
            backgroundColor: top.map((_, i) => `${COLORS[i % COLORS.length]}cc`),
            borderColor: top.map((_, i) => COLORS[i % COLORS.length]),
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
        }],
    };

    const options = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 }, color: '#94a3b8' }, grid: { color: '#f1f5f9' } },
            y: { ticks: { font: { size: 10, weight: 'bold' }, color: '#475569' }, grid: { display: false } },
        },
    };

    return (
        <div style={{ height: `${Math.max(140, top.length * 40)}px` }}>
            <Bar data={chartData} options={options} />
        </div>
    );
};

const Analytics = () => {
    const userRole = JSON.parse(localStorage.getItem('user') || '{}').role || 'staff';
    const [activeTab, setActiveTab] = useState('overview');
    const [violations, setViolations] = useState([]);
    const [analyticsData, setAnalyticsData] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => {
        fetchViolations();
    }, []);

    const fetchViolations = async () => {
        try {
            const [vResponse, aResponse] = await Promise.all([
                fetch('/api/violations/'),
                fetch('/api/violations/analytics/')
            ]);
            const vData = await vResponse.json();
            const aData = await aResponse.json();
            setViolations(vData);
            setAnalyticsData(aData);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const getMonthlyViolations = () => {
        return violations.filter(v => {
            const created = new Date(v.created_at);
            return created.getMonth() === selectedMonth && created.getFullYear() === selectedYear;
        });
    };

    const getViolationTypes = () => {
        const typeCounts = {};
        violations.forEach(v => {
            const type = v.violation_type || 'Other';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        return typeCounts;
    };

    const monthlyViolations = getMonthlyViolations();
    const violationTypes = getViolationTypes();

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const pieData = {
        labels: Object.keys(violationTypes),
        datasets: [
            {
                data: Object.values(violationTypes),
                backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#a855f7'],
                hoverOffset: 20,
                borderWidth: 2,
                borderColor: '#ffffff',
            },
        ],
    };

    const barData = {
        labels: months,
        datasets: [
            {
                label: 'Violations Reported',
                data: months.map((_, idx) => violations.filter(v => new Date(v.created_at).getMonth() === idx).length),
                backgroundColor: 'rgba(30, 58, 138, 0.8)',
                hoverBackgroundColor: '#1e3a8a',
                borderRadius: 12,
                barThickness: 20,
            },
        ],
    };

    const analyticsTabs = [
        { id: 'overview', label: 'System Overview', icon: Activity },
        { id: 'monthly', label: 'Monthly Monitoring', icon: Calendar },
    ];

    return (
        <div className="flex bg-slate-50 dark:bg-slate-900 min-h-screen">
            <Sidebar role={userRole} />
            <div className="flex-1 flex">
            <div className="flex-1 h-screen overflow-y-auto custom-scrollbar w-full">
                <div className="sticky top-0 z-40 bg-slate-50 dark:bg-slate-900 px-6 md:px-10 pt-24 md:pt-10 pb-2 border-b border-transparent">
                    <GlobalSearch />
                </div>
                <main className="flex-1 p-6 md:p-10 pt-0 md:pt-0 w-full max-w-full">
                    <header className="mb-12">
                        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Analytics Dashboard</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Real-time trends and data-driven insights into campus compliance.</p>
                    </header>

                    <div className="flex gap-6 mb-10">
                        {analyticsTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-sm ${activeTab === tab.id
                                        ? 'bg-ustp-blue text-white shadow-lg'
                                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border-2 border-slate-100 dark:border-slate-700'
                                    }`}
                            >
                                <tab.icon size={18} className={activeTab === tab.id ? 'animate-pulse' : ''} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'overview' && (
                        <div className="space-y-10">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-1 card-premium p-8">
                                    <div className="flex items-center justify-between mb-8">
                                        <h4 className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-xs">Violation Types</h4>
                                        <div className="p-2 bg-red-50 text-red-500 rounded-lg">
                                            <AlertTriangle size={16} />
                                        </div>
                                    </div>
                                    <div className="h-72 flex items-center justify-center">
                                        {Object.keys(violationTypes).length > 0 ? (
                                            <Pie
                                                data={pieData}
                                                options={{
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    plugins: {
                                                        legend: {
                                                            position: 'bottom',
                                                            labels: {
                                                                padding: 20,
                                                                usePointStyle: true,
                                                                font: { size: 10, weight: 'bold' }
                                                            }
                                                        }
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <p className="text-slate-400 dark:text-slate-500 font-medium italic">No violation data recorded</p>
                                        )}
                                    </div>
                                </div>

                                <div className="lg:col-span-2 card-premium p-8">
                                    <div className="flex items-center justify-between mb-8">
                                        <h4 className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-xs">Annual Trend (2026)</h4>
                                        <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                                            <TrendingUp size={16} />
                                        </div>
                                    </div>
                                    <div className="h-72">
                                        <Bar
                                            data={barData}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: { legend: { display: false } },
                                                scales: {
                                                    y: {
                                                        beginAtZero: true,
                                                        ticks: { font: { weight: 'bold' }, stepSize: 5 },
                                                        grid: { color: '#f8fafc' }
                                                    },
                                                    x: {
                                                        grid: { display: false },
                                                        ticks: { font: { weight: 'bold', size: 10 } }
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="bg-indigo-50 dark:bg-indigo-500/10 border-2 border-indigo-100 dark:border-indigo-500/20 p-8 rounded-3xl shadow-sm transition-all">
                                    <Users size={32} className="text-indigo-400 dark:text-indigo-500 mb-4" />
                                    <p className="text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest text-[10px] mb-1">Total Violators</p>
                                    <h3 className="text-4xl font-black text-indigo-700 dark:text-indigo-300">
                                        {new Set(violations.map(v => v.student_details?.student_id)).size}
                                    </h3>
                                </div>
                                <div className="bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-100 dark:border-emerald-500/20 p-8 rounded-3xl shadow-sm transition-all">
                                    <Activity size={32} className="text-emerald-400 dark:text-emerald-500 mb-4" />
                                    <p className="text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest text-[10px] mb-1">Active Cases</p>
                                    <h3 className="text-4xl font-black text-emerald-700 dark:text-emerald-300">{violations.filter(v => v.status.toLowerCase().includes('pending') || v.status === 'Approved').length}</h3>
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 p-8 rounded-3xl shadow-sm transition-all">
                                    <TrendingUp size={32} className="text-slate-400 dark:text-slate-500 mb-4" />
                                    <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-1">Compliance Rate</p>
                                    <h3 className="text-4xl font-black text-slate-700 dark:text-slate-300">
                                        {violations.length > 0 ? Math.round((violations.filter(v => v.status === 'Completed').length / violations.length) * 100) : 0}%
                                    </h3>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'monthly' && (
                        <div className="space-y-8">
                            <div className="card-premium">
                                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-50">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest text-sm text-blue-900">Monthly Monitoring</h4>
                                    <div className="flex gap-4">
                                        <select
                                            value={selectedMonth}
                                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                            className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-semibold text-slate-600 dark:text-slate-400 focus:border-ustp-blue outline-none"
                                        >
                                            {months.map((month, idx) => (
                                                <option key={month} value={idx}>{month}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                            className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-semibold text-slate-600 dark:text-slate-400 focus:border-ustp-blue outline-none"
                                        >
                                            <option value={2026}>2026</option>
                                            <option value={2025}>2025</option>
                                            <option value={2024}>2024</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                    <div className="bg-orange-50 dark:bg-orange-500/10 border-2 border-transparent dark:border-orange-500/20 p-6 rounded-2xl transition-all">
                                        <div className="flex items-center gap-3 mb-2">
                                            <AlertTriangle className="text-orange-500 dark:text-orange-400" size={20} />
                                            <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase">Pending</span>
                                        </div>
                                        <p className="text-3xl font-black text-orange-700 dark:text-orange-300">
                                            {monthlyViolations.filter(v => v.status.toLowerCase().includes('pending')).length}
                                        </p>
                                    </div>
                                    <div className="bg-green-50 dark:bg-green-500/10 border-2 border-transparent dark:border-green-500/20 p-6 rounded-2xl transition-all">
                                        <div className="flex items-center gap-3 mb-2">
                                            <CheckCircle className="text-green-500 dark:text-green-400" size={20} />
                                            <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase">Approved</span>
                                        </div>
                                        <p className="text-3xl font-black text-green-700 dark:text-green-300">
                                            {monthlyViolations.filter(v => v.status === 'Approved').length}
                                        </p>
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-500/10 border-2 border-transparent dark:border-red-500/20 p-6 rounded-2xl transition-all">
                                        <div className="flex items-center gap-3 mb-2">
                                            <AlertTriangle className="text-red-500 dark:text-red-400" size={20} />
                                            <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">Dismissed</span>
                                        </div>
                                        <p className="text-3xl font-black text-red-700 dark:text-red-300">
                                            {monthlyViolations.filter(v => v.status === 'Dismissed').length}
                                        </p>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-500/10 border-2 border-transparent dark:border-blue-500/20 p-6 rounded-2xl transition-all">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Clock className="text-blue-500 dark:text-blue-400" size={20} />
                                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Total</span>
                                        </div>
                                        <p className="text-3xl font-black text-blue-700 dark:text-blue-300">
                                            {monthlyViolations.length}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h5 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest text-xs mb-4">Violations in {months[selectedMonth]} {selectedYear}</h5>
                                    {monthlyViolations.length === 0 ? (
                                        <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                                            <p className="text-slate-400 dark:text-slate-500 font-medium">No violations recorded for this month.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                            {monthlyViolations.map(v => (
                                                <div key={v.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-slate-200">{v.student_details?.name || 'Unknown'}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{v.violation_type}</p>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${v.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                                            v.status === 'Dismissed' ? 'bg-red-100 text-red-700' :
                                                                'bg-orange-100 text-orange-700'
                                                        }`}>
                                                        {v.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'violators' && (
                        <div className="space-y-8">
                            <div className="card-premium">
                                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-50">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest text-sm text-blue-900">Top Violators</h4>
                                </div>

                                {topViolators.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                                        <Users className="mx-auto text-slate-200 mb-4" size={48} />
                                        <p className="text-slate-400 dark:text-slate-500 font-medium">No violation data available.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {topViolators.map(([studentId, count], idx) => (
                                            <div key={studentId} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${idx === 0 ? 'bg-yellow-500' :
                                                        idx === 1 ? 'bg-slate-400' :
                                                            idx === 2 ? 'bg-amber-600' :
                                                                'bg-slate-300'
                                                    }`}>
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-slate-800 dark:text-slate-200">{studentId}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-black text-slate-700 dark:text-slate-300">{count}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">violations</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="card-premium">
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest text-sm text-blue-900 mb-6">Violation Types Distribution</h4>
                                <div className="h-80">
                                    <Pie data={pieData} options={{ maintainAspectRatio: false }} />
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
            </div>
        </div>
    );
};

export default Analytics;
