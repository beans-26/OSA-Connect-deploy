import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { Users, Search, Plus, X, QrCode, Download, Edit } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Shield, AlertCircle, CheckCircle2, Send, Clock, LocateFixed } from 'lucide-react';

const COURSES = [
    "BS Civil Engineering",
    "BS Electronics Engineering",
    "BS Electrical Engineering",
    "BS Mechanical Engineering",
    "BS Computer Engineering",
    "BS Geodetic Engineering",
    "BS Food Technology",
    "BS Information Technology",
    "BS Computer Science",
    "BS Data Science",
    "BS Technology Communication Management",
    "BS Applied Physics",
    "BS Applied Mathematics",
    "BS Chemistry",
    "BS Environmental Science",
    "BS Secondary Education Major in Science",
    "Major in Mathematics",
    "B. Tech & Livelihood Education (Home Economics)",
    "B. Tech & Livelihood Education (Industrial Arts)",
    "Bachelor in Technical-Vocational Teacher Education Major in Computer System Servicing",
    "Major in Fashion and Garments",
    "Major in Food Service Management",
    "BS AutoTronics",
    "BS Electro-Mechanical Technology",
    "BS Electronics Technology",
    "BS Energy Systems and Management",
    "BS Manufacturing Engineering Technology",
    "College of Medicine",
    "Senior High School"
];

const DEPARTMENTS = [
    "College of Engineering and Architecture (CEA)",
    "College of Information Technology and Computing (CITC)",
    "College of Science and Mathematics (CSM)",
    "College of Science and Technology Education (CSTE)",
    "College of Technology (CT)",
    "College of Medicine (COM)",
    "Senior High School (SHS)"
];

const PRESET_LOCATIONS = [
    { name: 'OSA Admin Office (5-Foot Test)', lat: 8.4855, lng: 124.6564, radius: 2 },
    { name: 'CITC Dept (5-Foot Test)', lat: 8.4858, lng: 124.6562, radius: 2 },
    { name: 'CSM Dept (5-Foot Test)', lat: 8.4852, lng: 124.6568, radius: 2 },
    { name: 'Campus Grounds', lat: 8.4853, lng: 124.6568, radius: 100 },
];

const AllStudents = () => {
    const userRole = JSON.parse(localStorage.getItem('user') || '{}').role || 'staff';
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [newStudent, setNewStudent] = useState({
        student_id: '',
        name: '',
        course: '',
        department: '',
        year_level: '',
        email: '',
        contact_number: ''
    });
    const [editStudent, setEditStudent] = useState({
        student_id: '',
        name: '',
        course: '',
        department: '',
        year_level: '',
        email: '',
        contact_number: ''
    });
    const [selectedIds, setSelectedIds] = useState([]);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [bulkForm, setBulkForm] = useState({
        violation: 'Other',
        hours: 10,
        description: 'Failure to attend mandatory campus event',
        location_type: 'custom',
        lat: '',
        lng: '',
        radius: 100
    });

    useEffect(() => {
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

        fetchStudents();
        const interval = setInterval(fetchStudents, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleAddStudent = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const response = await fetch('/api/students/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newStudent)
            });

            if (response.ok) {
                const data = await response.json();
                setStudents([...students, data]);
                setShowAddModal(false);
                setNewStudent({
                    student_id: '',
                    name: '',
                    course: '',
                    department: '',
                    year_level: '',
                    email: '',
                    contact_number: ''
                });
            } else {
                alert('Failed to add student');
            }
        } catch (error) {
            console.error('Error adding student:', error);
            alert('Failed to add student');
        } finally {
            setSaving(false);
        }
    };

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

    const handleBulkReport = async (e) => {
        e.preventDefault();
        setSaving(true);
        const reporter = JSON.parse(localStorage.getItem('user') || '{}').full_name || 'Admin';

        try {
            const response = await fetch('/api/violations/bulk_create/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_ids: selectedIds,
                    violation: bulkForm.violation,
                    hours: bulkForm.hours,
                    description: bulkForm.description,
                    reporter: reporter,
                    lat: bulkForm.lat,
                    lng: bulkForm.lng,
                    radius: bulkForm.radius
                })
            });

            if (response.ok) {
                // Successfully reported
                setSelectedIds([]);
                setShowBulkModal(false);
            } else {
                alert('Bulk reporting failed');
            }
        } catch (error) {
            alert('Server error during bulk reporting');
        } finally {
            setSaving(false);
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredStudents.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredStudents.map(s => s.student_id));
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
        if (!dept) return 'N/A';
        const match = dept.match(/\(([^)]+)\)/);
        return match ? `(${match[1]})` : dept;
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
        .filter(student =>
            student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.course?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.department?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return (
        <div className="flex bg-slate-50 min-h-screen">
            <Sidebar role={userRole} />
            <main className="flex-1 p-10 max-w-7xl mx-auto overflow-y-auto">
                <header className="mb-12 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">All Students</h1>
                        <p className="text-slate-500 mt-2 font-medium">
                            {loading ? "Loading students..." : `Viewing ${filteredStudents.length} registered students`}
                        </p>
                    </div>
                    <div className="flex gap-4">
                        {selectedIds.length > 0 && (
                            <button
                                onClick={() => setShowBulkModal(true)}
                                className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 animate-in slide-in-from-right-4"
                            >
                                <Shield size={20} />
                                Bulk Report ({selectedIds.length})
                            </button>
                        )}
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 bg-ustp-blue text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                        >
                            <Plus size={20} />
                            Add Student
                        </button>
                    </div>
                </header>

                <div className="card-premium mb-8">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name, student ID, course, or department..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none transition-colors"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin w-12 h-12 border-4 border-ustp-blue border-t-transparent rounded-full mx-auto"></div>
                        <p className="mt-4 text-slate-500 font-medium">Loading students...</p>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                        <Users className="mx-auto text-slate-200 mb-4" size={48} />
                        <h5 className="font-bold text-slate-400 uppercase tracking-[0.2em] text-xs">No Students Found</h5>
                        {searchTerm && (
                            <p className="text-slate-400 text-sm mt-2">Try adjusting your search terms</p>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left bg-slate-50 border-b-2 border-slate-200">
                                    <th className="py-3 px-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded border-slate-300 text-ustp-blue focus:ring-ustp-blue"
                                        />
                                    </th>
                                    <th className="py-3 px-3 font-bold text-slate-600 uppercase tracking-wider text-xs">Student ID</th>
                                    <th className="py-3 px-3 font-bold text-slate-600 uppercase tracking-wider text-xs">Name</th>
                                    <th className="py-3 px-3 font-bold text-slate-600 uppercase tracking-wider text-xs">Course</th>
                                    <th className="py-3 px-3 font-bold text-slate-600 uppercase tracking-wider text-xs">Dept</th>
                                    <th className="py-3 px-3 font-bold text-slate-600 uppercase tracking-wider text-xs">Year</th>
                                    <th className="py-3 px-3 font-bold text-slate-600 uppercase tracking-wider text-xs">Email</th>
                                    <th className="py-3 px-3 font-bold text-slate-600 uppercase tracking-wider text-xs">Contact</th>
                                    <th className="py-3 px-3 font-bold text-slate-600 uppercase tracking-wider text-xs text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student) => (
                                    <tr key={student.id} className={`border-b border-slate-100 transition-colors ${selectedIds.includes(student.student_id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                                        <td className="py-2 px-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(student.student_id)}
                                                onChange={() => toggleSelect(student.student_id)}
                                                className="w-4 h-4 rounded border-slate-300 text-ustp-blue focus:ring-ustp-blue"
                                            />
                                        </td>
                                        <td className="py-2 px-2">
                                            <span className="text-xs text-blue-700 font-bold">{student.student_id}</span>
                                        </td>
                                        <td className="py-2 px-2">
                                            <span className="font-bold text-slate-800 text-sm">{student.name}</span>
                                        </td>
                                        <td className="py-2 px-2">
                                            <span className="text-xs text-slate-600 truncate max-w-[120px] block">{student.course || 'N/A'}</span>
                                        </td>
                                        <td className="py-2 px-2">
                                            <span className="text-xs text-slate-600">{getDeptAbbreviation(student.department)}</span>
                                        </td>
                                        <td className="py-2 px-2">
                                            <span className="text-xs text-slate-600">{student.year_level || 'N/A'}</span>
                                        </td>
                                        <td className="py-2 px-2">
                                            <span className="text-xs text-slate-500 truncate max-w-[120px] block">{student.email || 'N/A'}</span>
                                        </td>
                                        <td className="py-2 px-2">
                                            <span className="text-xs text-slate-500">{student.contact_number || 'N/A'}</span>
                                        </td>
                                        <td className="py-2 px-2">
                                            <div className="flex gap-1 justify-center">
                                                <button
                                                    onClick={() => { setSelectedIds([student.student_id]); setShowBulkModal(true); }}
                                                    className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded transition-colors flex items-center gap-1"
                                                >
                                                    <AlertCircle size={10} /> Report
                                                </button>
                                                <button
                                                    onClick={() => handleEditClick(student)}
                                                    className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleShowQR(student)}
                                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded transition-colors"
                                                >
                                                    QR
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
                    <p className="text-center text-slate-400 text-sm mt-8">
                        Showing {filteredStudents.length} of {students.length} students
                    </p>
                )}
            </main>

            {/* Add Student Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-900">Add New Student</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddStudent} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Student ID *</label>
                                <input
                                    type="text"
                                    required
                                    value={newStudent.student_id}
                                    onChange={(e) => setNewStudent({ ...newStudent, student_id: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    placeholder="e.g., 2023303188"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={newStudent.name}
                                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    placeholder="e.g., John Doe"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Course</label>
                                    <select
                                        value={newStudent.course}
                                        onChange={(e) => setNewStudent({ ...newStudent, course: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    >
                                        <option value="">Select Course</option>
                                        {COURSES.map(course => (
                                            <option key={course} value={course}>{course}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Department</label>
                                    <select
                                        value={newStudent.department}
                                        onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    >
                                        <option value="">Select Department</option>
                                        {DEPARTMENTS.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Year Level</label>
                                <select
                                    value={newStudent.year_level}
                                    onChange={(e) => setNewStudent({ ...newStudent, year_level: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                >
                                    <option value="">Select Year</option>
                                    <option value="1">1st Year</option>
                                    <option value="2">2nd Year</option>
                                    <option value="3">3rd Year</option>
                                    <option value="4">4th Year</option>
                                    <option value="5">5th Year</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={newStudent.email}
                                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    placeholder="e.g., john@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Number</label>
                                <input
                                    type="text"
                                    value={newStudent.contact_number}
                                    onChange={(e) => setNewStudent({ ...newStudent, contact_number: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    placeholder="e.g., 09351234567"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-ustp-blue text-white py-3 rounded-2xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Adding...' : 'Add Student'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {showQRModal && selectedStudent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-900">QR Code</h2>
                            <button onClick={() => setShowQRModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="bg-white p-4 rounded-2xl inline-block border-2 border-slate-100">
                            <QRCode
                                id="qr-code-svg"
                                value={formatQRData(selectedStudent)}
                                size={200}
                                level={"H"}
                            />
                        </div>
                        <div className="mt-4">
                            <p className="font-bold text-lg">{selectedStudent.name}</p>
                            <p className="text-slate-500">{selectedStudent.student_id}</p>
                            <p className="text-slate-400 text-sm">{selectedStudent.course} - {getDeptAbbreviation(selectedStudent.department)}</p>
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-900">Edit Student</h2>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateStudent} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Student ID *</label>
                                <input
                                    type="text"
                                    required
                                    value={editStudent.student_id}
                                    onChange={(e) => setEditStudent({ ...editStudent, student_id: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    placeholder="e.g., 2023303188"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={editStudent.name}
                                    onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    placeholder="e.g., John Doe"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Course</label>
                                    <select
                                        value={editStudent.course}
                                        onChange={(e) => setEditStudent({ ...editStudent, course: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    >
                                        <option value="">Select Course</option>
                                        {COURSES.map(course => (
                                            <option key={course} value={course}>{course}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Department</label>
                                    <select
                                        value={editStudent.department}
                                        onChange={(e) => setEditStudent({ ...editStudent, department: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    >
                                        <option value="">Select Department</option>
                                        {DEPARTMENTS.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Year Level</label>
                                <select
                                    value={editStudent.year_level}
                                    onChange={(e) => setEditStudent({ ...editStudent, year_level: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                >
                                    <option value="">Select Year</option>
                                    <option value="1">1st Year</option>
                                    <option value="2">2nd Year</option>
                                    <option value="3">3rd Year</option>
                                    <option value="4">4th Year</option>
                                    <option value="5">5th Year</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editStudent.email}
                                    onChange={(e) => setEditStudent({ ...editStudent, email: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    placeholder="e.g., john@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Number</label>
                                <input
                                    type="text"
                                    value={editStudent.contact_number}
                                    onChange={(e) => setEditStudent({ ...editStudent, contact_number: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    placeholder="e.g., 09351234567"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-ustp-blue text-white py-3 rounded-2xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Bulk Violation Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[32px] p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
                                    <Shield size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 uppercase">Bulk Reporting</h2>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{selectedIds.length} Students Selected</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowBulkModal(false); if (selectedIds.length === 1) setSelectedIds([]); }} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleBulkReport} className="space-y-6">
                            <div>
                                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 block">Violation Type</label>
                                <select
                                    value={bulkForm.violation}
                                    onChange={e => setBulkForm({ ...bulkForm, violation: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-ustp-blue"
                                >
                                    <option value="Failure to Attend Event">Failure to Attend Event</option>
                                    <option value="No ID">No ID</option>
                                    <option value="Improper wearing of ID">Improper Wearing of ID</option>
                                    <option value="Dress code violation">Dress Code</option>
                                    <option value="Littering">Littering</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 block">Required Community Service Hours</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={bulkForm.hours}
                                        onChange={e => setBulkForm({ ...bulkForm, hours: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pl-12 font-black text-lg focus:border-ustp-blue outline-none"
                                        placeholder="10"
                                    />
                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 block">Incident Description</label>
                                <textarea
                                    rows="1"
                                    value={bulkForm.description}
                                    onChange={e => setBulkForm({ ...bulkForm, description: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-medium focus:border-ustp-blue outline-none"
                                    placeholder="Provide details about the incident..."
                                />
                            </div>

                            {/* Geofencing is now handled automatically by Smart QR scan */}
                            <div className="bg-slate-900 p-6 rounded-[32px] text-center border-4 border-slate-800 shadow-2xl">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Automated Geofencing</p>
                                <p className="text-white text-xs font-medium leading-relaxed">Location and 5m radius will be applied automatically when the student scans a Department QR code.</p>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-red-600 text-white py-5 rounded-[24px] font-black uppercase text-sm tracking-widest hover:bg-red-700 shadow-xl shadow-red-200 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                            >
                                {saving ? "Processing..." : (
                                    <>
                                        <Send size={18} />
                                        Confirm & Submit Report
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllStudents;
