import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, useWindowDimensions, Image } from 'react-native';
import { showAlert } from '../../components/showAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import { AlertCircle, CheckCircle2, AlertTriangle, Check, X, Keyboard, ArrowLeft, ArrowRight, Plus, ChevronDown, UserCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import SelectField from '../../components/SelectField';
import { onCameraResult } from '../../components/cameraResults';
import { parseStudentQr, NOT_A_STUDENT_QR } from '../../components/studentQr';
import api from '../../services/api';
import { HomeHeader } from '../../components/StudentLook';
import { useViolationTypes } from '../../components/violationTypes';
import { useAuth } from '../../components/AuthContext';
import { useTheme } from '../../components/ThemeContext';
import { DEPARTMENTS, GENDERS, departmentForCourse, courseOptionsFor } from '../../constants/Data';

// The violations come from the violations table (components/violationTypes.js): Light, then Less Grave. Same as the website.

const pad = (n) => String(n).padStart(2, '0');
const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const nowTime = () => {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};


// Contact numbers are 11 digits (09xxxxxxxxx): digits only, and nothing past the 11th
const contactDigits = (value) => String(value || '').replace(/\D/g, '').slice(0, 11);

const emptyForm = () => ({
    student_id: '', name: '', gender: '', course: '', department: '', contact: '',
    email: '', violations: [], // one or more; each becomes its own report
    // Guards: what happened, in their own words ("N/A" when there's nothing to add)
    description: '',
    // From the student lookup: a registered student's name shows in a green box (as on the website)
    registered: false, year: '',
    incident_date: today(), incident_time: nowTime(),
});

export default function PersonnelDashboard() {
    const { user } = useAuth();
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
    // Reports go under the account's name; guard accounts name the guard on duty instead. Same as the website.
    const isGuard = user?.role === 'guard';
    // Guards share accounts, so the guard on duty types their name on every report (it starts empty; nothing is
    // remembered). Same as the website.
    const [onDuty, setOnDuty] = useState('');
    // Guards and faculty & staff report the same way: the scan / enter manually choice first, then the form in two
    // steps. Same as the website.
    const kiosk = true;
    const reporterName = isGuard ? (onDuty.trim() || '—') : accountName;
    // Guards start on a kiosk-style screen: scan the student's ID, or enter the details by hand. The form shows
    // once they choose (after a successful scan, or "Enter manually"); leaving the camera keeps the start screen.
    const [started, setStarted] = useState(!kiosk);
    // Guards fill in the report in two steps: 1. the student, then (Next) 2. the violation, date and time.
    // Same as the website.
    const [step, setStep] = useState(1);
    const [openGroup, setOpenGroup] = useState(null); // the violation dropdown that's open
    const guardStep1 = kiosk && step === 1;
    const guardStep2 = kiosk && step === 2;
    const scrollRef = useRef(null);
    const nextStep = () => {
        const missing = ['student_id', 'name', 'gender', 'course', 'department', 'email', 'contact'].some((k) => !String(form[k] || '').trim());
        if (missing) {
            setAlertMessage({ visible: true, title: 'Missing details', message: "Fill in every detail about the student." });
            return;
        }
        if (form.student_id.length !== 10) {
            setAlertMessage({ visible: true, title: 'Student ID', message: 'Student ID must be exactly 10 numbers, like 2023303188.' });
            return;
        }
        setStep(2);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
    };
    const idInputRef = useRef(null);
    const enterManually = () => {
        setStarted(true);
        setTimeout(() => idInputRef.current?.focus(), 150);
    };

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
                    contact: contactDigits(data.contact_number) || prev.contact,
                    email: data.email || prev.email,
                    gender: data.gender || prev.gender,
                    registered: Boolean(data.has_account),
                    year: data.year_level || '',
                };
            });
        } catch {
            // Not registered (yet); the guard fills in the details by hand
        }
    };

    // Student IDs are 10 numbers: only digits, and the student is looked up once all 10 are typed
    const handleIdChange = (text) => {
        const cleanText = text.replace(/\D/g, '').slice(0, 10);
        setForm((prev) => (cleanText === prev.student_id ? prev : { ...prev, student_id: cleanText, registered: false, year: '' }));
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
        setStarted(true);
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
        if (isGuard && !form.description.trim()) {
            setAlertMessage({ visible: true, title: 'Description', message: 'Write a description, or N/A if there is none.' });
            return;
        }
        if (isGuard && !onDuty.trim()) {
            setAlertMessage({ visible: true, title: 'Guard on duty', message: 'Type the name of the guard on duty.' });
            return;
        }
        setShowConfirmModal(true);
    };

    const processSubmission = async () => {
        setShowConfirmModal(false);
        setLoading(true);
        try {
            await api.post('/violations/', {
                ...form, violation_types: form.violations, reporting_guard: accountName,
                description: isGuard ? form.description.trim() : undefined,
                on_duty_name: isGuard ? onDuty.trim() : undefined,
            });
            setSubmitted(true);
        } catch (error) {
            setAlertMessage({ visible: true, title: "Couldn't send the report", message: error.response?.data?.error || 'Check the details and try again.' });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm(emptyForm());
        setOnDuty('');
        setSubmitted(false);
        setStarted(!kiosk); // back to the scan / enter manually screen
        setStep(1);
    };

    // The violation dropdowns, from the violations table
    const { groups: violationGroups } = useViolationTypes();
    // Ticks or unticks a violation (in the order they were added)
    const toggleViolation = (value) => setForm((prev) => ({
        ...prev,
        violations: prev.violations.includes(value)
            ? prev.violations.filter((v) => v !== value)
            : [...prev.violations, value],
    }));
    const violationLabels = form.violations;
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
                {isGuard && form.description.trim() ? (
                    <View style={{ marginTop: 4 }}>
                        <Text style={styles.slipLineLabel}>Description</Text>
                        <Text style={[styles.slipLineValue, { textAlign: 'left', marginTop: 2 }]}>{form.description.trim()}</Text>
                    </View>
                ) : null}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Blue gradient header: the page and the account (Log out is on the Profile tab; same as the website) */}
            <View style={{ paddingTop: insets.top }}>
                <HomeHeader isDarkMode={isDarkMode} greeting="Report Violation" name={`${accountName} · ${isGuard ? 'Guard' : 'Faculty'}`} />
            </View>
            <ScrollView ref={scrollRef} contentContainerStyle={[styles.scrollContent, { paddingTop: wide ? 24 : 16 }]} keyboardShouldPersistTaps="handled">

                {!submitted && !started ? (
                    // The guard's start screen (kiosk style): two boxes to choose from. Same as the website.
                    <View style={styles.kiosk}>
                        <Text style={styles.kioskAsk}>HOW DO YOU WANT TO REPORT?</Text>
                        <View style={[styles.kioskRow, wide && { flexDirection: 'row' }]}>
                            <TouchableOpacity style={styles.kioskBox} onPress={startScan} accessibilityRole="button" accessibilityLabel="Scan student ID">
                                <Image source={require('../../assets/images/osaconnect-icon.png')} style={{ width: 112, height: 112 }} fadeDuration={0} />
                                <Text style={styles.kioskTitle}>SCAN STUDENT ID</Text>
                                <Text style={styles.kioskSub}>Point the camera at the student&apos;s ID or QR code</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.kioskBox} onPress={enterManually} accessibilityRole="button" accessibilityLabel="Enter manually">
                                <View style={styles.kioskIcon}><Keyboard size={60} color={isDarkMode ? '#ffffff' : '#1e2a6b'} strokeWidth={1.6} /></View>
                                <Text style={styles.kioskTitle}>ENTER MANUALLY</Text>
                                <Text style={styles.kioskSub}>Tap here to input student info manually</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : !submitted ? (
                    <>
                    {/* Guards: back to the scan / enter manually choice (in case of a wrong tap); clears the form */}
                    {kiosk && (
                        <TouchableOpacity onPress={() => { if (step === 2) { setStep(1); return; } setForm(emptyForm()); setStarted(false); }} style={styles.backChoice} accessibilityRole="button" accessibilityLabel="Back">
                            <ArrowLeft size={18} color={colors.primary} />
                            <Text style={styles.backChoiceText}>Back</Text>
                        </TouchableOpacity>
                    )}
                    {kiosk && <Text style={styles.stepLabel}>STEP {step} OF 2 · {step === 1 ? 'STUDENT' : 'VIOLATION'}</Text>}
                    <View style={styles.card}>
                        {guardStep2 && (
                            // Step 2: who the report is about, from step 1
                            <View style={styles.stepStudent}>
                                <Text style={styles.stepStudentText} numberOfLines={1}>{form.name || 'Student'} <Text style={{ color: colors.textMuted, fontWeight: '500' }}>· {form.student_id}</Text></Text>
                                <TouchableOpacity onPress={() => setStep(1)} hitSlop={8}><Text style={styles.stepEdit}>Edit</Text></TouchableOpacity>
                            </View>
                        )}
                        <View style={[styles.columns, kiosk && { flexDirection: 'column' }]}>
                            {/* Left column: the student (guards: step 1) */}
                            <View style={[styles.column, guardStep2 && { display: 'none' }]}>
                                {/* Same layout as the website: a label on each field, two short fields per row */}
                                {!kiosk && (
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.cardTitle}>Student</Text>
                                    </View>
                                )}
                                <View>
                                    <Text style={styles.tinyLabel}>Student ID</Text>
                                    <TextInput
                                        ref={idInputRef}
                                        style={styles.field}
                                        placeholder="Student ID"
                                        placeholderTextColor={colors.textMuted}
                                        value={form.student_id}
                                        onChangeText={handleIdChange}
                                        keyboardType="number-pad"
                                        maxLength={10}
                                    />
                                </View>
                                <View>
                                    <Text style={styles.tinyLabel}>Name</Text>
                                    {form.registered && form.name ? (
                                        // A registered student: their name from their account, in a green box
                                        <View style={styles.nameBox}>
                                            <UserCheck size={18} color={isDarkMode ? '#6ee7b7' : '#059669'} />
                                            <View style={{ flex: 1, minWidth: 0 }}>
                                                <Text style={styles.nameBoxName} numberOfLines={1}>{form.name}</Text>
                                                <Text style={styles.nameBoxSub}>
                                                    {['Registered student', form.year && (/^\d$/.test(String(form.year)) ? `Year ${form.year}` : form.year)].filter(Boolean).join(' · ')}
                                                </Text>
                                            </View>
                                        </View>
                                    ) : (
                                        <TextInput
                                            style={styles.field}
                                            placeholder="Full name"
                                            placeholderTextColor={colors.textMuted}
                                            value={form.name}
                                            onChangeText={(t) => setForm({ ...form, name: t })}
                                        />
                                    )}
                                </View>
                                {/* Department first, then only its courses (same as registration) */}
                                <View style={styles.row}>
                                    <View style={styles.half}>
                                        <Text style={styles.tinyLabel}>Department</Text>
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
                                            style={styles.field}
                                        />
                                    </View>
                                    <View style={styles.half}>
                                        <Text style={styles.tinyLabel}>Course</Text>
                                        <SelectField
                                            value={form.course}
                                            options={courseOptionsFor(form.department, form.course)}
                                            placeholder={form.department ? 'Course' : 'Department first'}
                                            title="Select Course"
                                            searchable={courseOptionsFor(form.department).length > 6}
                                            disabled={!form.department}
                                            onChange={(v) => setForm((prev) => ({ ...prev, course: v }))}
                                            style={styles.field}
                                        />
                                    </View>
                                </View>
                                <View style={styles.row}>
                                    <View style={styles.half}>
                                        <Text style={styles.tinyLabel}>Gender</Text>
                                        <SelectField
                                            value={form.gender}
                                            options={GENDERS}
                                            placeholder="Choose"
                                            title="Select Gender"
                                            onChange={(v) => setForm((prev) => ({ ...prev, gender: v }))}
                                            style={styles.field}
                                        />
                                    </View>
                                    <View style={styles.half}>
                                        <Text style={styles.tinyLabel}>Contact number</Text>
                                        <TextInput
                                            style={styles.field}
                                            placeholder="Contact number"
                                            placeholderTextColor={colors.textMuted}
                                            keyboardType="number-pad"
                                            maxLength={11}
                                            value={form.contact}
                                            onChangeText={(t) => setForm({ ...form, contact: contactDigits(t) })}
                                        />
                                    </View>
                                </View>
                                <View>
                                    <Text style={styles.tinyLabel}>Email</Text>
                                    <TextInput
                                        style={styles.field}
                                        placeholder="Email"
                                        placeholderTextColor={colors.textMuted}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={form.email}
                                        onChangeText={(t) => setForm({ ...form, email: t })}
                                    />
                                </View>
                            </View>

                            {/* Right column: the violation (guards: step 2) */}
                            <View style={[styles.column, guardStep1 && { display: 'none' }]}>
                                {!kiosk && (
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.cardTitle}>Violation</Text>
                                    </View>
                                )}
                                {/* Tick every violation the student committed; each becomes its own report */}
                                <Text style={styles.tinyLabel}>What happened (choose all that apply)</Text>
                                {/* Two dropdowns (one open at a time): + adds a violation, tap again to remove */}
                                {violationGroups.map((g) => {
                                    const open = openGroup === g.id;
                                    const count = g.items.filter((v) => form.violations.includes(v)).length;
                                    return (
                                        <View key={g.id} style={styles.groupBox}>
                                            <TouchableOpacity style={styles.groupHead} onPress={() => setOpenGroup(open ? null : g.id)} accessibilityRole="button" accessibilityState={{ expanded: open }}>
                                                <Text style={styles.groupTitle}>{g.label}</Text>
                                                <View style={styles.groupRight}>
                                                    {count > 0 ? <View style={styles.groupCount}><Text style={styles.groupCountText}>{count}</Text></View> : null}
                                                    <ChevronDown size={18} color={colors.textMuted} style={open ? { transform: [{ rotate: '180deg' }] } : null} />
                                                </View>
                                            </TouchableOpacity>
                                            {open ? (
                                                <ScrollView style={styles.groupList} nestedScrollEnabled>
                                                    {g.items.map((v) => {
                                                        const on = form.violations.includes(v);
                                                        return (
                                                            <TouchableOpacity key={v} style={[styles.groupItem, on && styles.violationOptionOn]} onPress={() => toggleViolation(v)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                                                                <Text style={[styles.violationOptionText, on && styles.violationText]}>{v}</Text>
                                                                <View style={[styles.plusCircle, on && styles.plusCircleOn]}>
                                                                    {on ? <Check size={14} color="#fff" strokeWidth={3} /> : <Plus size={14} color={colors.textMuted} strokeWidth={3} />}
                                                                </View>
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </ScrollView>
                                            ) : null}
                                        </View>
                                    );
                                })}
                                {form.violations.length ? (
                                    <View style={styles.chips}>
                                        {form.violations.map((v) => (
                                            <TouchableOpacity key={v} style={styles.chip} onPress={() => toggleViolation(v)} accessibilityLabel={`Remove ${v}`}>
                                                <Text style={styles.chipText}>{v}</Text>
                                                <X size={12} color={isDarkMode ? '#fca5a5' : '#b91c1c'} />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ) : null}
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
                                {isGuard ? (
                                    <>
                                        <View>
                                            <Text style={styles.tinyLabel}>Description</Text>
                                            <TextInput
                                                style={[styles.field, styles.descriptionField]}
                                                placeholder="What happened? Type N/A if none"
                                                placeholderTextColor={colors.textMuted}
                                                value={form.description}
                                                onChangeText={(t) => setForm({ ...form, description: t })}
                                                multiline
                                                maxLength={1000}
                                                textAlignVertical="top"
                                            />
                                        </View>
                                        <View>
                                            <Text style={styles.tinyLabel}>Guard on duty</Text>
                                            <TextInput
                                                style={styles.field}
                                                placeholder="Guard's full name"
                                                placeholderTextColor={colors.textMuted}
                                                value={onDuty}
                                                onChangeText={setOnDuty}
                                                autoCapitalize="words"
                                                maxLength={100}
                                            />
                                        </View>
                                    </>
                                ) : null}
                            </View>
                        </View>

                        {guardStep1 ? (
                            // Guards, step 1: on to the violation
                            <TouchableOpacity style={styles.submitButton} onPress={nextStep} accessibilityRole="button">
                                <Text style={styles.submitText}>Next</Text>
                                <ArrowRight size={18} color="#fff" />
                            </TouchableOpacity>
                        ) : (
                        <TouchableOpacity style={[styles.submitButton, loading && { opacity: 0.7 }]} onPress={confirmSubmit} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : (
                                <Text style={styles.submitText}>Submit report</Text>
                            )}
                        </TouchableOpacity>
                        )}
                    </View>
                    </>
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
            <Modal visible={showConfirmModal} transparent animationType="none">
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
                                <Text style={styles.slipSendText}>{form.violations.length > 1 ? `Send ${form.violations.length} reports` : 'Send report'}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* Errors */}
            <Modal visible={alertMessage.visible} transparent animationType="none">
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
        backgroundColor: isDarkMode ? colors.background : '#ffffff',
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
        fontWeight: '800',
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
        fontSize: 16,
        fontWeight: '800',
        color: colors.primary,
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
        fontSize: 12,
        fontWeight: '700',
        color: isDarkMode ? '#bfdbfe' : '#1e2a6b',
        marginLeft: 4,
        marginBottom: 4,
    },
    half: { flex: 1, minWidth: 0 },
    // A registered student's name (green, like the website)
    nameBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 2,
        borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.35)' : '#d1fae5',
        backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    nameBoxName: { fontSize: 15, fontWeight: '700', color: colors.text },
    nameBoxSub: { fontSize: 11.5, fontWeight: '500', color: colors.textMuted, marginTop: 1 },
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
        fontWeight: '800',
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
    stepLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, color: colors.textMuted, marginBottom: 8, paddingHorizontal: 4 },
    stepStudent: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, backgroundColor: colors.background },
    stepStudentText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
    stepEdit: { fontSize: 12, fontWeight: '700', color: colors.primary },
    backChoice: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 8, borderRadius: 999 },
    backChoiceText: { fontSize: 14, fontWeight: '700', color: colors.primary },
    // The guard's start screen: two boxes to choose from
    kiosk: { alignItems: 'center', paddingVertical: 24 },
    kioskAsk: { fontSize: 13, fontWeight: '600', letterSpacing: 2, color: colors.textMuted, marginBottom: 16, textAlign: 'center' },
    kioskRow: { width: '100%', maxWidth: 680, gap: 16 },
    kioskBox: {
        flex: 1, alignItems: 'center', gap: 10, padding: 24, borderRadius: 24, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card,
        shadowColor: '#101a4b', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 18, elevation: 5,
    },
    kioskIcon: { width: 112, height: 112, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(30,42,107,0.05)' },
    kioskTitle: { fontSize: 20, fontWeight: '800', letterSpacing: 0.5, color: isDarkMode ? '#ffffff' : '#1e2a6b', textAlign: 'center' },
    kioskSub: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
    // The guard's description box: a few lines tall
    descriptionField: { height: 96, paddingTop: 10 },
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
    // The two violation dropdowns
    groupBox: { borderWidth: 2, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.background, overflow: 'hidden', marginBottom: 8 },
    groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 11 },
    groupTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    groupRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    groupCount: { backgroundColor: '#dc2626', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 },
    groupCountText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    groupList: { maxHeight: 200, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
    groupItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9 },
    plusCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    plusCircleOn: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: isDarkMode ? 'rgba(248, 113, 113, 0.12)' : '#fef2f2' },
    chipText: { fontSize: 12, fontWeight: '700', color: isDarkMode ? '#fca5a5' : '#b91c1c' },
    violationCount: { fontSize: 12, fontWeight: '700', color: isDarkMode ? '#fca5a5' : '#dc2626', marginTop: -2 },
    violationText: {
        fontWeight: '800',
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
        fontWeight: '800',
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
    successTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
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
    newEntryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
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
    slipAvatarText: { fontSize: 14, fontWeight: '800', color: isDarkMode ? '#93c5fd' : '#1e3a8a' },
    slipName: { fontSize: 15, fontWeight: '800', color: colors.text },
    slipId: { fontSize: 12, fontWeight: '700', color: colors.textMuted, fontVariant: ['tabular-nums'] },
    slipMeta: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
    slipTag: {
        fontSize: 10,
        fontWeight: '800',
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
    slipKicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.8, color: colors.textMuted },
    slipCount: {
        fontSize: 10,
        fontWeight: '800',
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
    slipViolationText: { flex: 1, fontSize: 14, fontWeight: '700', color: isDarkMode ? '#fca5a5' : '#b91c1c' },
    slipLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
    slipLineLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
    slipLineValue: { flexShrink: 1, textAlign: 'right', fontSize: 13, fontWeight: '700', color: colors.text },
    slipModal: { width: '100%', maxWidth: 440, maxHeight: '90%', flexGrow: 0, backgroundColor: colors.card, borderRadius: 24 },
    slipModalContent: { padding: 18, gap: 12 },
    slipModalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    slipModalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
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
    slipEditText: { fontSize: 14, fontWeight: '700', color: colors.text },
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
    slipSendText: { fontSize: 14, fontWeight: '700', color: '#fff' },
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
        fontWeight: '800',
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
