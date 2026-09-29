import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import { Archive, User, CheckCircle, Clock, Search, ChevronDown, XCircle, Download, Printer } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Archives = () => {
    const userRole = JSON.parse(localStorage.getItem('user') || '{}').role || 'staff';
    const [violations, setViolations] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [logs, setLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All');
    // 'loading' until the first response, so an empty list isn't shown as "No Archived Records" too early
    const [loadState, setLoadState] = useState('loading'); // loading | ready | error

    useEffect(() => {
        fetchData();
        // Archives change rarely; refresh every 30 s instead of re-downloading everything every 5 s
        const poll = setInterval(fetchData, 30000);
        return () => clearInterval(poll);
    }, []);

    const fetchData = async () => {
        try {
            const [vResp, tResp, lResp] = await Promise.all([
                fetch('/api/violations/'),
                fetch('/api/etickets/'),
                fetch('/api/timelogs/')
            ]);
            if (!vResp.ok || !tResp.ok || !lResp.ok) throw new Error('Server error');
            const [v, t, l] = await Promise.all([vResp.json(), tResp.json(), lResp.json()]);
            setViolations(v);
            setTickets(t);
            setLogs(l);
            setLoadState('ready');
        } catch (e) {
            console.error(e);
            // Keep showing data from an earlier load if there is some
            setLoadState((prev) => (prev === 'ready' ? prev : 'error'));
        }
    };

    // Cleared violations (the admin approved the photo of the signed ISO form), and approved cases with no
    // service hours. Served hours alone aren't enough: those stay on the dashboard until the ISO form is
    // approved. Dismissed cases aren't archived.
    const archivedViolations = violations.filter(v => {
        const status = (v.status || '').toLowerCase();
        if (status === 'cleared' || status === 'finished') return true;
        const ticket = tickets.find(t => t.violation_details?.id === v.id || t.violation === v.id);
        return status === 'completed' && !ticket;
    });

    // Opens an uploaded clearance photo (kind 'iso_form' or 'reflection') in a new tab
    const openClearanceFile = async (violation, kind, label) => {
        const win = window.open('', '_blank');
        try {
            const response = await fetch(`/api/violations/${violation.id}/clearance_proof/?kind=${kind}`);
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || `Couldn't load the ${label}.`);
            win.document.write(`<title>${label} - ${(violation.student_details?.name || '').replace(/</g, '')}</title><body style="margin:0;background:#0f172a;display:flex;justify-content:center"><img src="${data.image}" style="max-width:100%;height:auto"></body>`);
            win.document.close();
        } catch (e) {
            win?.close();
            alert(e.message === 'Failed to fetch' ? "Can't reach the server." : e.message);
        }
    };

    // Apply search & filter
    const filtered = archivedViolations.filter(v => {
        const matchesSearch = !searchTerm
            || v.student_details?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            || v.student_details?.student_id?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterType === 'All' || v.violation_type === filterType;
        return matchesSearch && matchesFilter;
    });

    const violationTypes = [...new Set(violations.map(v => v.violation_type))];

    const generatePDF = async () => {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

        try {
            const loadImage = (src) => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = src;
                });
            };

            const [ustpImg, osaImg] = await Promise.all([
                loadImage('/ustp.png').catch(() => null),
                loadImage('/osa-logo.jpg').catch(() => null)
            ]);

            if (ustpImg) {
                doc.addImage(ustpImg, 'PNG', 10, 8, 14, 14);
            }
            if (osaImg) {
                doc.addImage(osaImg, 'JPEG', 26, 8, 14, 14);
            }
        } catch (e) {
            console.log('Logo loading failed');
        }

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.text('UNIVERSITY OF SCIENCE AND TECHNOLOGY OF SOUTHERN PHILIPPINES', 44, 10.5);

        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.text('OFFICE OF STUDENT AFFAIRS - CAGAYAN DE ORO', 44, 13);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('COMMUNITY SERVICE LOG', 44, 18);

        doc.setFontSize(7.5);
        doc.text(`For the Month of: ${currentMonth}`, 287, 23.5, { align: 'right' });

        const formatDateShort = (dateStr) => {
            if (!dateStr) return '—';
            const d = new Date(dateStr);
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const yyyy = d.getFullYear();
            return `${mm}/${dd}/${yyyy}`;
        };

        const tableData = filtered.map((v) => {
            const student = v.student_details || {};
            const ticket = tickets.find(t => t.violation_details?.id === v.id || t.violation === v.id);
            const isDismissed = v.status?.toLowerCase() === 'dismissed';
            const ticketLogs = logs.filter(l => (l.eticket === ticket?.id || l.eticket?.id === ticket?.id));
            const totalServed = ticketLogs.reduce((sum, l) => sum + (l.duration_seconds || 0), 0);
            const servedHours = Math.floor(totalServed / 3600);

            const nameParts = (student.name || '').split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            return [
                student.student_id || '—',
                firstName.toUpperCase(),
                lastName.toUpperCase(),
                student.contact_number || '—',
                student.year_level || '—',
                student.course || '—',
                student.department || '—',
                v.violation_type || '—',
                formatDateShort(v.created_at),
                v.punishment || '—',
                (isDismissed || !ticket) ? 'N/A' : `${servedHours} hours`,
                isDismissed ? 'DISMISSED' : (v.status === 'Cleared' ? 'CLEARED' : 'COMPLETED')
            ];
        });

        // Add dummy rows to reach at least 20 slots (as requested)
        while (tableData.length < 20) {
            tableData.push(['', '', '', '', '', '', '', '', '', '', '', '']);
        }

        autoTable(doc, {
            head: [['ID NUMBER', 'FIRST NAME', 'LAST NAME', 'CONTACT NUMBER', 'YEAR LEVEL', 'COURSE/PROGRAM', 'COLLEGE', 'NATURE OF VIOLATION', 'DATE COMMITTED', 'PENALTY', 'HOURS SERVED', 'STATUS']],
            body: tableData,
            startY: 25,
            styles: {
                fontSize: 7,
                cellPadding: 1.0,
                halign: 'center',
                textColor: [0, 0, 0],
                lineWidth: 0.1,
                lineColor: [0, 0, 0]
            },
            headStyles: {
                fontSize: 6.5,
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                lineWidth: 0.15,
                lineColor: [0, 0, 0]
            },
            alternateRowStyles: { fillColor: [255, 255, 255] },
            margin: { left: 8, right: 8 },
            theme: 'grid'
        });

        doc.save(`OSA_Community_Service_Log_${new Date().toISOString().split('T')[0]}.pdf`);
    };
    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatDuration = (seconds) => {
        if (!seconds || seconds <= 0) return '—';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h}h`;
        return `${m}m`;
    };

    return (
        <div className="flex bg-slate-50 dark:bg-slate-900 min-h-screen">
            <Sidebar role={userRole} />
            <div className="flex-1 h-screen overflow-y-auto custom-scrollbar w-full">
                <main className="page-enter flex-1 px-4 pt-[76px] pb-8 md:p-10 lg:pt-10 w-full max-w-full">
                <header className="mb-6 md:mb-8">
                    <div className="flex justify-between items-center gap-4">
                        <div className="print:hidden min-w-0">
                            <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                                Violation Archives
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium text-sm">Immutable historical record of completed violations.</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3 print:hidden">
                            {/* Icon only on phones, so the button and the theme toggle fit beside the title */}
                            <button
                                onClick={generatePDF}
                                aria-label="Download PDF"
                                className="flex items-center gap-2 px-3 sm:px-5 py-3 bg-ustp-blue text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all"
                            >
                                <Download size={18} /> <span className="hidden sm:inline">Download PDF</span>
                            </button>
                            <ThemeToggle />
                        </div>
                    </div>
                </header>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 print:hidden">
                    <div className="flex-1 relative">
                        <Search size={18} className="absolute top-1/2 left-5 -translate-y-1/2 text-slate-300 dark:text-slate-600" />
                        <input
                            className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl py-4 pl-14 pr-6 text-sm font-semibold text-slate-600 dark:text-slate-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-ustp-blue"
                            placeholder="Search by name or student ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <select
                            className="w-full sm:w-auto appearance-none bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl py-4 pl-6 pr-12 text-sm font-semibold text-slate-600 dark:text-slate-400 outline-none focus:border-ustp-blue cursor-pointer"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="All">All Types</option>
                            {violationTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-300 dark:text-slate-600 pointer-events-none" />
                    </div>
                </div>

                {loadState === 'loading' ? (
                    <div className="py-32 text-center print:hidden">
                        <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-ustp-blue dark:border-slate-700 dark:border-t-blue-400" />
                        <h4 className="font-black text-slate-400 dark:text-slate-500 text-lg uppercase tracking-widest">Loading archives…</h4>
                    </div>
                ) : loadState === 'error' ? (
                    <div className="py-32 text-center print:hidden">
                        <XCircle className="mx-auto text-red-300 mb-6" size={56} />
                        <h4 className="font-black text-slate-500 dark:text-slate-400 text-lg uppercase tracking-widest">Couldn't load archives</h4>
                        <p className="text-slate-400 dark:text-slate-500 mt-3 font-medium">Check your connection, then try again.</p>
                        <button onClick={() => { setLoadState('loading'); fetchData(); }} className="mt-6 rounded-xl bg-ustp-blue px-6 py-3 text-xs font-black uppercase tracking-widest text-white">
                            Try again
                        </button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-32 text-center print:hidden">
                        <Archive className="mx-auto text-slate-200 mb-6" size={64} />
                        <h4 className="font-black text-slate-300 dark:text-slate-600 text-xl uppercase tracking-widest">No Archived Records</h4>
                        <p className="text-slate-400 dark:text-slate-500 mt-3 font-medium max-w-md mx-auto">
                            Violations appear here once the student has served the hours and you approve their signed ISO form and reflection paper on the dashboard.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2 print:hidden">
                        {filtered.map(violation => {
                            const isDismissed = violation.status?.toLowerCase() === 'dismissed';
                            const ticket = tickets.find(t => t.violation_details?.id === violation.id || t.violation === violation.id);
                            const ticketLogs = logs.filter(l => (l.eticket === ticket?.id || l.eticket?.id === ticket?.id));
                            const totalServedSeconds = ticketLogs.reduce((sum, l) => sum + (l.duration_seconds || 0), 0);

                            return (
                                <div key={violation.id} className={`bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 md:p-4 shadow-sm hover:shadow-md hover:border-slate-200 dark:border-slate-600 transition-all group ${isDismissed ? 'opacity-75' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${isDismissed ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'} group-hover:${isDismissed ? 'bg-red-100' : 'bg-emerald-100'} transition-colors`}>
                                            {isDismissed ? <XCircle className="text-red-500" size={20} /> : <CheckCircle className="text-emerald-500" size={20} />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight truncate">
                                                    {violation.student_details?.name || 'Unknown Student'}
                                                </h3>
                                                <span className={`${isDismissed ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'} text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap`}>
                                                    {isDismissed ? 'Dismissed' : violation.status === 'Cleared' ? 'Cleared' : 'Completed'}
                                                </span>
                                                {violation.photos_removed_at && (
                                                    <span title="The photos are deleted one year after a case is cleared, to save space. The record is kept." className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                                                        Photos removed
                                                    </span>
                                                )}
                                                {!violation.photos_removed_at && [['iso_form', 'ISO form'], ['reflection', 'Reflection paper']].map(([kind, label]) => violation[`${kind}_uploaded_at`] && (
                                                    <button key={kind} onClick={() => openClearanceFile(violation, kind, label)} className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap bg-blue-50 text-ustp-blue hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300">
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 font-medium truncate">
                                                <span>{violation.student_details?.student_id}</span>
                                                <span>•</span>
                                                <span>{violation.violation_type}</span>
                                                <span>•</span>
                                                <span>{violation.student_details?.course} / {violation.student_details?.department}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 items-center">
                                            {!isDismissed && (
                                                <>
                                                    <div className="text-center px-2 md:px-3 min-w-[70px]">
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Required</p>
                                                        <p className="text-sm font-black text-slate-800 dark:text-slate-200 tracking-tighter">{ticket?.total_hours_required || 0}h</p>
                                                    </div>
                                                    <div className="text-center px-2 md:px-3 border-l border-slate-100 dark:border-slate-700 min-w-[80px]">
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Served</p>
                                                        <p className="text-sm font-black text-emerald-600 tracking-tighter">{ticket ? formatDuration(totalServedSeconds) : 'N/A'}</p>
                                                    </div>
                                                </>
                                            )}
                                            <div className={`text-center ${!isDismissed ? 'px-2 md:px-3 border-l border-slate-100 dark:border-slate-700' : ''}`}>
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Date</p>
                                                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{formatDate(violation.created_at)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="hidden print:block" style={{ padding: '2mm', width: '100%', maxWidth: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex gap-0.5">
                            <img src="/ustp.png" alt="USTP" className="w-10 h-10 object-contain" />
                            <img src="/osa-logo.jpg" alt="OSA" className="w-10 h-10 object-contain" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-[7.5px] font-bold uppercase leading-none tracking-tight">University of Science and Technology of Southern Philippines</h1>
                            <h2 className="text-[6.5px] font-normal uppercase leading-tight">Office of Student Affairs - Cagayan de Oro</h2>
                            <h3 className="text-sm font-bold mt-0.5 tracking-tight">COMMUNITY SERVICE LOG</h3>
                        </div>
                        <div className="text-right self-end pb-0.5">
                            <p className="text-[7.5px] font-bold">For the Month of: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}</p>
                        </div>
                    </div>

                    <table className="w-full border-collapse border border-black text-[7px]" style={{ width: '100%' }}>
                        <thead>
                            <tr className="bg-white dark:bg-slate-800 text-black">
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">ID NUMBER</th>
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">FIRST NAME</th>
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">LAST NAME</th>
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">CONTACT NUMBER</th>
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">YEAR LEVEL</th>
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">COURSE/PROGRAM</th>
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">COLLEGE</th>
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">NATURE OF VIOLATION</th>
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">DATE COMMITTED</th>
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">PENALTY</th>
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">COMMUNITY SERVED</th>
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const rows = [...filtered];
                                while (rows.length < 20) rows.push({ id: `dummy-${rows.length}`, isDummy: true });
                                return rows.map((v) => {
                                    if (v.isDummy) {
                                        return (
                                            <tr key={v.id}>
                                                <td className="border border-black p-0.5 text-center">&nbsp;</td>
                                                <td className="border border-black p-0.5">&nbsp;</td>
                                                <td className="border border-black p-0.5">&nbsp;</td>
                                                <td className="border border-black p-0.5 text-center">&nbsp;</td>
                                                <td className="border border-black p-0.5 text-center">&nbsp;</td>
                                                <td className="border border-black p-0.5">&nbsp;</td>
                                                <td className="border border-black p-0.5">&nbsp;</td>
                                                <td className="border border-black p-0.5">&nbsp;</td>
                                                <td className="border border-black p-0.5 text-center">&nbsp;</td>
                                                <td className="border border-black p-0.5">&nbsp;</td>
                                                <td className="border border-black p-0.5 text-center">&nbsp;</td>
                                                <td className="border border-black p-0.5 text-center">&nbsp;</td>
                                            </tr>
                                        );
                                    }
                                const student = v.student_details || {};
                                const ticket = tickets.find(t => t.violation_details?.id === v.id || t.violation === v.id);
                                const isDismissed = v.status?.toLowerCase() === 'dismissed';
                                const ticketLogs = logs.filter(l => (l.eticket === ticket?.id || l.eticket?.id === ticket?.id));
                                const totalServed = ticketLogs.reduce((sum, l) => sum + (l.duration_seconds || 0), 0);
                                const servedHours = Math.floor(totalServed / 3600);
                                const nameParts = (student.name || '').split(' ');
                                const firstName = nameParts[0] || '';
                                const lastName = nameParts.slice(1).join(' ') || '';

                                const formatDatePrint = (dateStr) => {
                                    if (!dateStr) return '—';
                                    const d = new Date(dateStr);
                                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                                    const dd = String(d.getDate()).padStart(2, '0');
                                    const yyyy = d.getFullYear();
                                    return `${mm}/${dd}/${yyyy}`;
                                };

                                return (
                                    <tr key={v.id}>
                                        <td className="border border-black p-0.5 text-center">{student.student_id || '—'}</td>
                                        <td className="border border-black p-0.5">{firstName.toUpperCase()}</td>
                                        <td className="border border-black p-0.5">{lastName.toUpperCase()}</td>
                                        <td className="border border-black p-0.5 text-center">{student.contact_number || '—'}</td>
                                        <td className="border border-black p-0.5 text-center">{student.year_level || '—'}</td>
                                        <td className="border border-black p-0.5">{student.course || '—'}</td>
                                        <td className="border border-black p-0.5">{student.department || '—'}</td>
                                        <td className="border border-black p-0.5">{v.violation_type || '—'}</td>
                                        <td className="border border-black p-0.5 text-center">{formatDatePrint(v.created_at)}</td>
                                        <td className="border border-black p-0.5">{v.punishment || '—'}</td>
                                        <td className="border border-black p-0.5 text-center">{(isDismissed || !ticket) ? 'N/A' : `${servedHours} hours`}</td>
                                        <td className="border border-black p-0.5 text-center">{isDismissed ? 'DISMISSED' : (v.status === 'Cleared' ? 'CLEARED' : 'COMPLETED')}</td>
                                    </tr>
                                );
                            });
                        })()}
                        </tbody>
                    </table>
                </div>

                <style>{`
                    @media print {
                        .print\\:hidden { display: none !important; }
                        .print\\:block { display: block !important; }
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; background: white; }
                        * { box-sizing: border-box; }
                        main { padding: 0 !important; margin: 0 !important; }
                        @page { margin: 5mm; orientation: landscape; }
                    }
                `}</style>
            </main>
            </div>
        </div>
    );
};

export default Archives;
