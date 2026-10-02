import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, useWindowDimensions } from 'react-native';
import { showAlert } from '../../components/showAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import { AlertCircle, ScanLine, Send, CheckCircle2, LogOut, User, UserCheck, AlertTriangle, Check, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// The guard-on-duty name typed on this phone, filled in again for the next report (same as the website)
const ON_DUTY_KEY = 'osa-guard-on-duty';

const emptyForm = () => ({
    student_id: '', name: '', gender: '', course: '', department: '', contact: '',
    email: '', violations: [], // one or more; each becomes its own report
    incident_date: today(), incident_time: nowTime(),
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

    const accountName = user?.full_name || user?.username || 'Personnel';
    // Guards share accounts, so a guard account types the name of the guard on duty (kept on this phone for
    // the next report). It's the "Reported by" OSA sees. Faculty & staff report as themselves.
    const isGuard = user?.role === 'guard';
    const [onDutyName, setOnDutyName] = useState('');
    useEffect(() => {
        AsyncStorage.getItem(ON_DUTY_KEY).then((saved) => { if (saved) setOnDutyName(saved); }).catch(() => {});
    }, []);
    const reporterName = isGuard ? (onDutyName.trim() || '—') : accountName;

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

    // Student IDs are 10 numbers: only digits, and the student is looked up once all 10 are typed
    const handleIdChange = (text) => {
        const cleanText = text.replace(/\D/g, '').slice(0, 10);
        setForm((prev) => ({ ...prev, student_id: cleanText }));
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        if (cleanText.length === 10) {
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
        const missing = ['student_id', 'name', 'gender', 'course', 'department', 'email', 'contact'].some((k) => !String(form[k] || '').trim())
            || !form.violations.length;
        if (missing) {
            setAlertMessage({ visible: true, title: 'Missing details', message: 'Fill in every field and choose the violation.' });
            return;
        }
        if (form.student_id.length !== 10) {
            setAlertMessage({ visible: true, title: 'Student ID', message: 'Student ID must be exactly 10 numbers, like 2023303188.' });
            return;
        }
        if (isGuard) {
            if (!onDutyName.trim()) {
                setAlertMessage({ visible: true, title: 'Guard on duty', message: 'Type the name of the guard on duty.' });
                return;
            }
            AsyncStorage.setItem(ON_DUTY_KEY, onDutyName.trim()).catch(() => {});
        }
        setShowConfirmModal(true);
    };

    const processSubmission = async () => {
        setShowConfirmModal(false);
        setLoading(true);
        try {
            await api.post('/violations/', { ...form, violation_types: form.violations, reporting_guard: accountName, on_duty_name: isGuard ? onDutyName.trim() : undefined });
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

    // Ticks or unticks a violation; the list keeps the order of VIOLATION_TYPES
    const toggleViolation = (value) => setForm((prev) => ({
        ...prev,
        violations: prev.violations.includes(value)
            ? prev.violations.filter((v) => v !== value)
            : VIOLATION_TYPES.map((v) => v.value).filter((v) => v === value || prev.violations.includes(v)),
    }));
    const violationLabels = form.violations.map((value) => VIOLATION_TYPES.find((v) => v.value === value)?.label || value);
    // For the slip: "CITC", initials, and "Wed, Sep 30, 2026 · 8:46 PM"
    const deptShort = (form.department.match(/\(([^)]+)\)\s*$/) || [])[1] || form.department;
    const initials = form.name.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
    const incidentWhen = (() => {
        const d = new Date(`${form.incident_date}T${form.incident_time || '00:00'}`);
        if (Number.isNaN(d.getTime())) return `${form.incident_date} · ${form.incident_time}`;
        return `${d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · ${d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}`;
    })();

    // The report as a slip (same as the website): the student, the violations, when and who.
    // sent: on the "Report sent" screen, with a "For review" tag.
    const renderSlip = (sent) => (
        <View style={styles.slip}>
            <View style={styles.slipStudent}>
                <View style={styles.slipAvatar}><Text style={styles.slipAvatarText}>{initials}</Text></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.slipName} numberOfLines={1}>{form.name || '—'}</Text>
                    <Text style={styles.slipId}>{form.student_id}</Text>
                    {!sent ? (
                        <Text style={styles.slipMeta} numberOfLines={2}>{[form.course, deptShort, form.gender].filter(Boolean).join(' · ')}</Text>
                    ) : null}
                </View>
                {sent ? <Text style={styles.slipTag}>FOR REVIEW</Text> : null}
            </View>
            <View style={styles.slipSection}>
                <View style={styles.slipSectionHeader}>
                    <Text style={styles.slipKicker}>{violationLabels.length > 1 ? 'VIOLATIONS' : 'VIOLATION'}</Text>
                    {violationLabels.length > 1 ? <Text style={styles.slipCount}>{violationLabels.length} reports</Text> : null}
                </View>
                {violationLabels.map((label) => (
                    <View key={label} style={styles.slipViolation}>
                        <AlertTriangle size={14} color={isDarkMode ? '#fca5a5' : '#b91c1c'} />
                        <Text style={styles.slipViolationText}>{label}</Text>
                    </View>
                ))}
            </View>
            <View style={styles.slipSection}>
                <View style={styles.slipLine}>
                    <Text style={styles.slipLineLabel}>When</Text>
                    <Text style={styles.slipLineValue}>{incidentWhen}</Text>
                </View>
                <View style={styles.slipLine}>
                    <Text style={styles.slipLineLabel}>Reported by</Text>
                    <Text style={styles.slipLineValue} numberOfLines={1}>{reporterName}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + (wide ? 32 : 16) }]} keyboardShouldPersistTaps="handled">
                {/* Title with Log out beside it, same as the website header */}
                <View style={styles.pageHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.pageTitle}>Report a violation</Text>
                        <Text style={styles.pageSubtitle}>Signed in as {accountName}</Text>
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
                        {/* Guard accounts are shared: who is on duty (remembered on this phone) */}
                        {isGuard ? (
                            <View style={styles.onDuty}>
                                <View style={styles.onDutyLabelRow}>
                                    <UserCheck size={15} color={colors.primary} />
                                    <Text style={styles.onDutyLabel}>Guard on duty</Text>
                                </View>
                                <TextInput
                                    style={[styles.field, styles.onDutyField]}
                                    placeholder="Your full name"
                                    placeholderTextColor={colors.textMuted}
                                    value={onDutyName}
                                    onChangeText={setOnDutyName}
                                    onEndEditing={() => AsyncStorage.setItem(ON_DUTY_KEY, onDutyName.trim()).catch(() => {})}
                                    autoCapitalize="words"
                                    autoComplete="name"
                                    maxLength={100}
                                />
                            </View>
                        ) : null}
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
                                            keyboardType="number-pad"
                                            maxLength={10}
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
                                {/* Tick every violation the student committed; each becomes its own report */}
                                <Text style={styles.tinyLabel}>What happened (choose all that apply)</Text>
                                <View style={styles.violationList}>
                                    {VIOLATION_TYPES.map(({ label, value }) => {
                                        const checked = form.violations.includes(value);
                                        return (
                                            <TouchableOpacity
                                                key={value}
                                                style={[styles.violationOption, checked && styles.violationOptionOn]}
                                                onPress={() => toggleViolation(value)}
                                                accessibilityRole="checkbox"
                                                accessibilityState={{ checked }}
                                            >
                                                <View style={[styles.checkBox, checked && styles.checkBoxOn]}>
                                                    {checked ? <Check size={13} color="#fff" strokeWidth={3} /> : null}
                                                </View>
                                                <Text style={[styles.violationOptionText, checked && styles.violationText]}>{label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                {form.violations.length > 1 ? (
                                    <Text style={styles.violationCount}>{form.violations.length} violations: each is sent as its own report.</Text>
                                ) : null}
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
                    // Sent: the same slip, marked for review, so the guard sees exactly what went to OSA
                    <View style={[styles.card, styles.successCard]}>
                        <View style={styles.successIcon}>
                            <CheckCircle2 size={30} color="#fff" />
                        </View>
                        <Text style={styles.successTitle}>{form.violations.length > 1 ? `${form.violations.length} reports sent` : 'Report sent'}</Text>
                        <Text style={styles.successText}>OSA will review {form.violations.length > 1 ? 'them' : 'it'}. The student gets an email.</Text>
                        {renderSlip(true)}
                        <TouchableOpacity style={styles.newEntryButton} onPress={resetForm}>
                            <Text style={styles.newEntryText}>Report another</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>


            {/* Confirm before submitting, like the website */}
            <Modal visible={showConfirmModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <ScrollView style={styles.slipModal} contentContainerStyle={styles.slipModalContent}>
                        <View style={styles.slipModalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.slipKicker}>VIOLATION REPORT</Text>
                                <Text style={styles.slipModalTitle}>Check before sending</Text>
                            </View>
                            <TouchableOpacity style={styles.slipClose} onPress={() => setShowConfirmModal(false)} accessibilityLabel="Close">
                                <X size={18} color="#dc2626" />
                            </TouchableOpacity>
                        </View>
                        {renderSlip(false)}
                        <Text style={styles.slipNote}>
                            OSA reviews {form.violations.length > 1 ? 'each report' : 'the report'} before any penalty is given. The student gets an email about it.
                        </Text>
                        <View style={styles.slipActions}>
                            <TouchableOpacity style={styles.slipEdit} onPress={() => setShowConfirmModal(false)}>
                                <Text style={styles.slipEditText}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.slipSend} onPress={processSubmission}>
                                <Send size={16} color="#fff" />
                                <Text style={styles.slipSendText}>{form.violations.length > 1 ? `Send ${form.violations.length} reports` : 'Send report'}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
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
        padding: wide ? 28 : 14,
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
        gap: wide ? 10 : 8,
    },
    column: {
        flex: wide ? 1 : undefined,
        gap: wide ? 10 : 8,
    },
    row: {
        flexDirection: 'row',
        gap: 8,
    },
    stack: {
        gap: 8,
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
        borderRadius: 10,
        // Phones: shorter boxes so the form fits without long scrolling (same as registration)
        height: wide ? 46 : 40,
        paddingHorizontal: 11,
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text,
        // Without minWidth the web <input> keeps its default size and can overflow
        minWidth: 0,
    },
    idField: {
        paddingRight: wide ? 56 : 50,
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
    // Guard on duty (guard accounts only), above the form
    onDuty: {
        borderWidth: 2,
        borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.35)' : '#dbeafe',
        backgroundColor: isDarkMode ? 'rgba(30, 58, 138, 0.25)' : '#eff6ff',
        borderRadius: 12,
        padding: 10,
        marginBottom: 12,
        gap: 6,
    },
    onDutyLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    onDutyLabel: { fontSize: 12, fontWeight: '900', color: colors.primary },
    onDutyField: { backgroundColor: colors.card },
    // The violation tick boxes; a ticked one turns red like the old dropdown
    // Two per row, also on phones, so the four fit in two lines
    violationList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    violationOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 2,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 9,
        flexBasis: '47%',
        flexGrow: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
    },
    violationOptionOn: {
        backgroundColor: isDarkMode ? 'rgba(248, 113, 113, 0.12)' : '#fef2f2',
        borderColor: isDarkMode ? 'rgba(248, 113, 113, 0.45)' : '#fca5a5',
    },
    violationOptionText: { flex: 1, fontSize: wide ? 14 : 13, fontWeight: '600', color: colors.text },
    checkBox: {
        width: 18,
        height: 18,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: colors.textMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkBoxOn: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
    violationCount: { fontSize: 12, fontWeight: '700', color: isDarkMode ? '#fca5a5' : '#dc2626', marginTop: -2 },
    violationText: {
        fontWeight: '900',
        color: isDarkMode ? '#fca5a5' : '#7f1d1d',
    },
    smallField: {
        fontSize: 13,
    },
    submitButton: {
        marginTop: wide ? 16 : 12,
        height: wide ? 52 : 46,
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
        paddingVertical: 24,
        alignSelf: 'center',
        width: '100%',
        maxWidth: 480,
    },
    successIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#22c55e',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    successTitle: { fontSize: 22, fontWeight: '900', color: colors.text },
    successText: {
        marginTop: 4,
        marginBottom: 16,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 19,
        color: colors.textMuted,
    },
    newEntryButton: {
        marginTop: 16,
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: 'center',
    },
    newEntryText: { color: '#fff', fontSize: 14, fontWeight: '800' },
    // The report slip (confirmation and "Report sent"), same design as the website
    slip: { width: '100%', borderWidth: 1, borderColor: colors.border, borderRadius: 16, overflow: 'hidden' },
    slipStudent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: colors.background,
    },
    slipAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe',
        alignItems: 'center',
        justifyContent: 'center',
    },
    slipAvatarText: { fontSize: 14, fontWeight: '900', color: isDarkMode ? '#93c5fd' : '#1e3a8a' },
    slipName: { fontSize: 15, fontWeight: '900', color: colors.text },
    slipId: { fontSize: 12, fontWeight: '700', color: colors.textMuted, fontVariant: ['tabular-nums'] },
    slipMeta: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
    slipTag: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.8,
        color: isDarkMode ? '#fcd34d' : '#b45309',
        backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
        overflow: 'hidden',
    },
    slipSection: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 6,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        borderStyle: 'dashed',
    },
    slipSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    slipKicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.8, color: colors.textMuted },
    slipCount: {
        fontSize: 10,
        fontWeight: '900',
        color: isDarkMode ? '#fca5a5' : '#b91c1c',
        backgroundColor: isDarkMode ? 'rgba(248, 113, 113, 0.15)' : '#fee2e2',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        overflow: 'hidden',
    },
    slipViolation: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: isDarkMode ? 'rgba(248, 113, 113, 0.12)' : '#fef2f2',
    },
    slipViolationText: { flex: 1, fontSize: 14, fontWeight: '800', color: isDarkMode ? '#fca5a5' : '#b91c1c' },
    slipLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
    slipLineLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
    slipLineValue: { flexShrink: 1, textAlign: 'right', fontSize: 13, fontWeight: '800', color: colors.text },
    slipModal: { width: '100%', maxWidth: 440, maxHeight: '90%', flexGrow: 0, backgroundColor: colors.card, borderRadius: 24 },
    slipModalContent: { padding: 18, gap: 12 },
    slipModalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    slipModalTitle: { fontSize: 18, fontWeight: '900', color: colors.text },
    slipClose: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDarkMode ? 'rgba(248, 113, 113, 0.12)' : '#fef2f2',
    },
    slipNote: { fontSize: 12, lineHeight: 18, fontWeight: '500', color: colors.textMuted },
    slipActions: { flexDirection: 'row', gap: 10 },
    slipEdit: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center' },
    slipEditText: { fontSize: 14, fontWeight: '800', color: colors.text },
    slipSend: {
        flex: 1,
        flexDirection: 'row',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    slipSendText: { fontSize: 14, fontWeight: '800', color: '#fff' },
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
