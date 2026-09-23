import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import { ClipboardList, AlertCircle, ScanLine, Send, CheckCircle2, CircleQuestionMark, LogOut } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import SelectField from '../../components/SelectField';
import { onCameraResult } from '../../components/cameraResults';
import { parseStudentQr, NOT_A_STUDENT_QR } from '../../components/studentQr';
import api from '../../services/api';
import { useAuth } from '../../components/AuthContext';
import { useTheme } from '../../components/ThemeContext';
import { COURSES, DEPARTMENTS } from '../../constants/Data';

// Same options as the website's Guard Report (frontend/src/pages/guard/ReportViolation.jsx);
// values match PUNISHMENT_SYSTEM in backend/core/views.py
const VIOLATION_TYPES = [
    { label: 'No ID', value: 'No ID' },
    { label: 'Improper Wearing of ID', value: 'Improper wearing of ID' },
    { label: 'Dress Code', value: 'Dress code violation' },
    { label: 'Littering', value: 'Littering' },
    { label: 'Smoking', value: 'Smoking inside campus' },
    { label: 'Serious Misconduct', value: 'Serious misconduct' },
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
    student_id: '', name: '', course: '', department: '', contact: '',
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
    const title = user?.role === 'guard' ? 'Guard Report' : 'Staff Report';

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
        }));
        await fetchStudentData(student.studentId);
    };

    const startScan = async () => {
        if (!permission) return;
        if (!permission.granted) {
            const { granted } = await requestPermission();
            if (!granted) {
                Alert.alert('Permission required', 'Camera access is needed to scan QR codes.');
                return;
            }
        }
        // The scanner is its own screen (app/staff/scan.jsx); it hands the result back here
        onCameraResult('scan', handleBarCodeScanned);
        router.push('/staff/scan');
    };

    // Same required fields as the website form
    const confirmSubmit = () => {
        const missing = ['student_id', 'name', 'course', 'department', 'email', 'contact', 'violation'].some((k) => !String(form[k] || '').trim());
        if (missing) {
            setAlertMessage({ visible: true, title: 'Missing Fields', message: 'Please fill in every field and select a violation before submitting.' });
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
            setAlertMessage({ visible: true, title: 'Error', message: error.response?.data?.error || 'Failed to submit report. Please check the student ID.' });
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
                {/* Top actions, like the website's floating Help / Log Out pills */}
                <View style={styles.pillRow}>
                    <TouchableOpacity style={styles.pill} onPress={() => router.push('/help')}>
                        <CircleQuestionMark size={16} color={colors.textMuted} />
                        <Text style={styles.pillText}>Help</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.pill} onPress={logout}>
                        <LogOut size={16} color={colors.danger} />
                        <Text style={[styles.pillText, { color: colors.danger }]}>Log Out</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.pageHeader}>
                    <Text style={styles.pageTitle}>{title}</Text>
                    <Text style={styles.pageSubtitle}>Academic Integrity & Safety Reporting</Text>
                </View>

                {!submitted ? (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <ClipboardList size={24} color={colors.primary} />
                            <Text style={styles.cardTitle}>New Incident Report</Text>
                        </View>

                        <View style={styles.columns}>
                            {/* Left column */}
                            <View style={styles.column}>
                                <View>
                                    <Text style={styles.tinyLabel}>Student ID / Scan QR</Text>
                                    <View>
                                        <TextInput
                                            style={[styles.field, styles.idField]}
                                            placeholder="202X-XXXXXXX"
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
                                    placeholder="Student Full Name"
                                    placeholderTextColor={colors.textMuted}
                                    value={form.name}
                                    onChangeText={(t) => setForm({ ...form, name: t })}
                                />
                                {/* Side by side on wide screens; stacked on phones so long course/college names fit */}
                                <View style={wide ? styles.row : styles.stack}>
                                    <SelectField
                                        value={form.course}
                                        options={COURSES}
                                        placeholder="Course"
                                        title="Select Course"
                                        searchable
                                        onChange={(v) => setForm((prev) => ({ ...prev, course: v }))}
                                        style={[styles.field, wide && { flex: 1 }]}
                                    />
                                    <SelectField
                                        value={form.department}
                                        options={DEPARTMENTS}
                                        placeholder="Dept"
                                        title="Select College"
                                        onChange={(v) => setForm((prev) => ({ ...prev, department: v }))}
                                        style={[styles.field, wide && { flex: 1 }]}
                                    />
                                </View>
                            </View>

                            {/* Right column */}
                            <View style={styles.column}>
                                <TextInput
                                    style={styles.field}
                                    placeholder="Email Address"
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
                                <SelectField
                                    value={form.violation}
                                    options={VIOLATION_TYPES}
                                    placeholder="SELECT VIOLATION"
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
                                    <Send size={20} color="#fff" />
                                    <Text style={styles.submitText}>SUBMIT REPORT</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.card, styles.successCard]}>
                        <View style={styles.successIcon}>
                            <CheckCircle2 size={32} color="#fff" />
                        </View>
                        <Text style={styles.successTitle}>Report Stored!</Text>
                        <Text style={styles.successText}>Violation synchronized with cloud database.</Text>
                        <TouchableOpacity style={styles.newEntryButton} onPress={resetForm}>
                            <Text style={styles.newEntryText}>New Entry</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>


            {/* Confirm before submitting, like the website */}
            <Modal visible={showConfirmModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Confirm Incident</Text>
                        {[['Student', `${form.name} (${form.student_id})`], ['Violation', selectedViolationLabel], ['Date & Time', `${form.incident_date} ${form.incident_time}`], ['Reported by', reporterName]].map(([k, v]) => (
                            <View key={k} style={styles.confirmRow}>
                                <Text style={styles.confirmLabel}>{k}</Text>
                                <Text style={styles.confirmValue}>{v}</Text>
                            </View>
                        ))}
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowConfirmModal(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirmButton} onPress={processSubmission}>
                                <Text style={styles.modalConfirmText}>Submit</Text>
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
        justifyContent: 'flex-end',
        gap: 8,
        marginBottom: 8,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
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
        marginBottom: 16,
    },
    pageTitle: {
        fontSize: wide ? 30 : 24,
        fontWeight: '900',
        fontStyle: 'italic',
        textTransform: 'uppercase',
        letterSpacing: -0.5,
        color: colors.text,
    },
    pageSubtitle: {
        marginTop: 4,
        fontSize: 13,
        fontWeight: '500',
        fontStyle: 'italic',
        color: colors.textMuted,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: wide ? 32 : 20,
        borderWidth: 2,
        borderColor: isDarkMode ? colors.border : '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 6,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingBottom: 16,
        marginBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: colors.background,
    },
    cardTitle: {
        fontSize: wide ? 20 : 18,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: -0.5,
        color: colors.text,
    },
    columns: {
        flexDirection: wide ? 'row' : 'column',
        gap: 16,
    },
    column: {
        flex: wide ? 1 : undefined,
        gap: 16,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    stack: {
        gap: 16,
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
        borderRadius: 16,
        height: 52,
        paddingHorizontal: 16,
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
        right: 8,
        top: 8,
        bottom: 8,
        aspectRatio: 1,
        borderRadius: 12,
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
        marginTop: 24,
        height: 60,
        borderRadius: 16,
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
        fontSize: 18,
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
