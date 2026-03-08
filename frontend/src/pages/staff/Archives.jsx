import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import { Archive, User, CheckCircle, Clock, Search, ChevronDown, XCircle, Download, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Archives = () => {
    const [violations, setViolations] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [logs, setLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [showDismissed, setShowDismissed] = useState(false);

    useEffect(() => {
        fetchData();
        const poll = setInterval(fetchData, 5000);
        return () => clearInterval(poll);
    }, []);

    const fetchData = async () => {
        try {
            const [vResp, tResp, lResp] = await Promise.all([
                fetch('/api/violations/'),
                fetch('/api/etickets/'),
                fetch('/api/timelogs/')
            ]);
            setViolations(await vResp.json());
            setTickets(await tResp.json());
            setLogs(await lResp.json());
        } catch (e) {
            console.error(e);
        }
    };

    // Show completed violations (those with a Completed ticket) AND dismissed violations
    const archivedViolations = violations.filter(v => {
        const isDismissed = v.status?.toLowerCase() === 'dismissed';
        const isCompletedStatus = v.status?.toLowerCase() === 'completed';
        const ticket = tickets.find(t => t.violation_details?.id === v.id || t.violation === v.id);
        const isCompletedTicket = ticket && ticket.status === 'Completed';
        return isDismissed || isCompletedStatus || isCompletedTicket;
    });

    // Apply search & filter
    const filtered = archivedViolations.filter(v => {
        const isDismissed = v.status?.toLowerCase() === 'dismissed';
        if (showDismissed && !isDismissed) return false;
        if (!showDismissed && isDismissed) return false;
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
            const [ustpImg, osaImg] = await Promise.all([
                fetch('/ustp.png').then(r => r.blob()).catch(() => null),
                fetch('/osa-logo.jpg').then(r => r.blob()).catch(() => null)
            ]);

            if (ustpImg) {
                const ustpUrl = URL.createObjectURL(ustpImg);
                doc.addImage(ustpUrl, 'PNG', 10, 8, 14, 14);
            }
            if (osaImg) {
                const osaUrl = URL.createObjectURL(osaImg);
                doc.addImage(osaUrl, 'JPG', 26, 8, 14, 14);
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
                isDismissed ? 'DISMISSED' : (ticket?.status === 'Completed' ? 'COMPLETED' : 'ONGOING')
            ];
        });

        autoTable(doc, {
            head: [['ID NUMBER', 'FIRST NAME', 'LAST NAME', 'CONTACT NUMBER', 'YEAR LEVEL', 'COURSE/PROGRAM', 'COLLEGE', 'NATURE OF VIOLATION', 'DATE COMMITTED', 'PENALTY', 'COMMUNITY SERVED', 'STATUS']],
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

    const handlePrint = () => {
        window.print();
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
        <div className="flex bg-slate-50 min-h-screen">
            <Sidebar role="staff" />
            <main className="flex-1 p-10 max-w-7xl mx-auto overflow-y-auto">
                <header className="mb-8">
                    <div className="flex justify-between items-end">
                        <div className="print:hidden">
                            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-4">
                                <Archive className="text-ustp-blue" size={36} /> Archives
                            </h1>
                            <p className="text-slate-500 mt-2 font-medium italic">Completed violations, dismissed cases, and service records.</p>
                        </div>
                        <div className="flex gap-3 print:hidden">
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                            >
                                <Printer size={18} /> Print
                            </button>
                            <button
                                onClick={generatePDF}
                                className="flex items-center gap-2 px-5 py-3 bg-ustp-blue text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all"
                            >
                                <Download size={18} /> Download PDF
                            </button>
                        </div>
                    </div>
                </header>

                <div className="flex gap-4 mb-6 print:hidden">
                    <button
                        onClick={() => setShowDismissed(false)}
                        className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all ${!showDismissed ? 'bg-ustp-blue text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200'}`}
                    >
                        Completed
                    </button>
                    <button
                        onClick={() => setShowDismissed(true)}
                        className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all ${showDismissed ? 'bg-red-500 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200'}`}
                    >
                        Dismissed
                    </button>
                </div>

                <div className="flex gap-4 mb-10 print:hidden">
                    <div className="flex-1 relative">
                        <Search size={18} className="absolute top-1/2 left-5 -translate-y-1/2 text-slate-300" />
                        <input
                            className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 pl-14 pr-6 font-bold outline-none focus:border-ustp-blue transition-colors"
                            placeholder="Search by name or student ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <select
                            className="appearance-none bg-white border-2 border-slate-100 rounded-2xl py-4 pl-6 pr-12 font-bold outline-none focus:border-ustp-blue cursor-pointer"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="All">All Types</option>
                            {violationTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-300 pointer-events-none" />
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="py-32 text-center print:hidden">
                        <Archive className="mx-auto text-slate-200 mb-6" size={64} />
                        <h4 className="font-black text-slate-300 text-xl uppercase tracking-widest">No Archived Records</h4>
                        <p className="text-slate-400 mt-3 font-medium max-w-md mx-auto">
                            Completed violations will appear here once their service obligation hours have been fully served.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4 print:hidden">
                        {filtered.map(violation => {
                            const isDismissed = violation.status?.toLowerCase() === 'dismissed';
                            const ticket = tickets.find(t => t.violation_details?.id === violation.id || t.violation === violation.id);
                            const ticketLogs = logs.filter(l => (l.eticket === ticket?.id || l.eticket?.id === ticket?.id));
                            const totalServedSeconds = ticketLogs.reduce((sum, l) => sum + (l.duration_seconds || 0), 0);

                            return (
                                <div key={violation.id} className={`bg-white border-2 border-slate-100 rounded-[28px] p-6 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all group ${isDismissed ? 'opacity-75' : ''}`}>
                                    <div className="flex items-center gap-6">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${isDismissed ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'} group-hover:${isDismissed ? 'bg-red-100' : 'bg-emerald-100'} transition-colors`}>
                                            {isDismissed ? <XCircle className="text-red-500" size={28} /> : <CheckCircle className="text-emerald-500" size={28} />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-black text-slate-900 text-lg tracking-tight truncate">
                                                    {violation.student_details?.name || 'Unknown Student'}
                                                </h3>
                                                <span className={`${isDismissed ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'} text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap`}>
                                                    {isDismissed ? 'Dismissed' : 'Completed'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-slate-400 font-medium">
                                                <span>{violation.student_details?.student_id}</span>
                                                <span>•</span>
                                                <span>{violation.violation_type}</span>
                                                <span>•</span>
                                                <span>{violation.student_details?.course} / {violation.student_details?.department}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-6 items-center">
                                            {!isDismissed && (
                                                <>
                                                    <div className="text-center px-4">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Required</p>
                                                        <p className="text-xl font-black text-slate-800 tracking-tighter">{ticket?.total_hours_required || 0}h</p>
                                                    </div>
                                                    <div className="text-center px-4 border-l border-slate-100">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Served</p>
                                                        <p className="text-xl font-black text-emerald-600 tracking-tighter">{ticket ? formatDuration(totalServedSeconds) : 'N/A'}</p>
                                                    </div>
                                                </>
                                            )}
                                            <div className={`text-center ${!isDismissed ? 'px-4 border-l border-slate-100' : ''}`}>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Date</p>
                                                <p className="text-sm font-bold text-slate-600">{formatDate(violation.created_at)}</p>
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
                            <tr className="bg-white text-black">
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
                            {filtered.map((v) => {
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
                                        <td className="border border-black p-0.5 text-center">{isDismissed ? 'DISMISSED' : (ticket?.status === 'Completed' ? 'COMPLETED' : 'ONGOING')}</td>
                                    </tr>
                                );
                            })}
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
    );
};

export default Archives;
