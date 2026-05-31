import React, { useState, useEffect, useRef } from 'react';
import { Search, User, AlertTriangle, Moon, Sun, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GlobalSearch = () => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [students, setStudents] = useState([]);
    const [violations, setViolations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const wrapperRef = useRef(null);
    const navigate = useNavigate();

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = user.role;
    const userName = user.full_name || 'Admin User';
    
    // Get initials for avatar
    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AD';
    };

    useEffect(() => {
        // Check initial dark mode state
        if (document.documentElement.classList.contains('dark')) {
            setIsDarkMode(true);
        }
    }, []);

    const toggleDarkMode = () => {
        if (isDarkMode) {
            document.documentElement.classList.remove('dark');
            setIsDarkMode(false);
        } else {
            document.documentElement.classList.add('dark');
            setIsDarkMode(true);
        }
    };

    if (userRole !== 'admin') return null;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchResults = async () => {
            if (query.trim().length < 2) {
                setStudents([]);
                setViolations([]);
                return;
            }

            setLoading(true);
            try {
                const [studentsRes, violationsRes] = await Promise.all([
                    fetch('/api/students/'),
                    fetch('/api/violations/')
                ]);

                if (studentsRes.ok && violationsRes.ok) {
                    const allStudents = await studentsRes.json();
                    const allViolations = await violationsRes.json();

                    const searchStr = query.toLowerCase();

                    const filteredStudents = allStudents.filter(s => 
                        s.name?.toLowerCase().includes(searchStr) || 
                        s.student_id?.toLowerCase().includes(searchStr)
                    ).slice(0, 5); // Limit to 5 results

                    const filteredViolations = allViolations.filter(v => 
                        v.violation_type?.toLowerCase().includes(searchStr) ||
                        v.status?.toLowerCase().includes(searchStr) ||
                        v.reporter?.toLowerCase().includes(searchStr) ||
                        v.student_details?.student_id?.toLowerCase().includes(searchStr) ||
                        v.student_details?.name?.toLowerCase().includes(searchStr)
                    ).slice(0, 5); // Limit to 5 results

                    setStudents(filteredStudents);
                    setViolations(filteredViolations);
                    setIsOpen(true);
                }
            } catch (error) {
                console.error("Global search error:", error);
            } finally {
                setLoading(false);
            }
        };

        const debounceTimer = setTimeout(fetchResults, 300);
        return () => clearTimeout(debounceTimer);
    }, [query]);

    const handleStudentClick = (studentId) => {
        setIsOpen(false);
        navigate(`/admin/students`);
        // For a more advanced implementation, we could pass state or query params.
    };

    const handleViolationClick = (violation) => {
        setIsOpen(false);
        if (violation.status === 'Approved' || violation.status === 'Rejected') {
            navigate('/admin/archives');
        } else {
            navigate('/admin/pending');
        }
    };

    return (
        <div className="sticky top-0 -mt-6 md:-mt-10 pt-6 md:pt-10 pb-4 px-2 -mx-2 flex justify-between items-center w-full mb-4 z-50 bg-slate-50 dark:bg-slate-900/95 backdrop-blur-sm border-b border-transparent transition-colors duration-300">
            {/* Left side: Search Bar */}
            <div ref={wrapperRef} className="relative w-full max-w-lg">
                <div className="relative flex items-center">
                    <Search className="absolute left-4 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search students, courses, violation..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            if (e.target.value.length >= 2) setIsOpen(true);
                        }}
                        onFocus={() => { if (query.length >= 2) setIsOpen(true); }}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-ustp-blue focus:ring-4 focus:ring-ustp-blue/10 outline-none text-sm font-semibold text-slate-600 dark:text-slate-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm"
                    />
                    {query && (
                        <button 
                            onClick={() => { setQuery(''); setIsOpen(false); }}
                            className="absolute right-4 text-slate-400 hover:text-slate-600"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {isOpen && query.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col max-h-[80vh] md:max-h-[60vh] overflow-y-auto animate-in fade-in slide-in-from-top-2">
                        {loading ? (
                            <div className="p-6 text-center text-slate-500 font-bold text-sm dark:text-slate-400">
                                <div className="animate-spin w-6 h-6 border-2 border-ustp-blue border-t-transparent rounded-full mx-auto mb-2"></div>
                                Searching...
                            </div>
                        ) : (students.length === 0 && violations.length === 0) ? (
                            <div className="p-6 text-center text-slate-500 font-bold text-sm dark:text-slate-400">
                                No results found for "{query}"
                            </div>
                        ) : (
                            <div className="p-2 space-y-4">
                                {/* Students Section */}
                                {students.length > 0 && (
                                    <div>
                                        <div className="px-6 py-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Students ({students.length})</h3>
                                        </div>
                                        {students.map(student => (
                                            <button
                                                key={student.id}
                                                onClick={() => handleStudentClick(student.student_id)}
                                                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-50 dark:border-slate-700/50 last:border-0 cursor-pointer transition-colors group w-full text-left"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-300 group-hover:bg-ustp-blue/10 group-hover:text-ustp-blue transition-colors">
                                                    <User size={18} />
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{student.name}</h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-2 mt-0.5">
                                                        {student.student_id} • {student.course}
                                                    </p>
                                                </div>
                                                <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-1 rounded-md">
                                                    View
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Violations Section */}
                                {violations.length > 0 && (
                                    <div>
                                        <h3 className="px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 flex items-center gap-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/50">
                                            <AlertTriangle size={14} /> Violations
                                        </h3>
                                        {violations.map(violation => (
                                            <button
                                                key={violation.id}
                                                onClick={() => handleViolationClick(violation)}
                                                className="w-full text-left px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-50 dark:border-slate-700/50 transition-colors flex items-center justify-between group"
                                            >
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-slate-200 group-hover:text-red-500 transition-colors text-sm truncate max-w-[200px]">
                                                        {violation.violation_type}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[200px] mt-1">
                                                        {violation.student_details?.name} ({violation.student_details?.student_id})
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                                                        violation.status === 'Approved' ? 'bg-green-50 text-green-600' :
                                                        violation.status === 'Pending' ? 'bg-orange-50 text-orange-600' :
                                                        'bg-red-50 text-red-600'
                                                    }`}>
                                                        {violation.status}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center justify-end">
                <button 
                    onClick={toggleDarkMode}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isDarkMode 
                        ? 'bg-ustp-blue/10 border border-ustp-blue/20 hover:bg-ustp-blue/20' 
                        : 'bg-yellow-50 border border-yellow-200 hover:bg-yellow-100'
                    }`}
                >
                    {isDarkMode ? <Moon size={18} className="text-ustp-blue dark:text-blue-400" /> : <Sun size={20} className="text-yellow-500" />}
                </button>
            </div>
        </div>
    );
};

export default GlobalSearch;
