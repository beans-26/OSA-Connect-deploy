import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { Clock, AlertTriangle, Filter, Search } from 'lucide-react';

const GuardHistory = () => {
    const [violations, setViolations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchViolations();
        const interval = setInterval(fetchViolations, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchViolations = async () => {
        try {
            const response = await fetch('/api/violations/');
            if (response.ok) {
                const data = await response.json();
                setViolations(data.reverse());
            }
        } catch (error) {
            console.error('Failed to fetch violations:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredViolations = violations.filter(v => {
        const matchesSearch = 
            v.student_details?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.student_details?.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.violation_type?.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (filter === 'all') return matchesSearch;
        if (filter === 'pending') return matchesSearch && v.status === 'Pending OSA Review';
        if (filter === 'approved') return matchesSearch && v.status === 'Approved';
        if (filter === 'dismissed') return matchesSearch && v.status === 'Dismissed';
        return matchesSearch;
    });

    const statusCounts = {
        all: violations.length,
        pending: violations.filter(v => v.status === 'Pending OSA Review').length,
        approved: violations.filter(v => v.status === 'Approved').length,
        dismissed: violations.filter(v => v.status === 'Dismissed').length,
    };

    return (
        <div className="flex bg-slate-50 min-h-screen">
            <Sidebar role="guard" />
            <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto overflow-y-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Violation History</h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        {loading ? 'Loading...' : `Viewing ${filteredViolations.length} violation records`}
                    </p>
                </header>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name, student ID, or violation..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                        />
                    </div>
                    <div className="flex gap-2">
                        {['all', 'pending', 'approved', 'dismissed'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
                                    filter === f 
                                    ? 'bg-ustp-blue text-white' 
                                    : 'bg-white text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)} ({statusCounts[f]})
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin w-12 h-12 border-4 border-ustp-blue border-t-transparent rounded-full mx-auto"></div>
                        <p className="mt-4 text-slate-500 font-medium">Loading violations...</p>
                    </div>
                ) : filteredViolations.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                        <Clock className="mx-auto text-slate-200 mb-4" size={48} />
                        <h5 className="font-bold text-slate-400 uppercase tracking-[0.2em] text-xs">No Violations Found</h5>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredViolations.map((report) => (
                            <div key={report.id} className="card-premium p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-bold text-lg text-slate-800">
                                                {report.student_details?.name || 'Unknown Student'}
                                            </h3>
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                                                report.status === 'Pending OSA Review' ? 'bg-yellow-100 text-yellow-800' :
                                                report.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                                report.status === 'Dismissed' ? 'bg-red-100 text-red-800' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                                {report.status || 'Pending'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500">
                                            Student ID: {report.student_details?.student_id || report.student_id || 'N/A'}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            Course: {report.student_details?.course || 'N/A'} - {report.student_details?.department || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-ustp-blue uppercase">{report.violation_type}</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {report.created_at ? new Date(report.created_at).toLocaleString() : 'N/A'}
                                        </p>
                                        <p className="text-xs text-slate-400">Guard: {report.reporting_guard}</p>
                                    </div>
                                </div>
                                {report.description && (
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <p className="text-sm text-slate-600">{report.description}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default GuardHistory;
