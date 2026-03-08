import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import {
    Shield,
    Clock,
    History,
    Scan,
    AlertTriangle,
    Inbox,
    Key,
    Play,
    CheckCircle,
    X,
    QrCode
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const LiveTimer = ({ startTime }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    return <span className="font-mono text-green-600 font-black tracking-tighter">{formatTime(elapsed)}</span>;
};

const StudentDashboard = () => {
    const [violations, setViolations] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [logs, setLogs] = useState([]);

    const [loading, setLoading] = useState(true);
    const [showAdminCode, setShowAdminCode] = useState(false);
    const [adminCode, setAdminCode] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [showStopScanner, setShowStopScanner] = useState(false);
    const [timerActive, setTimerActive] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [elapsed, setElapsed] = useState(0);
    const [countdownTotal, setCountdownTotal] = useState(0);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const ADMIN_SECRET = "OSA-2026";

    useEffect(() => {
        fetchStudentData();
        const poll = setInterval(fetchStudentData, 1000);
        return () => clearInterval(poll);
    }, [user.username, tickets.length]);

    // Live countdown timer
    useEffect(() => {
        let interval;
        if (timerActive && startTime) {
            interval = setInterval(() => {
                const secondsSinceStart = Math.floor((Date.now() - startTime) / 1000);
                setElapsed(secondsSinceStart);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timerActive, startTime]);

    // QR Scanner Effect
    useEffect(() => {
        if (!isScanning) return;

        const scanner = new Html5QrcodeScanner("student-qr-reader", {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true
        });

        scanner.render((decodedText) => {
            scanner.clear();
            setIsScanning(false);
            processCode(decodedText);
        }, (err) => {
            // ignore
        });

        return () => {
            scanner.clear().catch(e => console.error("Scanner cleared:", e));
        };
    }, [isScanning]);

    // Stop QR Scanner Effect
    useEffect(() => {
        if (!showStopScanner) return;

        const scanner = new Html5QrcodeScanner("stop-qr-reader", {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true
        });

        scanner.render((decodedText) => {
            scanner.clear();
            setShowStopScanner(false);
            processStopCode(decodedText);
        }, (err) => {
            // ignore
        });

        return () => {
            scanner.clear().catch(e => console.error("Scanner cleared:", e));
        };
    }, [showStopScanner]);

    const fetchStudentData = async () => {
        if (!user.username) return;
        try {
            const vResponse = await fetch('/api/violations/');
            const allViolations = await vResponse.json();

            let allTickets = [];
            try {
                const tResponse = await fetch('/api/etickets/?t=' + Date.now());
                allTickets = await tResponse.json();
            } catch (e) { console.log('ETickets error', e); }

            let allLogs = [];
            try {
                const lResponse = await fetch('/api/timelogs/?t=' + Date.now());
                allLogs = await lResponse.json();
            } catch (e) { console.log('Timelogs error', e); }

            const studentViolations = allViolations.filter(v =>
                v.student_details?.student_id === user.username
            );

            const studentTickets = allTickets.filter(t =>
                t.violation_details?.student_details?.student_id === user.username && t.status !== 'Completed'
            );

            setViolations(studentViolations);
            setTickets(studentTickets);
            setLogs(allLogs);

            // Check for active Backend Timer
            if (studentTickets.length > 0) {
                const ongoingTicket = studentTickets.find(t => t.status === 'Ongoing') || studentTickets[0];
                const activeTicketId = ongoingTicket.id;
                const activeLog = allLogs.find(log =>
                    (log.eticket === activeTicketId || log.eticket?.id === activeTicketId) && !log.time_out
                );

                if (activeLog) {
                    setStartTime(new Date(activeLog.time_in).getTime());
                    setTimerActive(true);
                    setCountdownTotal(Math.round(ongoingTicket.remaining_hours * 3600));
                } else {
                    setTimerActive(false);
                    setStartTime(null);
                    setElapsed(0);
                }
            } else {
                setTimerActive(false);
                setStartTime(null);
                setElapsed(0);
                setCountdownTotal(0);
            }
        } catch (error) {
            console.error('Error fetching student data:', error);
        } finally {
            setLoading(false);
        }
    };

    const processCode = async (codeToProcess) => {
        const payloadCode = codeToProcess || adminCode;

        if (tickets.length === 0) {
            alert("No active Service Obligations to process.");
            return;
        }

        let actionType = null;

        if (payloadCode === "OSA-RESUME" || payloadCode === "OSA-START") {
            actionType = 'in';
        } else {
            alert("Invalid or Unrecognized Staff Action Code!");
            setShowAdminCode(false);
            setAdminCode('');
            return;
        }

        try {
            const ticketId = tickets[0].id;
            const response = await fetch('/api/timelogs/log_time/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eticket_id: ticketId,
                    action: actionType
                }),
            });

            if (response.ok) {
                setStartTime(Date.now());
                setTimerActive(true);
                setShowAdminCode(false);
                setAdminCode('');
            } else {
                alert("Sync Error: Backend rejected time log action.");
            }
        } catch (err) {
            alert("Network failure processing action code.");
        }
    };

    const processStopCode = async (codeToProcess) => {
        if (tickets.length === 0) {
            alert("No active Service Obligations to process.");
            return;
        }

        if (codeToProcess !== "OSA-PAUSE") {
            alert("Invalid code. Please scan the correct QR code to stop the timer.");
            return;
        }

        try {
            const ticketId = tickets[0].id;
            const response = await fetch('/api/timelogs/log_time/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eticket_id: ticketId,
                    action: 'out'
                }),
            });

            if (response.ok) {
                setTimerActive(false);
                setStartTime(null);
                setElapsed(0);
                fetchStudentData();
            } else {
                alert("Sync Error: Backend rejected time log action.");
            }
        } catch (err) {
            alert("Network failure processing action code.");
        }
    };

    const activeTicket = tickets.find(t => t.status === 'Ongoing') || tickets.find(t => t.status === 'Active');
    const displayHours = activeTicket ? activeTicket.remaining_hours : 0;

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    const formatRemainingTime = () => {
        if (!activeTicket) return '00:00:00';
        const hours = Math.floor(displayHours);
        const minutes = Math.floor((displayHours - hours) * 60);
        const seconds = Math.floor(((displayHours - hours) * 60 - minutes) * 60);
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const formatObligationTime = (hours) => {
        if (hours <= 0) return '0 hrs';
        if (hours >= 1) return `${Math.round(hours * 10) / 10} hrs`;
        const mins = Math.round(hours * 60);
        return `${mins} min`;
    };

    return (
        <div className="flex bg-slate-50 min-h-screen relative">
            {/* Action QR Scanner Overlay Modal */}
            {isScanning && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
                    <div className="bg-white rounded-3xl sm:rounded-[40px] p-6 sm:p-10 max-w-md w-full shadow-2xl relative overflow-hidden">
                        <button
                            onClick={() => setIsScanning(false)}
                            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors z-10"
                        >
                            <X size={20} />
                        </button>
                        <div className="text-center mb-6 sm:mb-8">
                            <h3 className="font-black text-xl sm:text-2xl text-slate-800 tracking-tight">Staff Code Scanner</h3>
                            <p className="text-xs sm:text-sm font-medium text-slate-400 mt-2">Scan OSA Staff Action Codes</p>
                        </div>
                        <div id="student-qr-reader" className="w-full rounded-2xl sm:rounded-3xl overflow-hidden border-4 border-slate-100"></div>
                    </div>
                </div>
            )}

            {/* Stop QR Scanner Overlay Modal */}
            {showStopScanner && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
                    <div className="bg-white rounded-3xl sm:rounded-[40px] p-6 sm:p-10 max-w-md w-full shadow-2xl relative overflow-hidden">
                        <button
                            onClick={() => setShowStopScanner(false)}
                            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors z-10"
                        >
                            <X size={20} />
                        </button>
                        <div className="text-center mb-6 sm:mb-8">
                            <h3 className="font-black text-xl sm:text-2xl text-red-600 tracking-tight">Stop Timer</h3>
                            <p className="text-xs sm:text-sm font-medium text-slate-400 mt-2">Scan QR code to pause your timer</p>
                        </div>
                        <div id="stop-qr-reader" className="w-full rounded-2xl sm:rounded-3xl overflow-hidden border-4 border-red-100"></div>
                    </div>
                </div>
            )}

            <Sidebar role="student" />
            <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto overflow-y-auto mobile-top-spacer">
                <header className="mb-6 sm:mb-8 lg:mb-10 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Service Hub</h1>
                        <p className="text-slate-500 mt-1 font-medium italic text-sm sm:text-base">Welcome back, {user.name || user.username || 'Student'}</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
                    {/* Left column: Service Obligation + Scanner */}
                    <div className="lg:col-span-4 space-y-6 lg:space-y-8 order-1 lg:order-1">
                        {/* Service Obligation Card */}
                        <div className="card-premium bg-slate-900 text-white relative overflow-hidden group p-6 sm:p-8 border-4 border-yellow-400/20">
                            <div className="relative z-10 text-center py-4 sm:py-6">
                                <p className="text-[10px] sm:text-xs uppercase font-black tracking-[0.3em] sm:tracking-[0.4em] text-yellow-400 mb-4 sm:mb-6 px-4 drop-shadow-sm">Service Obligation</p>
                                <div className="relative inline-block mt-2">
                                    <div className="text-4xl sm:text-5xl md:text-6xl font-mono text-yellow-400 font-black tracking-tighter drop-shadow-xl">{formatObligationTime(displayHours)}</div>
                                    <div className="text-[10px] font-black tracking-widest text-yellow-400/80 mt-2 uppercase">Remaining</div>
                                </div>
                            </div>
                        </div>

                        {/* Timer / Scanner Card */}
                        <div className="card-premium flex flex-col items-center justify-center gap-4 sm:gap-6 p-6 sm:p-8 border-2 border-white shadow-xl relative overflow-hidden">
                            {timerActive && (
                                <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400 animate-pulse shadow-[0_0_15px_rgba(255,184,28,0.5)]" />
                            )}

                            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-[24px] sm:rounded-[32px] flex items-center justify-center transition-all duration-500 ${timerActive ? 'bg-green-500 text-white shadow-2xl shadow-green-200 rotate-[360deg]' : 'bg-slate-50 text-slate-300'}`}>
                                {timerActive ? <Clock size={36} className="animate-spin-slow" /> : <Scan size={36} />}
                            </div>

                            <div className="text-center w-full">
                                <h4 className="font-black text-slate-900 text-lg sm:text-xl tracking-tight">
                                    {timerActive ? "SERVICE IN PROGRESS" : "DEVICE SCANNER"}
                                </h4>
                                {timerActive ? (
                                    <div className="w-full flex flex-col items-center">
                                        <div className="mt-2 font-mono text-2xl sm:text-3xl font-black text-green-600 tracking-tighter animate-pulse mb-4 sm:mb-6">
                                            {formatRemainingTime()}
                                        </div>
                                        <button
                                            onClick={() => setShowStopScanner(true)}
                                            className="w-full bg-red-50 text-red-600 border-2 border-red-200 font-black py-3 sm:py-4 rounded-xl shadow-sm uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all"
                                        >
                                            <QrCode size={16} /> Scan to Stop
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 mt-2 font-medium max-w-[200px] leading-relaxed mx-auto">
                                        {displayHours > 0 ? "Scan QR from OSA Staff to start service." : "No active service required at this time."}
                                    </p>
                                )}
                            </div>

                            {!showAdminCode && !timerActive && (
                                <div className="w-full grid grid-cols-2 gap-3 mt-2 sm:mt-4">
                                    <button
                                        onClick={() => setIsScanning(true)}
                                        className="w-full bg-blue-600 text-white font-black py-3 sm:py-4 rounded-xl shadow-lg shadow-blue-200 uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
                                    >
                                        <QrCode size={16} /> Scan QR
                                    </button>
                                    <button
                                        onClick={() => setShowAdminCode(true)}
                                        className="w-full bg-slate-900 text-white font-black py-3 sm:py-4 rounded-xl shadow-lg shadow-slate-200 uppercase tracking-widest text-[10px] flex flex-col items-center justify-center hover:bg-slate-800 transition-all leading-tight"
                                    >
                                        <Key size={14} className="mb-0.5" /> Manual<br />Code
                                    </button>
                                </div>
                            )}

                            {showAdminCode && (
                                <div className="w-full space-y-3 animate-in fade-in zoom-in duration-300 relative">
                                    <input
                                        type="password"
                                        placeholder="••••••••••••"
                                        autoFocus
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 sm:p-4 font-black text-center outline-none focus:border-blue-600 text-sm sm:text-base tracking-[0.5em]"
                                        value={adminCode}
                                        onChange={(e) => setAdminCode(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && processCode()}
                                        autoComplete="off"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={() => processCode()} className="flex-1 bg-blue-600 text-white font-black py-3 sm:py-4 rounded-xl text-[10px] uppercase shadow-lg shadow-blue-200/50 hover:bg-blue-700">Apply</button>
                                        <button onClick={() => { setShowAdminCode(false); setAdminCode(''); }} className="flex-1 bg-slate-100 text-slate-400 font-black py-3 sm:py-4 rounded-xl text-[10px] uppercase hover:bg-slate-200 hover:text-slate-600">Cancel</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right column: Violations */}
                    <div className="lg:col-span-8 space-y-6 lg:space-y-10 order-2 lg:order-2">
                        <div className="card-premium border-2 border-white shadow-xl">
                            <h4 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 lg:mb-10 pb-4 sm:pb-6 border-b border-slate-50">
                                <AlertTriangle className="text-red-500 shrink-0" size={22} />
                                <span className="leading-tight">OSAM REPOSITORY (Violations)</span>
                            </h4>

                            {loading ? (
                                <div className="py-16 sm:py-20 text-center animate-pulse text-slate-300 font-black uppercase tracking-[0.3em] text-[10px]">Syncing Records...</div>
                            ) : (() => {
                                const activeViolations = violations.filter(v => {
                                    const ticket = tickets.find(t => t.violation_details?.id === v.id || t.violation === v.id);
                                    return !ticket || ticket.status !== 'Completed';
                                });

                                if (activeViolations.length === 0) {
                                    return (
                                        <div className="bg-slate-50/50 rounded-3xl sm:rounded-[40px] p-12 sm:p-20 border-4 border-dotted border-slate-100 text-center">
                                            <Shield className="mx-auto text-slate-200 mb-4 sm:mb-6" size={48} />
                                            <h5 className="font-black text-slate-900 text-lg sm:text-xl tracking-tighter">CLEAN SLATE</h5>
                                            <p className="text-slate-400 text-sm mt-2 sm:mt-3 font-medium max-w-xs mx-auto leading-relaxed px-4">You currently have no recorded campus policy violations. Maintain this status!</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-3 sm:space-y-4">
                                        {activeViolations.map((v) => {
                                            const ticket = tickets.find(t => t.violation_details?.id === v.id || t.violation === v.id);
                                            const isOngoing = ticket?.status === 'Ongoing';

                                            return (
                                                <div key={v.id} className={`p-4 sm:p-6 border rounded-2xl sm:rounded-[32px] flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all ${isOngoing ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-slate-100 shadow-sm hover:shadow-md'}`}>
                                                    <div className="flex gap-4 sm:gap-6 items-center">
                                                        <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${isOngoing ? 'bg-green-500 text-white shadow-md' : 'bg-red-50 text-red-600'}`}>
                                                            {isOngoing ? <Clock size={24} className="animate-spin-slow" /> : <AlertTriangle size={24} />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h6 className="font-black text-slate-900 text-base sm:text-lg tracking-tight uppercase truncate">{v.violation_type}</h6>
                                                            <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
                                                                <span className={`text-[10px] font-black px-2 sm:px-3 py-1 rounded-full uppercase tracking-widest ${isOngoing ? 'bg-green-200 text-green-800' : 'bg-orange-100 text-orange-600'}`}>
                                                                    {ticket ? ticket.status : v.status}
                                                                </span>
                                                                <span className="text-[10px] text-slate-300 font-bold">{new Date(v.created_at).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center self-end sm:self-auto shrink-0 ${isOngoing ? 'bg-green-500 text-white' : 'bg-slate-50 text-slate-200'}`}>
                                                        {isOngoing ? <Clock size={18} className="animate-pulse" /> : <Play size={18} />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StudentDashboard;
