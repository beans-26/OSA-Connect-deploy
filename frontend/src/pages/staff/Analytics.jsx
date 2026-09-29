import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import { Calendar, Download, Loader2, FileText } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import { MONTHS, PERIODS, BREAKDOWNS, STATUS_ORDER, buildReport, downloadReportPdf, statusGroup } from '../../lib/violationReport';
import { departmentShort } from '../../lib/academics';
import BreakdownBars, { BREAKDOWN_COLORS } from '../../components/BreakdownBars';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const STATUS_STYLES = {
    'Pending review': 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300',
    'Serving hours': 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
    'Hours completed': 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    Cleared: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
};

// Daily, monthly, quarterly and annual violation reports, each downloadable as a PDF
const ReportsPanel = ({ violations }) => {
    const now = new Date();
    const [period, setPeriod] = useState('monthly');
    const [sel, setSel] = useState({
        date: now.toLocaleDateString('en-CA'),
        month: now.getMonth(),
        quarter: Math.floor(now.getMonth() / 3) + 1,
        year: now.getFullYear(),
    });
    const [downloading, setDownloading] = useState(false);
    const trendRef = useRef(null);

    const report = buildReport(violations, period, sel);
    const years = [...new Set([now.getFullYear(), ...violations.map((v) => new Date(v.created_at).getFullYear()).filter(Boolean)])].sort((a, b) => b - a);
    const selectClass = 'px-3 py-2 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 focus:border-ustp-blue outline-none';

    const download = async () => {
        setDownloading(true);
        try {
            await downloadReportPdf(report, trendRef.current?.toBase64Image?.('image/png', 1));
        } catch (e) {
            console.error(e);
            alert("Couldn't make the PDF. Please try again.");
        } finally {
            setDownloading(false);
        }
    };

    const trendData = {
        labels: report.range.buckets.map((b) => b.label),
        datasets: [{
            label: 'Violations',
            data: report.trend,
            backgroundColor: 'rgba(220, 38, 38, 0.8)',
            hoverBackgroundColor: '#dc2626',
            borderRadius: 6,
            maxBarThickness: 28,
        }],
    };

    return (
        <div className="page-enter space-y-6">
            <div className="card-premium p-4 md:p-6">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
                        {PERIODS.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => setPeriod(p.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${period === p.id ? 'bg-ustp-blue text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {period === 'daily' && (
                            <input type="date" aria-label="Day" value={sel.date} onChange={(e) => e.target.value && setSel({ ...sel, date: e.target.value })} className={selectClass} />
                        )}
                        {period === 'monthly' && (
                            <select aria-label="Month" value={sel.month} onChange={(e) => setSel({ ...sel, month: Number(e.target.value) })} className={selectClass}>
                                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                            </select>
                        )}
                        {period === 'quarterly' && (
                            <select aria-label="Quarter" value={sel.quarter} onChange={(e) => setSel({ ...sel, quarter: Number(e.target.value) })} className={selectClass}>
                                {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q} ({MONTHS[(q - 1) * 3].slice(0, 3)}–{MONTHS[(q - 1) * 3 + 2].slice(0, 3)})</option>)}
                            </select>
                        )}
                        {period !== 'daily' && (
                            <select aria-label="Year" value={sel.year} onChange={(e) => setSel({ ...sel, year: Number(e.target.value) })} className={selectClass}>
                                {years.map((y) => <option key={y} value={y}>{y}</option>)}
                            </select>
                        )}
                        <button
                            onClick={download}
                            disabled={downloading}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest shadow-md disabled:opacity-60"
                        >
                            {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Download PDF
                        </button>
                    </div>
                </div>
                <p className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                    <Calendar size={15} className="text-ustp-blue dark:text-blue-400" /> {report.range.label}
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-2xl border-2 border-red-100 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">Total Reports</p>
                    <p className="mt-1 text-3xl font-black text-red-700 dark:text-red-300">{report.total}</p>
                </div>
                <div className="rounded-2xl border-2 border-indigo-100 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Students</p>
                    <p className="mt-1 text-3xl font-black text-indigo-700 dark:text-indigo-300">{report.students}</p>
                </div>
                {STATUS_ORDER.filter((s) => s !== 'Dismissed').map((s) => (
                    <div key={s} className={`rounded-2xl p-4 ${STATUS_STYLES[s]}`}>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{s}</p>
                        <p className="mt-1 text-3xl font-black">{report.statusCounts[s] || 0}</p>
                    </div>
                ))}
            </div>

            <div className="card-premium p-4 md:p-6">
                <h4 className="mb-4 font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-xs">{report.range.trendTitle}</h4>
                <div className="h-64">
                    <Bar
                        ref={trendRef}
                        data={trendData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            animation: false,
                            plugins: { legend: { display: false } },
                            scales: {
                                y: { beginAtZero: true, ticks: { precision: 0, font: { weight: 'bold' } }, grid: { color: 'rgba(148,163,184,0.15)' } },
                                x: { grid: { display: false }, ticks: { font: { weight: 'bold', size: 10 }, autoSkip: true, maxRotation: 0 } },
                            },
                        }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {BREAKDOWNS.map((b) => (
                    <div key={b.id} className="card-premium p-4 md:p-6">
                        <h4 className="mb-4 font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-xs">By {b.label}</h4>
                        <BreakdownBars rows={report.breakdowns[b.id]} total={report.countedTotal} color={BREAKDOWN_COLORS[b.id]} />
                    </div>
                ))}
            </div>

            <div className="card-premium p-4 md:p-6">
                <h4 className="mb-4 flex items-center gap-2 font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-xs">
                    <FileText size={14} /> Violations in this period ({report.total})
                </h4>
                {report.total === 0 ? (
                    <p className="py-10 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 font-medium">No violations were reported in this period.</p>
                ) : (
                    <div className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                        {[...report.violations].filter((v) => statusGroup(v.status) !== 'Dismissed').reverse().map((v) => (
                            <div key={v.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{v.student_details?.name || 'Unknown'}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                        {v.violation_type} · {departmentShort(v.student_details?.department) || '—'} · {new Date(v.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                    </p>
                                </div>
                                <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUS_STYLES[statusGroup(v.status)] || 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300'}`}>
                                    {statusGroup(v.status)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// The admin Analytics page: the violation reports above (the old overview charts were the same data)
const Analytics = () => {
    const userRole = JSON.parse(localStorage.getItem('user') || '{}').role || 'staff';
    const [violations, setViolations] = useState([]);

    useEffect(() => {
        fetch('/api/violations/')
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => setViolations(Array.isArray(data) ? data : []))
            .catch((error) => console.error('Error fetching violations:', error));
    }, []);

    return (
        <div className="flex bg-slate-50 dark:bg-slate-900 min-h-screen">
            <Sidebar role={userRole} />
            <div className="flex-1 h-screen overflow-y-auto custom-scrollbar w-full">
                <main className="page-enter flex-1 px-4 pt-[76px] pb-8 md:p-10 lg:pt-10 w-full max-w-full">
                    <header className="mb-6 md:mb-8 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Analytics</h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Violation reports by day, month, quarter or year.</p>
                        </div>
                        <ThemeToggle />
                    </header>

                    <ReportsPanel violations={violations} />
                </main>
            </div>
        </div>
    );
};

export default Analytics;
