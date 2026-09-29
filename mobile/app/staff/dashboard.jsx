import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, useWindowDimensions } from 'react-native';
import { showAlert } from '../../components/showAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import { AlertCircle, ScanLine, Send, CheckCircle2, LogOut, User, AlertTriangle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import SelectField from '../../components/SelectField';
import { onCameraResult } from '../../components/cameraResults';
import { parseStudentQr, NOT_A_STUDENT_QR } from '../../components/studentQr';
import api from '../../services/api';
import { useAuth } from '../../components/AuthContext';
import { useTheme } from '../../components/ThemeContext';
import { DEPARTMENTS, GENDERS, departmentForCourse, courseOptionsFor } from '../../constants/Data';

// Same options as the website's Guard Report (frontend/src/pages/guard/ReportViolation.jsx);
// values match PUNISHMENT_SYSTEM in backend/core/views.py
const VIOLATION_TYPES = [
    { label: 'Curfew Violation', value: 'Curfew Violation' },
    { label: 'No ID / Improper ID Sling', value: 'No ID / Improper ID Sling' },
    { label: 'No School Uniform', value: 'No School Uniform' },
    { label: 'Dress Code Violation', value: 'Dress Code Violation' },
];

const pad = (n) => String(n).padStart(2, '0');
const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const nowTime = () => {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const emptyForm = () => ({
    student_id: '', name: '', gender: '', course: '', department: '', contact: '',
    email: '', violation: '', incident_date: today(), incident_time: nowTime(),
});

export default function PersonnelDashboard() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const { colors, isDarkMode } = useTheme();
    const { width } = useWindowDimensions();
    const wide = width >= 768; // two columns like the website's md: breakpoint
    const styles = getStyles(colors, isDarkMode, wide);
    // No navigation header on this screen, so keep content below the status bar / notch
    const insets = useSafeAreaInsets();

    const [permission, requestPermission] = useCameraPermissions();
    const [loading, setLoading] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [alertMessage, setAlertMessage] = useState({ visible: false, title: '', message: '' });
    const [form, setForm] = useState(emptyForm);
    const debounceTimer = useRef(null);

    const reporterName = user?.full_name || user?.username || 'Personnel';

    const fetchStudentData = async (id) => {
        const cleanId = id?.trim();
        if (!cleanId || cleanId.length < 5) return;
        try {
            const { data } = await api.get(`/students/${cleanId}/`);
            if (!data) return;
            setForm((prev) => {
                // Ignore late responses for an ID that has since changed
                if (prev.student_id !== cleanId) return prev;
                return {
                    ...prev,
                    name: data.name || prev.name,
                    course: data.course || prev.course,
                    department: data.department || prev.department,
                    contact: data.contact_number || prev.contact,
                    email: data.email || prev.email,
                    gender: data.gender || prev.gender,
                };
            });
        } catch {
            // Not registered (yet); the guard fills in the details by hand
        }
    };

    const handleIdChange = (text) => {
        const cleanText = text.trim();
        setForm((prev) => ({ ...prev, student_id: cleanText }));
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        if (cleanText.length >= 5) {
            debounceTimer.current = setTimeout(() => fetchStudentData(cleanText), 500);
        }
    };

    const handleBarCodeScanned = async ({ data }) => {
        // The scanner already rejects non-student codes; this guards the form as well
        const student = parseStudentQr(data);
        if (!student) {
            setAlertMessage({ visible: true, title: 'Invalid QR Code', message: NOT_A_STUDENT_QR });
            return;
        }
        setForm((prev) => ({
            ...prev,
            student_id: student.studentId,
            name: student.name || prev.name,
            course: student.course || prev.course,
            // The QR only carries the course; its department follows from it
            department: departmentForCourse(student.course) || prev.department,
        }));
        await fetchStudentData(student.studentId);
    };

    const startScan = async () => {
        if (!permission) return;
        if (!permission.granted) {
            const { granted } = await requestPermission();
            if (!granted) {
                showAlert('Permission required', 'Camera access is needed to scan QR codes.');
                return;
            }
        }
        // The scanner is its own screen (app/staff/scan.jsx); it hands the result back here
        onCameraResult('scan', handleBarCodeScanned);
        router.push('/staff/scan');
    };

    // Same required fields as the website form
    const confirmSubmit = () => {
        const missing = ['student_id', 'name', 'gender', 'course', 'department', 'email', 'contact', 'violation'].some((k) => !String(form[k] || '').trim());
        if (missing) {
            setAlertMessage({ visible: true, title: 'Missing details', message: 'Fill in every field and choose the violation.' });
            return;
        }
        setShowConfirmModal(true);
    };

    const processSubmission = async () => {
        setShowConfirmModal(false);
        setLoading(true);
        try {
            await api.post('/violations/', { ...form, reporting_guard: reporterName });
            setSubmitted(true);
        } catch (error) {
            setAlertMessage({ visible: true, title: "Couldn't send the report", message: error.response?.data?.error || 'Check the details and try again.' });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm(emptyForm());
        setSubmitted(false);
    };

    const selectedViolationLabel = VIOLATION_TYPES.find((v) => v.value === form.violation)?.label || form.violation;

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + (wide ? 32 : 16) }]} keyboardShouldPersistTaps="handled">
                {/* Title with Log out beside it, same as the website header */}
                <View style={styles.pageHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.pageTitle}>Report a violation</Text>
                        <Text style={styles.pageSubtitle}>Signed in as {reporterName}</Text>
                    </View>
                    <View style={styles.pillRow}>
                        <TouchableOpacity style={styles.pill} onPress={logout} accessibilityLabel="Log Out">
                            <LogOut size={14} color={colors.danger} />
                            {wide && <Text style={[styles.pillText, { color: colors.danger }]}>Log out</Text>}
                        </TouchableOpacity>
                    </View>
                </View>

                {!submitted ? (
                    <View style={styles.card}>
                        <View style={styles.columns}>
                            {/* Left column: the student */}
                            <View style={styles.column}>
                                <View style={styles.cardHeader}>
                                    <User size={16} color={colors.primary} />
                                    <Text style={styles.cardTitle}>Student</Text>
                                </View>
                                <View>
                                    <Text style={styles.tinyLabel}>Student ID (type it or scan their QR)</Text>
                                    <View>
                                        <TextInput
                                            style={[styles.field, styles.idField]}
                                            placeholder="Student ID"
                                            placeholderTextColor={colors.border}
                                            value={form.student_id}
                                            onChangeText={handleIdChange}
                                            autoCapitalize="characters"
                                        />
                                        <TouchableOpacity style={styles.scanButton} onPress={startScan} accessibilityLabel="Scan student QR code">
                                            <ScanLine size={18} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <TextInput
                                    style={styles.field}
                                    placeholder="Full name"
                                    placeholderTextColor={colors.textMuted}
                                    value={form.name}
                                    onChangeText={(t) => setForm({ ...form, name: t })}
                                />
                                <SelectField
                                    value={form.gender}
                                    options={GENDERS}
                                    placeholder="Gender"
                                    title="Select Gender"
                                    onChange={(v) => setForm((prev) => ({ ...prev, gender: v }))}
                                    style={styles.field}
                                />
                                {/* Department first, then only its courses (same as registration).
                                    Side by side on wide screens; stacked on phones so long names fit */}
                                <View style={wide ? styles.row : styles.stack}>
                                    <SelectField
                                        value={form.department}
                                        options={DEPARTMENTS}
                                        placeholder="Department"
                                        title="Select Department"
                                        onChange={(v) => setForm((prev) => ({
                                            ...prev,
                                            department: v,
                                            course: courseOptionsFor(v).includes(prev.course) ? prev.course : '',
                                        }))}
                                        style={[styles.field, wide && { flex: 1 }]}
                                    />
                                    <SelectField
                                        value={form.course}
                                        options={courseOptionsFor(form.department, form.course)}
                                        placeholder={form.department ? 'Course' : 'Choose department first'}
                                        title="Select Course"
                                        searchable={courseOptionsFor(form.department).length > 6}
                                        disabled={!form.department}
                                        onChange={(v) => setForm((prev) => ({ ...prev, course: v }))}
                                        style={[styles.field, wide && { flex: 1 }]}
                                    />
                                </View>
                                <TextInput
                                    style={styles.field}
                                    placeholder="Email"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={form.email}
                                    onChangeText={(t) => setForm({ ...form, email: t })}
                                />
                                <TextInput
                                    style={styles.field}
                                    placeholder="Contact Number"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="phone-pad"
                                    value={form.contact}
                                    onChangeText={(t) => setForm({ ...form, contact: t })}
                                />
                            </View>

                            {/* Right column: the violation */}
                            <View style={styles.column}>
                                <View style={styles.cardHeader}>
                                    <AlertTriangle size={16} color={colors.danger} />
                                    <Text style={styles.cardTitle}>Violation</Text>
                                </View>
                                <SelectField
                                    value={form.violation}
                                    options={VIOLATION_TYPES}
                                    placeholder="Choose the violation"
                                    title="Select Violation"
                                    onChange={(v) => setForm((prev) => ({ ...prev, violation: v }))}
                                    style={[styles.field, styles.violationField]}
                                    textStyle={styles.violationText}
                                    iconColor={styles.violationText.color}
                                />
                                <View style={styles.row}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.tinyLabel}>Date</Text>
                                        <TextInput
                                            style={[styles.field, styles.smallField]}
                                            placeholder="YYYY-MM-DD"
                                            placeholderTextColor={colors.textMuted}
                                            value={form.incident_date}
                                            onChangeText={(t) => setForm({ ...form, incident_date: t })}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.tinyLabel}>Time</Text>
                                        <TextInput
                                            style={[styles.field, styles.smallField]}
                                            placeholder="HH:MM"
                                            placeholderTextColor={colors.textMuted}
                                            value={form.incident_time}
                                            onChangeText={(t) => setForm({ ...form, incident_time: t })}
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity style={[styles.submitButton, loading && { opacity: 0.7 }]} onPress={confirmSubmit} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : (
                                <>
                                    <Send size={18} color="#fff" />
                                    <Text style={styles.submitText}>Submit report</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.card, styles.successCard]}>
                        <View style={styles.successIcon}>
                            <CheckCircle2 size={32} color="#fff" />
                        </View>
                        <Text style={styles.successTitle}>Report sent</Text>
                        <Text style={styles.successText}>OSA will review it.</Text>
                        <TouchableOpacity style={styles.newEntryButton} onPress={resetForm}>
                            <Text style={styles.newEntryText}>Report another</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>


            {/* Confirm before submitting, like the website */}
            <Modal visible={showConfirmModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Check the report</Text>
                        {[['Student', `${form.name} (${form.student_id})`], ['Gender', form.gender], ['Violation', selectedViolationLabel], ['Date & Time', `${form.incident_date} ${form.incident_time}`], ['Reported by', reporterName]].map(([k, v]) => (
                            <View key={k} style={styles.confirmRow}>
                                <Text style={styles.confirmLabel}>{k}</Text>
                                <Text style={styles.confirmValue}>{v}</Text>
                            </View>
                        ))}
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowConfirmModal(false)}>
                                <Text style={styles.modalCancelText}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirmButton} onPress={processSubmission}>
                                <Text style={styles.modalConfirmText}>Send report</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Errors */}
            <Modal visible={alertMessage.visible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.alertHeader}>
                            <AlertCircle size={24} color={colors.danger} />
                            <Text style={[styles.modalTitle, { marginBottom: 0, marginLeft: 8 }]}>{alertMessage.title}</Text>
                        </View>
                        <Text style={styles.modalMessage}>{alertMessage.message}</Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalConfirmButton, { backgroundColor: colors.primary }]} onPress={() => setAlertMessage({ ...alertMessage, visible: false })}>
                                <Text style={styles.modalConfirmText}>OK</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// Mirrors the website's Guard Report: slate-50 fields with 2px borders, rounded-2xl, bold text
const getStyles = (colors, isDarkMode, wide) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        padding: wide ? 32 : 16,
        paddingBottom: 48,
        width: '100%',
        maxWidth: 960,
        alignSelf: 'center',
    },
    pillRow: {
        flexDirection: 'row',
        gap: 6,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
    },
    pillText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.textMuted,
    },
    pageHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 12,
    },
    pageTitle: {
        fontSize: wide ? 30 : 20,
        fontWeight: '900',
        fontStyle: 'italic',
        textTransform: 'uppercase',
        letterSpacing: -0.5,
        color: colors.text,
    },
    pageSubtitle: {
        marginTop: 2,
        fontSize: 11,
        fontWeight: '500',
        fontStyle: 'italic',
        color: colors.textMuted,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: wide ? 28 : 16,
        borderWidth: 2,
        borderColor: isDarkMode ? colors.border : '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 6,
    },
    // Section titles inside the form ("Student", "Violation"), like the website
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: colors.text,
    },
    columns: {
        flexDirection: wide ? 'row' : 'column',
        gap: 10,
    },
    column: {
        flex: wide ? 1 : undefined,
        gap: 10,
    },
    row: {
        flexDirection: 'row',
        gap: 10,
    },
    stack: {
        gap: 10,
    },
    tinyLabel: {
        fontSize: 9,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 2,
        color: colors.border,
        marginLeft: 4,
        marginBottom: 4,
    },
    field: {
        backgroundColor: colors.background,
        borderWidth: 2,
        borderColor: isDarkMode ? colors.border : '#f1f5f9',
        borderRadius: 12,
        height: 46,
        paddingHorizontal: 12,
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text,
        // Without minWidth the web <input> keeps its default size and can overflow
        minWidth: 0,
    },
    idField: {
        paddingRight: 56,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    scanButton: {
        position: 'absolute',
        right: 6,
        top: 6,
        bottom: 6,
        aspectRatio: 1,
        borderRadius: 10,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    violationField: {
        backgroundColor: isDarkMode ? 'rgba(248, 113, 113, 0.12)' : '#fef2f2',
        borderColor: isDarkMode ? 'rgba(248, 113, 113, 0.3)' : '#fee2e2',
    },
    violationText: {
        fontWeight: '900',
        color: isDarkMode ? '#fca5a5' : '#7f1d1d',
    },
    smallField: {
        fontSize: 13,
    },
    submitButton: {
        marginTop: 16,
        height: 52,
        borderRadius: 12,
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        shadowColor: '#1e3a8a',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 4,
    },
    submitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '900',
    },
    successCard: {
        alignItems: 'center',
        borderColor: isDarkMode ? 'rgba(52, 211, 153, 0.4)' : '#bbf7d0',
        paddingVertical: 48,
    },
    successIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#22c55e',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    successTitle: {
        fontSize: 26,
        fontWeight: '900',
        fontStyle: 'italic',
        textTransform: 'uppercase',
        color: colors.text,
    },
    successText: {
        marginTop: 12,
        maxWidth: 280,
        textAlign: 'center',
        fontSize: 15,
        fontWeight: 'bold',
        lineHeight: 22,
        color: colors.textMuted,
    },
    newEntryButton: {
        marginTop: 32,
        width: '100%',
        maxWidth: 240,
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: isDarkMode ? colors.primary : '#0f172a',
        alignItems: 'center',
    },
    newEntryText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: colors.card,
        borderRadius: 28,
        padding: 24,
        width: '100%',
        maxWidth: 440,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '900',
        textTransform: 'uppercase',
        color: colors.text,
        marginBottom: 16,
    },
    alertHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    confirmRow: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    confirmLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: colors.textMuted,
    },
    confirmValue: {
        marginTop: 2,
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text,
    },
    modalMessage: {
        fontSize: 14,
        color: colors.textMuted,
        lineHeight: 20,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 24,
    },
    modalCancelButton: {
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 12,
        backgroundColor: colors.background,
    },
    modalCancelText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.textMuted,
    },
    modalConfirmButton: {
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 12,
        backgroundColor: colors.primary,
    },
    modalConfirmText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#fff',
    },
});
