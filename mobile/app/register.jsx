import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Pressable, StyleSheet, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import { Link } from 'expo-router';
import { Mail, ChevronRight, CheckCircle2, Download } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';
// The legacy entry still has saveToLibraryAsync (the new API throws on it)
import * as MediaLibrary from 'expo-media-library/legacy';
import { showAlert } from '../components/showAlert';
import { middleNameError, middleNameText, MIDDLE_NAME_HINT } from '../components/names';
import Svg, { Circle, Rect } from 'react-native-svg';
import { DEPARTMENTS, DEPARTMENT_COURSES, GENDERS, yearLevelsFor } from '../constants/Data';
import SelectField from '../components/SelectField';
import AuthScreen, { authColors as C, authStyles as A } from '../components/AuthScreen';
import api from '../services/api';

const OFFLINE_MESSAGE = "Can't reach the server. Check your internet connection and try again.";
const STEP_COUNT = 3;
const CODE_LENGTH = 6;
// Matches the backend: codes expire 5 minutes after sending, and a new one can be asked for after a minute
const CODE_LIFETIME_S = 300;
const RESEND_AFTER_S = 60;
// Outside the component so React's purity check knows it only runs in event handlers
const currentTime = () => Date.now();
const TITLES = { 1: 'Your details', 2: 'Verify your email', 3: "You're registered" };

// Small grey "!" beside a label; phones can't hover, so tapping it shows `text`
const InfoTip = ({ text }) => (
    <Pressable onPress={() => showAlert(text, '')} hitSlop={10} accessibilityRole="button" accessibilityLabel={text} style={styles.infoTip}>
        <Svg width={13} height={13} viewBox="0 0 24 24">
            <Circle cx="12" cy="12" r="12" fill="#94a3b8" />
            <Rect x="10.5" y="5" width="3" height="9" rx="1.5" fill="#fff" />
            <Circle cx="12" cy="17.8" r="1.7" fill="#fff" />
        </Svg>
    </Pressable>
);

// Label above a field, with an optional info icon and a hint line below
const Field = ({ label, info, hint, style, children }) => (
    <View style={[styles.field, style]}>
        <View style={styles.labelRow}>
            <Text style={[A.label, styles.labelInRow]} numberOfLines={1}>{label}</Text>
            {info ? <InfoTip text={info} /> : null}
        </View>
        {children}
        {hint ? <Text style={A.hint}>{hint}</Text> : null}
    </View>
);

export default function Register() {
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [otp, setOtp] = useState('');
    // When the latest code was sent, and a clock that ticks each second on step 2
    const [codeSentAt, setCodeSentAt] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const [focused, setFocused] = useState('');
    const [studentData, setStudentData] = useState({
        student_id: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        gender: '',
        course: '',
        department: '',
        year_level: '',
        email: '',
        contact_number: '',
        password: ''
    });
    // Kept outside studentData so it isn't sent to the API
    const [confirmPassword, setConfirmPassword] = useState('');
    const passwordMismatch = confirmPassword.length > 0 && confirmPassword !== studentData.password;
    const courseOptions = DEPARTMENT_COURSES[studentData.department] || [];
    const yearOptions = yearLevelsFor(studentData.department);
    const codeBoxes = useRef([]);
    const qrRef = useRef();
    const { width } = useWindowDimensions();
    const set = (key) => (value) => setStudentData((prev) => ({ ...prev, [key]: value }));

    // Shared props for the text boxes: faint placeholder and focus outline
    const inputProps = (key) => ({
        placeholderTextColor: C.placeholder,
        onFocus: () => setFocused(key),
        onBlur: () => setFocused(''),
        style: [A.input, focused === key && A.inputFocused],
    });

    // A new department (college) clears the program and year level when they don't belong to it (same as the website)
    const changeDepartment = (department) => {
        setStudentData((prev) => ({
            ...prev,
            department,
            course: (DEPARTMENT_COURSES[department] || []).includes(prev.course) ? prev.course : '',
            year_level: yearLevelsFor(department).some((y) => y.value === prev.year_level) ? prev.year_level : '',
        }));
    };

    useEffect(() => {
        if (step !== 2) return undefined;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [step]);

    const secondsSinceSent = Math.floor((now - codeSentAt) / 1000);
    const expiresIn = Math.max(0, CODE_LIFETIME_S - secondsSinceSent);
    const resendIn = Math.max(0, RESEND_AFTER_S - secondsSinceSent);
    const expiresLabel = `${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, '0')}`;
    const codeComplete = /^\d{6}$/.test(otp);

    // The 6 code boxes: typing moves to the next box, backspace to the previous, pasting fills them all
    const focusBox = (i) => codeBoxes.current[Math.max(0, Math.min(CODE_LENGTH - 1, i))]?.focus();
    const changeBox = (i, text) => {
        const chars = otp.padEnd(CODE_LENGTH, ' ').split('');
        let digits = text.replace(/\D/g, '');
        if (!digits) {
            chars[i] = ' ';
            setOtp(chars.join('').trimEnd());
            return;
        }
        // Typing into a box that already had a digit replaces it
        if (digits.length === 2 && chars[i] !== ' ' && digits[0] === chars[i]) digits = digits[1];
        digits.slice(0, CODE_LENGTH - i).split('').forEach((d, k) => { chars[i + k] = d; });
        setOtp(chars.join('').trimEnd());
        focusBox(i + digits.length);
    };
    const boxKeyPress = (i, e) => {
        if (e.nativeEvent.key === 'Backspace' && !(otp[i] || '').trim() && i > 0) {
            const chars = otp.padEnd(CODE_LENGTH, ' ').split('');
            chars[i - 1] = ' ';
            setOtp(chars.join('').trimEnd());
            focusBox(i - 1);
        }
    };

    const requestOTP = async () => {
        // Enter can fire this while a request is still running
        if (saving) return;
        if (!studentData.student_id || !studentData.first_name || !studentData.last_name || !studentData.gender || !studentData.course || !studentData.department || !studentData.year_level || !studentData.email || !studentData.password.trim()) {
            showAlert('Missing Fields', 'Please fill in all required fields.');
            return;
        }
        const middleError = middleNameError(studentData.middle_name);
        if (middleError) {
            showAlert('Middle Name', middleError);
            return;
        }
        if (studentData.contact_number.length !== 11) {
            showAlert('Invalid Contact Number', 'Contact number must be exactly 11 digits (e.g. 09123456789).');
            return;
        }
        if (studentData.password.length < 8) {
            showAlert('Password Too Short', 'Your password needs at least 8 characters.');
            return;
        }
        if (studentData.password !== confirmPassword) {
            showAlert('Password Mismatch', 'Passwords do not match. Please re-enter your password.');
            return;
        }

        setSaving(true);
        try {
            // ID and contact are sent so a taken ID is caught before the code is emailed
            await api.post('/students/request_otp/', {
                email: studentData.email,
                student_id: studentData.student_id,
                contact_number: studentData.contact_number,
                // Only used to greet the student in the code email
                name: studentData.first_name
            });
            setOtp('');
            const sentAt = currentTime();
            setCodeSentAt(sentAt);
            setNow(sentAt);
            setStep(2);
            setTimeout(() => focusBox(0), 300);
        } catch (error) {
            showAlert(
                'Error',
                // No response at all means the backend is down or unreachable, not a bad email
                error.response ? (error.response.data?.error || 'Check your email') : OFFLINE_MESSAGE
            );
        } finally {
            setSaving(false);
        }
    };

    const verifyAndRegister = async () => {
        if (saving || !codeComplete) return;
        setSaving(true);
        try {
            // "N/A" (no middle name) isn't part of the name
            const middle = middleNameText(studentData.middle_name);
            const fullName = `${studentData.first_name} ${middle ? middle + ' ' : ''}${studentData.last_name}`.trim();
            await api.post('/students/register_with_otp/', { ...studentData, name: fullName, otp });
            setStep(3);
        } catch (error) {
            showAlert(
                'Verification Failed',
                error.response
                    ? (error.response.data?.error || error.response.data?.message || 'Check your details')
                    : OFFLINE_MESSAGE
            );
        } finally {
            setSaving(false);
        }
    };

    // Saves the QR (on its white box) to the phone's photos
    const downloadQR = async () => {
        const fallback = () => showAlert('Save QR', 'Please take a screenshot of your screen to save your QR code.');
        if (Platform.OS === 'web') return fallback();
        try {
            const { granted } = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
            if (!granted) {
                showAlert('Save QR', 'Allow OSAConnect to save photos, or take a screenshot of your QR code instead.');
                return;
            }
            const uri = await captureRef(qrRef, { format: 'png', quality: 1, width: 1024, height: 1024 });
            await MediaLibrary.saveToLibraryAsync(uri);
            showAlert('QR saved', 'Your QR code is saved to your photos.');
        } catch {
            fallback();
        }
    };

    // Same format as the website: "ID FIRST MIDDLE LAST COURSE"
    const formatQRData = (student) => {
        const nameParts = [student.first_name, middleNameText(student.middle_name), student.last_name].filter(Boolean);
        const formattedName = nameParts.join(' ').toUpperCase();
        return `${student.student_id} ${formattedName} ${student.course || ''}`.trim();
    };

    // Shown beside the QR on the last step: "Juan S. Dela Cruz" and "BS Information Technology · 2nd Year"
    const displayName = [
        studentData.first_name,
        middleNameText(studentData.middle_name) ? `${middleNameText(studentData.middle_name)[0].toUpperCase()}.` : '',
        studentData.last_name,
    ].filter(Boolean).join(' ');
    const ordinal = (n) => ({ 1: '1st', 2: '2nd', 3: '3rd' }[n] || `${n}th`);
    const yearText = /^\d+$/.test(studentData.year_level) ? `${ordinal(Number(studentData.year_level))} Year` : studentData.year_level;
    const programText = [studentData.course, yearText].filter(Boolean).join(' · ');
    const stackQrCard = width < 400;

    const selectStyle = [A.input, styles.select];

    return (
        <AuthScreen maxWidth={560} logoWidth={270}>
            {/* Step indicator: which of the 3 steps and a progress bar */}
            <Text style={styles.stepLabel}>STEP {step} OF {STEP_COUNT}</Text>
            <View style={styles.progress}>
                {[1, 2, 3].map((n) => (
                    <View key={n} style={[styles.progressPart, { backgroundColor: n <= step ? C.gold : C.track }]} />
                ))}
            </View>

            <Text style={[A.title, styles.heading]}>{TITLES[step]}</Text>

            {step === 1 && (
                <View>
                    <Text style={[A.subtitle, styles.intro]}>Use the same details as your USTP school ID.</Text>

                    <Field label="Student ID number" hint="Numbers only, as printed on your school ID.">
                        <TextInput {...inputProps('id')} returnKeyType="go" onSubmitEditing={requestOTP} placeholder="Student ID number" keyboardType="number-pad" maxLength={12}
                            value={studentData.student_id} onChangeText={(t) => set('student_id')(t.replace(/\D/g, '').slice(0, 12))} />
                    </Field>

                    <Field label="First name">
                        <TextInput {...inputProps('first')} returnKeyType="go" onSubmitEditing={requestOTP} placeholder="First name" autoComplete="name-given" value={studentData.first_name} onChangeText={set('first_name')} />
                    </Field>
                    <View style={styles.row}>
                        <Field label="Middle name" info={MIDDLE_NAME_HINT} style={styles.half}>
                            <TextInput {...inputProps('middle')} returnKeyType="go" onSubmitEditing={requestOTP} placeholder="Middle name" autoComplete="name-middle" value={studentData.middle_name} onChangeText={set('middle_name')} />
                        </Field>
                        <Field label="Last name" style={styles.half}>
                            <TextInput {...inputProps('last')} returnKeyType="go" onSubmitEditing={requestOTP} placeholder="Last name" autoComplete="name-family" value={studentData.last_name} onChangeText={set('last_name')} />
                        </Field>
                    </View>

                    {/* College first; it decides the program list and year levels (Grade 11/12 for SHS) */}
                    <Field label="College">
                        <SelectField
                            value={studentData.department}
                            options={DEPARTMENTS}
                            placeholder="Choose your college"
                            placeholderColor={C.placeholder}
                            title="Choose your college"
                            onChange={changeDepartment}
                            style={selectStyle}
                            textStyle={studentData.department ? styles.selectText : styles.selectPlaceholder}
                            iconColor={C.textMuted}
                        />
                    </Field>
                    <Field label="Program">
                        <SelectField
                            value={studentData.course}
                            options={courseOptions}
                            placeholder={studentData.department ? 'Choose your program' : 'Choose a college first'}
                            placeholderColor={C.placeholder}
                            title="Choose your program"
                            searchable={courseOptions.length > 6}
                            disabled={!studentData.department}
                            onChange={set('course')}
                            style={selectStyle}
                            textStyle={studentData.course ? styles.selectText : styles.selectPlaceholder}
                            iconColor={C.textMuted}
                        />
                    </Field>
                    {/* Short choices side by side */}
                    <View style={styles.row}>
                        <Field label="Gender" style={styles.half}>
                            <SelectField
                                value={studentData.gender}
                                options={GENDERS}
                                placeholder="Choose"
                                placeholderColor={C.placeholder}
                                title="Choose your gender"
                                onChange={set('gender')}
                                style={selectStyle}
                                textStyle={studentData.gender ? styles.selectText : styles.selectPlaceholder}
                                iconColor={C.textMuted}
                            />
                        </Field>
                        <Field label="Year level" style={styles.half}>
                            <SelectField
                                value={studentData.year_level}
                                options={yearOptions}
                                placeholder={studentData.department ? 'Choose' : 'College first'}
                                placeholderColor={C.placeholder}
                                title="Choose your year"
                                disabled={!studentData.department}
                                onChange={set('year_level')}
                                style={selectStyle}
                                textStyle={studentData.year_level ? styles.selectText : styles.selectPlaceholder}
                                iconColor={C.textMuted}
                            />
                        </Field>
                    </View>

                    <Field label="Contact number" hint="11 digits, like 09171234567.">
                        <TextInput {...inputProps('contact')} returnKeyType="go" onSubmitEditing={requestOTP} placeholder="Contact number" keyboardType="number-pad" maxLength={11} autoComplete="tel"
                            value={studentData.contact_number} onChangeText={(t) => set('contact_number')(t.replace(/\D/g, '').slice(0, 11))} />
                    </Field>
                    <Field label="Email" hint="We'll send your code and OSA notices here.">
                        <TextInput {...inputProps('email')} returnKeyType="go" onSubmitEditing={requestOTP} placeholder="Email" keyboardType="email-address" autoCapitalize="none" autoComplete="email"
                            value={studentData.email} onChangeText={set('email')} />
                    </Field>

                    <View style={styles.row}>
                        <Field label="Password" hint="At least 8 characters." style={styles.half}>
                            <TextInput {...inputProps('password')} returnKeyType="go" onSubmitEditing={requestOTP} placeholder="Password" secureTextEntry autoComplete="new-password"
                                value={studentData.password} onChangeText={set('password')} />
                        </Field>
                        <Field label="Re-enter password" style={styles.half}>
                            <TextInput {...inputProps('password2')} returnKeyType="go" onSubmitEditing={requestOTP} style={[A.input, focused === 'password2' && A.inputFocused, passwordMismatch && A.inputError]}
                                placeholder="Re-enter" secureTextEntry autoComplete="new-password" value={confirmPassword} onChangeText={setConfirmPassword} />
                            {passwordMismatch ? <Text style={A.errorText}>Passwords do not match.</Text> : null}
                        </Field>
                    </View>

                    <View style={styles.submitRow}>
                        <TouchableOpacity style={[A.primaryButton, styles.submitButton, saving && A.disabled]} onPress={requestOTP} disabled={saving}>
                            {saving ? <ActivityIndicator color="#ffffff" /> : (
                                <>
                                    <Text style={A.primaryButtonText} numberOfLines={1}>Send verification code</Text>
                                    <ChevronRight size={16} color="#ffffff" />
                                </>
                            )}
                        </TouchableOpacity>
                        <Text style={[styles.stepLogin, styles.submitLogin]}>
                            Already registered?{' '}
                            <Link href="/login" style={A.linkText}>Log in</Link>
                        </Text>
                    </View>
                </View>
            )}

            {step === 2 && (
                <View>
                    <Text style={[A.subtitle, styles.intro]}>Enter the 6-digit code we sent you. It expires in 5 minutes. No email yet? Check your Spam or Junk folder.</Text>

                    <View style={styles.panel}>
                        <Mail size={16} color={C.navy} />
                        <Text style={styles.panelText}>
                            Code sent to <Text style={styles.bold}>{studentData.email}</Text>
                        </Text>
                    </View>

                    <View style={styles.codeRow}>
                        {Array.from({ length: CODE_LENGTH }, (_, i) => (
                            <TextInput
                                key={i}
                                ref={(el) => { codeBoxes.current[i] = el; }}
                                style={[styles.codeBox, focused === `code${i}` && styles.codeBoxFocused]}
                                keyboardType="number-pad"
                                // The first box takes a whole pasted code
                                maxLength={i === 0 ? CODE_LENGTH : 1}
                                textContentType={i === 0 ? 'oneTimeCode' : 'none'}
                                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                                accessibilityLabel={`Digit ${i + 1}`}
                                value={(otp[i] || '').trim()}
                                onChangeText={(t) => changeBox(i, t)}
                                onKeyPress={(e) => boxKeyPress(i, e)}
                                onFocus={() => setFocused(`code${i}`)}
                                onBlur={() => setFocused('')}
                                selectTextOnFocus
                                returnKeyType="go"
                                onSubmitEditing={verifyAndRegister}
                            />
                        ))}
                    </View>

                    <View style={styles.expiryRow}>
                        {expiresIn > 0 ? (
                            <Text style={styles.small}>Code expires in <Text style={styles.bold}>{expiresLabel}</Text></Text>
                        ) : (
                            <Text style={[styles.small, styles.expired]}>Code expired</Text>
                        )}
                        <Text style={styles.small}> · </Text>
                        {resendIn > 0 ? (
                            <Text style={styles.small}>Resend in {resendIn}s</Text>
                        ) : (
                            <TouchableOpacity onPress={requestOTP} disabled={saving}>
                                <Text style={A.linkText}>Resend code</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.buttonPair}>
                        <TouchableOpacity style={[styles.outlineButton, styles.pairItem]} onPress={() => setStep(1)}>
                            <Text style={styles.outlineButtonText}>← Edit details</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[A.primaryButton, styles.pairItem, (saving || !codeComplete || expiresIn === 0) && A.disabled]}
                            onPress={verifyAndRegister}
                            disabled={saving || !codeComplete || expiresIn === 0}
                        >
                            {saving ? <ActivityIndicator color="#ffffff" /> : (
                                <Text style={[A.primaryButtonText, styles.center]} numberOfLines={2}>Verify and create account</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {step === 3 && (
                <View>
                    <Text style={A.subtitle}>This is your personal OSAConnect QR code. Guards and OSA staff scan it to find your record.</Text>
                    <View style={styles.created}>
                        <CheckCircle2 size={18} color={C.success} />
                        <Text style={styles.createdText}>Account created</Text>
                    </View>

                    {/* QR on the left, the details it belongs to on the right (stacked on narrow phones) */}
                    <View style={[styles.panel, styles.qrPanel, stackQrCard && styles.qrPanelStacked]}>
                        <View ref={qrRef} collapsable={false} style={styles.qrBox}>
                            <QRCode value={formatQRData(studentData)} size={132} ecl="H" />
                        </View>
                        <View style={[styles.details, stackQrCard && styles.detailsStacked]}>
                            <Text style={styles.detailLabel}>STUDENT ID</Text>
                            <Text style={styles.detailId}>{studentData.student_id}</Text>
                            <Text style={styles.detailLabel}>NAME</Text>
                            <Text style={styles.detailValue}>{displayName}</Text>
                            <Text style={styles.detailLabel}>PROGRAM</Text>
                            <Text style={styles.detailValue}>{programText}</Text>
                        </View>
                    </View>

                    <Text style={[styles.small, styles.saveNote]}>Save it to your phone or print it. You can also find it anytime in your Settings.</Text>

                    <View style={styles.buttonPair}>
                        <TouchableOpacity style={[styles.goldButton, styles.pairItem]} onPress={downloadQR}>
                            <Download size={16} color={C.text} />
                            <Text style={styles.goldButtonText}>Download QR code</Text>
                        </TouchableOpacity>
                        <Link href="/login" asChild>
                            <TouchableOpacity style={[A.primaryButton, styles.pairItem]}>
                                <Text style={A.primaryButtonText}>Continue to log in</Text>
                                <ChevronRight size={16} color="#ffffff" />
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            )}
        </AuthScreen>
    );
}

const styles = StyleSheet.create({
    stepLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.6, color: C.goldText },
    stepLogin: { fontSize: 12, color: C.textSoft, flexShrink: 1 },
    // One row like the website: "Log in" on the left, the button on the right (row-reverse: the button comes
    // first in the code). "Already registered?" wraps to two short lines on narrow phones.
    submitRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 2 },
    submitLogin: { flexShrink: 1 },
    submitButton: { flexShrink: 0 },
    progress: { flexDirection: 'row', gap: 6, marginTop: 8 },
    progressPart: { flex: 1, height: 6, borderRadius: 3 },
    heading: { marginTop: 12 },
    intro: { marginBottom: 14 },
    field: { marginBottom: 10 },
    // The label and its info icon on one line; the row keeps the label's usual space below
    labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    labelInRow: { marginBottom: 0, flexShrink: 1 },
    infoTip: { marginLeft: 5 },
    row: { flexDirection: 'row', gap: 10 },
    half: { flex: 1, minWidth: 0 },
    select: { justifyContent: 'center' },
    // The dropdown's text style also covers its placeholder, so the faint one is picked when nothing is chosen
    selectText: { color: C.text, fontSize: 14, fontWeight: '600' },
    selectPlaceholder: { color: C.placeholder, fontSize: 14, fontWeight: '600' },
    panel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: C.panel,
        borderWidth: 1,
        borderColor: C.fieldBorder,
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    panelText: { flex: 1, fontSize: 13, color: '#1e293b' },
    bold: { fontWeight: '700', color: C.text },
    codeRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
    codeBox: {
        flex: 1,
        aspectRatio: 1,
        maxHeight: 54,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: C.fieldBorder,
        backgroundColor: C.field,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: '700',
        color: C.text,
        padding: 0,
    },
    codeBoxFocused: { borderColor: C.gold, borderWidth: 2, backgroundColor: '#ffffff' },
    expiryRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 10 },
    small: { fontSize: 12, color: C.textSoft },
    expired: { fontWeight: '700', color: C.danger },
    buttonPair: { flexDirection: 'row', gap: 10, marginTop: 18 },
    pairItem: { flex: 1, paddingHorizontal: 8 },
    outlineButton: {
        height: 42,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: C.fieldBorder,
        backgroundColor: 'rgba(255,255,255,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    outlineButtonText: { fontSize: 14, fontWeight: '700', color: C.text },
    center: { textAlign: 'center' },
    created: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    createdText: { fontSize: 14, fontWeight: '700', color: C.success },
    qrPanel: { marginTop: 12, padding: 14, gap: 16, alignItems: 'center' },
    qrPanelStacked: { flexDirection: 'column' },
    qrBox: { backgroundColor: '#ffffff', padding: 10, borderRadius: 6 },
    details: { flex: 1, minWidth: 0 },
    detailsStacked: { flex: 0, width: '100%' },
    detailLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, color: C.textMuted, marginTop: 6 },
    detailId: { fontSize: 20, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'] },
    detailValue: { fontSize: 14, fontWeight: '700', color: C.text },
    saveNote: { marginTop: 10 },
    goldButton: {
        height: 42,
        borderRadius: 6,
        backgroundColor: C.goldButton,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    goldButtonText: { fontSize: 14, fontWeight: '700', color: C.text },
});
