import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { Users, Search, Download, X } from 'lucide-react';
import QRCode from 'react-qr-code';
import ThemeToggle from '../../components/ThemeToggle';
import { useServiceSites } from '../../components/useServiceSites';
import ReportViolationModal from '../../components/ReportViolationModal';
import { DEPARTMENTS, DEPARTMENT_COURSES, yearLevelsFor, GENDERS } from '../../lib/academics';

// Course <option>s grouped under their department
const CourseOptions = () => DEPARTMENTS.map((dept) => (
    <optgroup key={dept} label={dept}>
        {DEPARTMENT_COURSES[dept].map((course) => <option key={course} value={course}>{course}</option>)}
    </optgroup>
));

const PRESET_LOCATIONS = [
    { name: 'OSA Admin Office (5-Foot Test)', lat: 8.4855, lng: 124.6564, radius: 2 },
    { name: 'CITC Dept (5-Foot Test)', lat: 8.4858, lng: 124.6562, radius: 2 },
    { name: 'CSM Dept (5-Foot Test)', lat: 8.4852, lng: 124.6568, radius: 2 },
    { name: 'Campus Grounds', lat: 8.4853, lng: 124.6568, radius: 100 },
];

const AllStudents = () => {
    const userRole = JSON.parse(localStorage.getItem('user') || '{}').role || 'staff';
    const [students, setStudents] = useState([]);
    // Bulk report buildings are the registered service sites (Settings > Service Sites)
    const serviceSites = useServiceSites();
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCourse, setFilterCourse] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [showQRModal, setShowQRModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [editStudent, setEditStudent] = useState({
        student_id: '',
        name: '',
        course: '',
        department: '',
        year_level: '',
        gender: '',
        email: '',
        contact_number: ''
    });
    // Grade 11/12 for SHS, Year 1–5 otherwise; an older saved value that isn't in the list still shows
    const editYearOptions = (() => {
        const options = yearLevelsFor(editStudent.department);
        const current = editStudent.year_level;
        return current && !options.some((y) => y.value === current) ? [...options, { value: current, label: current }] : options;
    })();
    // "Report Violation": one or more students by ID or name (components/ReportViolationModal.jsx)
    const [showReportModal, setShowReportModal] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchStudents = async () => {
        try {
            const response = await fetch('/api/students/');
            const data = await response.json();
            setStudents(data);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
        const interval = setInterval(fetchStudents, 5000);

        // Opened from the dashboard's report shortcut (?bulk=true)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('bulk') === 'true') {
            setShowReportModal(true);
            // Remove the param from URL without refreshing
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        return () => clearInterval(interval);
    }, []);



    const handleShowQR = (student) => {
        setSelectedStudent(student);
        setShowQRModal(true);
    };

    const handleEditClick = (student) => {
        setSelectedStudent(student);
        setEditStudent({
            student_id: student.student_id,
            name: student.name || '',
            course: student.course || '',
            department: student.department || '',
            year_level: student.year_level || '',
            gender: student.gender || '',
            email: student.email || '',
            contact_number: student.contact_number || ''
        });
        setShowEditModal(true);
    };

    const handleUpdateStudent = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const response = await fetch(`/api/students/${selectedStudent.student_id}/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editStudent)
            });

            if (response.ok) {
                const data = await response.json();
                setStudents(students.map(s => s.student_id === selectedStudent.student_id ? data : s));
                setShowEditModal(false);
            } else {
                alert('Failed to update student');
            }
        } catch (error) {
            console.error('Error updating student:', error);
            alert('Failed to update student');
        } finally {
            setSaving(false);
        }
    };

    const downloadQR = (student) => {
        const svg = document.getElementById('qr-code-svg');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        const qrData = formatQRData(student);

        img.onload = () => {
            canvas.width = 256;
            canvas.height = 256;
            ctx.drawImage(img, 0, 0);
            const pngFile = canvas.toDataURL('image/png');

            const downloadLink = document.createElement('a');
            downloadLink.download = `${student.student_id}_qr.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    const getDeptAbbreviation = (dept) => {
        if (!dept) return '—';
        const match = dept.match(/\(([^)]+)\)/);
        return match ? match[1] : dept;
    };
    // "4" -> "4th Year"; "Grade 11" stays
    const yearLabel = (year) => {
        const y = String(year || '').trim();
        if (!/^\d+$/.test(y)) return y;
        return `${y}${{ 1: 'st', 2: 'nd', 3: 'rd' }[y] || 'th'} Year`;
    };


    const formatQRData = (student) => {
        if (!student.name) return student.student_id;

        const nameParts = student.name.trim().split(/\s+/);
        let firstName = nameParts[0] || '';
        let middleInitial = '';
        let lastName = '';

        if (nameParts.length >= 2) {
            const lastPart = nameParts[nameParts.length - 1];
            if (lastPart.endsWith('.') || lastPart.length <= 3) {
                middleInitial = lastPart;
                lastName = nameParts.length > 2 ? nameParts[nameParts.length - 2] : '';
            } else {
                lastName = lastPart;
                middleInitial = nameParts.length > 2 ? nameParts[1] : '';
            }
        }

        const formattedName = `${firstName.toUpperCase()} ${middleInitial.toUpperCase()} ${lastName.toUpperCase()}`.trim();
        const course = student.course ? student.course.replace(/^BS|^BSIT|^BSCS|^BSCE|^BSEE|^BSME|^BSCpE/i, '').trim() : '';

        return `${student.student_id} ${formattedName} ${course}`.trim();
    };

    const filteredStudents = students
        .filter(student => {
            const matchesSearch = student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  student.student_id?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCourse = filterCourse ? student.course === filterCourse : true;
            const matchesYear = filterYear ? String(student.year_level) === filterYear : true;
            return matchesSearch && matchesCourse && matchesYear;
        })
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return (
        <div className="flex bg-slate-50 dark:bg-slate-900 min-h-screen">
            <Sidebar role={userRole} />
            <div className="flex-1 h-screen overflow-y-auto custom-scrollbar w-full">
                <main className="page-enter flex-1 px-4 pt-[76px] pb-8 md:p-10 lg:pt-10 w-full max-w-full">
                <header className="mb-6 flex justify-between items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">All Students</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                            {loading ? "Loading students..." : `Viewing ${filteredStudents.length} registered students`}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 md:gap-4">
                        <button
                            onClick={() => setShowReportModal(true)}
                            className="bg-red-600 text-white px-5 py-3 rounded-2xl font-bold text-sm hover:bg-red-700 transition-colors whitespace-nowrap"
                        >
                            Report Violation
                        </button>
                        <ThemeToggle />
                    </div>
                </header>

                <div className="card-premium mb-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
                            <input
                                type="text"
                                placeholder="Search by name or student ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-ustp-blue focus:outline-none text-sm font-semibold text-slate-600 dark:text-slate-400 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                        </div>
                        <select
                            value={filterCourse}
                            onChange={(e) => setFilterCourse(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 focus:border-ustp-blue focus:outline-none md:max-w-xs text-sm font-semibold text-slate-600 dark:text-slate-400"
                        >
                            <option value="">All Programs</option>
                            <CourseOptions />
                        </select>
                        <select
                            value={filterYear}
                            onChange={(e) => setFilterYear(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 focus:border-ustp-blue focus:outline-none md:w-36 text-sm font-semibold text-slate-600 dark:text-slate-400"
                        >
                            <option value="">All Years</option>
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                            <option value="5">5th Year</option>
                            <option value="Grade 11">Grade 11</option>
                            <option value="Grade 12">Grade 12</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin w-12 h-12 border-4 border-ustp-blue border-t-transparent rounded-full mx-auto"></div>
                        <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium">Loading students...</p>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-700">
                        <Users className="mx-auto text-slate-200 mb-4" size={48} />
                        <h5 className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-xs">No Students Found</h5>
                        {searchTerm && (
                            <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Try adjusting your search terms</p>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left bg-slate-50 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-600">
                                    <th className="py-3 pl-5 pr-3 font-bold text-slate-500 dark:text-slate-400 font-medium text-sm">Student</th>
                                    <th className="py-3 px-3 font-bold text-slate-500 dark:text-slate-400 font-medium text-sm">Gender</th>
                                    <th className="py-3 px-3 font-bold text-slate-500 dark:text-slate-400 font-medium text-sm">Course &amp; Year</th>
                                    <th className="py-3 px-3 font-bold text-slate-500 dark:text-slate-400 font-medium text-sm">Dept</th>
                                    <th className="py-3 px-3 font-bold text-slate-500 dark:text-slate-400 font-medium text-sm">Email</th>
                                    <th className="py-3 px-3 font-bold text-slate-500 dark:text-slate-400 font-medium text-sm">Contact</th>
                                    <th className="py-3 px-3 font-bold text-slate-500 dark:text-slate-400 font-medium text-sm text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student) => (
                                    <tr key={student.id} className="border-b border-slate-100 dark:border-slate-700/50 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="py-3 pl-5 pr-3">
                                            <div className="flex items-center gap-3 min-w-[200px]">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                                    {student.name ? student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??'}
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm block">{student.name}</span>
                                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{student.student_id}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className="text-sm text-slate-800 dark:text-slate-200 font-medium">{student.gender || '—'}</span>
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className="text-sm text-slate-800 dark:text-slate-200 font-medium block min-w-[180px]">{student.course || '—'}</span>
                                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{yearLabel(student.year_level) || '—'}</span>
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className="text-sm text-slate-800 dark:text-slate-200 font-semibold" title={student.department || ''}>{getDeptAbbreviation(student.department)}</span>
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{student.email || '—'}</span>
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className="text-sm text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap">{student.contact_number || '—'}</span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex justify-center items-center">
                                                <button
                                                    onClick={() => handleEditClick(student)}
                                                    title="Edit Student"
                                                    className="px-4 py-1.5 rounded-lg text-xs font-bold text-ustp-blue bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && students.length > 0 && (
                    <p className="text-center text-slate-400 dark:text-slate-500 text-sm mt-8">
                        Showing {filteredStudents.length} of {students.length} students
                    </p>
                )}
                </main>
            </div>


            {/* QR Code Modal */}
            {showQRModal && selectedStudent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm text-center">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">QR Code</h2>
                            <button onClick={() => setShowQRModal(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl inline-block border-2 border-slate-100 dark:border-slate-700">
                            <QRCode
                                id="qr-code-svg"
                                value={formatQRData(selectedStudent)}
                                size={200}
                                level={"H"}
                            />
                        </div>
                        <div className="mt-4">
                            <p className="font-bold text-lg">{selectedStudent.name}</p>
                            <p className="text-slate-500 dark:text-slate-400">{selectedStudent.student_id}</p>
                            <p className="text-slate-400 dark:text-slate-500 text-sm">{[selectedStudent.course, yearLabel(selectedStudent.year_level), getDeptAbbreviation(selectedStudent.department)].filter(Boolean).join(' · ')}</p>
                            {selectedStudent.gender && <p className="text-slate-400 dark:text-slate-500 text-sm">{selectedStudent.gender}</p>}
                        </div>
                        <button
                            onClick={() => downloadQR(selectedStudent)}
                            className="mt-4 w-full flex items-center justify-center gap-2 bg-ustp-blue text-white py-3 rounded-2xl font-bold hover:bg-blue-700 transition-colors"
                        >
                            <Download size={20} />
                            Download QR Code
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Student Modal */}
            {showEditModal && selectedStudent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Student</h2>
                            <button onClick={() => setShowEditModal(false)} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateStudent} className="space-y-4">
                            {/* Row 1: Student ID & Full Name */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Student ID *</label>
                                    <input
                                        type="text"
                                        required
                                        inputMode="numeric"
                                        maxLength={10}
                                        minLength={10}
                                        title="10 numbers, like 2023303188"
                                        value={editStudent.student_id}
                                        onChange={(e) => setEditStudent({ ...editStudent, student_id: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                        className="w-full px-4 py-2.5 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-ustp-blue focus:outline-none bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium"
                                        placeholder="e.g., 2023303188"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editStudent.name}
                                        onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })}
                                        className="w-full px-4 py-2.5 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-ustp-blue focus:outline-none bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium"
                                        placeholder="e.g., John Doe"
                                    />
                                </div>
                            </div>
                            {/* Row 2: Gender & Year Level */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Gender</label>
                                    <select
                                        value={editStudent.gender}
                                        onChange={(e) => setEditStudent({ ...editStudent, gender: e.target.value })}
                                        className="w-full px-4 py-2.5 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-ustp-blue focus:outline-none bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium"
                                    >
                                        <option value="">Not recorded</option>
                                        {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Year Level</label>
                                    <select
                                        value={editStudent.year_level}
                                        onChange={(e) => setEditStudent({ ...editStudent, year_level: e.target.value })}
                                        className="w-full px-4 py-2.5 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-ustp-blue focus:outline-none bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium"
                                    >
                                        <option value="">Select Year</option>
                                        {editYearOptions.map((y) => <option key={y.value} value={y.value}>{y.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            {/* Row 3: Course & Department */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Course</label>
                                    <select
                                        value={editStudent.course}
                                        onChange={(e) => setEditStudent({ ...editStudent, course: e.target.value })}
                                        className="w-full px-4 py-2.5 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-ustp-blue focus:outline-none bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium"
                                    >
                                        <option value="">Select Course</option>
                                        <CourseOptions />
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Department</label>
                                    <select
                                        value={editStudent.department}
                                        onChange={(e) => setEditStudent({ ...editStudent, department: e.target.value })}
                                        className="w-full px-4 py-2.5 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-ustp-blue focus:outline-none bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium"
                                    >
                                        <option value="">Select Department</option>
                                        {DEPARTMENTS.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {/* Row 4: Email & Contact */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Email</label>
                                    <input
                                        type="email"
                                        value={editStudent.email}
                                        onChange={(e) => setEditStudent({ ...editStudent, email: e.target.value })}
                                        className="w-full px-4 py-2.5 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-ustp-blue focus:outline-none bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium"
                                        placeholder="e.g., john@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Contact Number</label>
                                    <input
                                        type="text"
                                        value={editStudent.contact_number}
                                        onChange={(e) => setEditStudent({ ...editStudent, contact_number: e.target.value })}
                                        className="w-full px-4 py-2.5 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-ustp-blue focus:outline-none bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium"
                                        placeholder="e.g., 09351234567"
                                    />
                                </div>
                            </div>
                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 py-3 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 bg-ustp-blue text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showReportModal && (
                <ReportViolationModal
                    students={students}
                    serviceSites={serviceSites}
                    onClose={() => setShowReportModal(false)}
                    onReported={fetchStudents}
                />
            )}
        </div>
    );
};

export default AllStudents;
