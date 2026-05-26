import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { UserPlus, Mail, KeyRound, ChevronRight, CheckCircle2, Download, IdCard, GraduationCap, Building2, Layers, Phone, Lock } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { Colors } from '../constants/Colors';
import { COURSES, DEPARTMENTS } from '../constants/Data';
import api from '../services/api';
// Using TextInputs instead of picker for simplicity without adding dependencies

const CSSLogo = () => (
    <View style={styles.logoContainer}>
        <View style={styles.logoBox}>
            <View style={styles.logoAccent} />
            <Text style={styles.logoOsa}>OSA</Text>
        </View>
        <Text style={styles.logoConnect}>Connect</Text>
    </View>
);

export default function Register() {
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [otp, setOtp] = useState('');
    const [otpCooldown, setOtpCooldown] = useState(0);
    const [studentData, setStudentData] = useState({
        student_id: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        course: '',
        department: '',
        year_level: '',
        email: '',
        contact_number: '',
        password: ''
    });

    const qrRef = useRef();

    const startCooldown = () => {
        setOtpCooldown(60);
        const interval = setInterval(() => {
            setOtpCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const requestOTP = async () => {
        // Validate required fields
        if (!studentData.student_id || !studentData.first_name || !studentData.last_name || !studentData.email) {
            Alert.alert("Missing Fields", "Please fill in all required fields.");
            return;
        }

        setSaving(true);
        try {
            const response = await api.post('/students/request_otp/', { email: studentData.email });
            setStep(2);
            startCooldown();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Check your email');
        } finally {
            setSaving(false);
        }
    };

    const verifyAndRegister = async () => {
        if (otp.length < 6) return;
        setSaving(true);
        try {
            const fullName = `${studentData.first_name} ${studentData.middle_name ? studentData.middle_name + ' ' : ''}${studentData.last_name}`.trim();
            const payload = {
                ...studentData,
                name: fullName,
                password: studentData.password || studentData.student_id,
                otp: otp
            };
            const response = await api.post('/students/register_with_otp/', payload);
            setStep(3);
        } catch (error) {
            Alert.alert('Verification Failed', error.response?.data?.error || error.response?.data?.message || 'Check your details');
        } finally {
            setSaving(false);
        }
    };

    const downloadQR = async () => {
        Alert.alert('Save QR', 'Please take a screenshot of your screen to save your QR code.');
    };

    const formatQRData = (student) => {
        const nameParts = [student.first_name, student.middle_name, student.last_name].filter(Boolean);
        const formattedName = nameParts.join(' ').toUpperCase();
        return `${student.student_id} ${formattedName} ${student.course || ''}`.trim();
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <CSSLogo />
                    <Text style={styles.title}>Student Identity Proxy</Text>
                    <Text style={styles.subtitle}>Registry Portal</Text>
                </View>

                <View style={styles.card}>
                    {step === 1 && (
                        <View style={styles.stepContainer}>
                            <View style={styles.stepHeader}>
                                <Text style={styles.stepTitle}>Account Details</Text>
                                <Text style={styles.stepSubtitle}>Step 01: Personal Information</Text>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Student ID</Text>
                                <TextInput style={styles.input} placeholder="2023303188" value={studentData.student_id} onChangeText={(t) => setStudentData({...studentData, student_id: t})} />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.formGroup, {flex: 1, marginRight: 8}]}>
                                    <Text style={styles.label}>First Name</Text>
                                    <TextInput style={styles.input} placeholder="Juan" value={studentData.first_name} onChangeText={(t) => setStudentData({...studentData, first_name: t})} />
                                </View>
                                <View style={[styles.formGroup, {flex: 1, marginLeft: 8}]}>
                                    <Text style={styles.label}>Last Name</Text>
                                    <TextInput style={styles.input} placeholder="Cruz" value={studentData.last_name} onChangeText={(t) => setStudentData({...studentData, last_name: t})} />
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Middle Name (Optional)</Text>
                                <TextInput style={styles.input} placeholder="Dela" value={studentData.middle_name} onChangeText={(t) => setStudentData({...studentData, middle_name: t})} />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Course</Text>
                                <TextInput style={styles.input} placeholder="e.g. BS Information Technology" value={studentData.course} onChangeText={(t) => setStudentData({...studentData, course: t})} />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Department</Text>
                                <TextInput style={styles.input} placeholder="e.g. CITC" value={studentData.department} onChangeText={(t) => setStudentData({...studentData, department: t})} />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.formGroup, {flex: 1, marginRight: 8}]}>
                                    <Text style={styles.label}>Year Level</Text>
                                    <TextInput style={styles.input} placeholder="1, 2, 3..." keyboardType="numeric" value={studentData.year_level} onChangeText={(t) => setStudentData({...studentData, year_level: t})} />
                                </View>
                                <View style={[styles.formGroup, {flex: 1, marginLeft: 8}]}>
                                    <Text style={styles.label}>Contact</Text>
                                    <TextInput style={styles.input} placeholder="09XXX" keyboardType="phone-pad" value={studentData.contact_number} onChangeText={(t) => setStudentData({...studentData, contact_number: t})} />
                                </View>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Email Address</Text>
                                <TextInput style={styles.input} placeholder="student@example.edu" keyboardType="email-address" autoCapitalize="none" value={studentData.email} onChangeText={(t) => setStudentData({...studentData, email: t})} />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Password</Text>
                                <TextInput style={styles.input} placeholder="ID as default if blank" secureTextEntry value={studentData.password} onChangeText={(t) => setStudentData({...studentData, password: t})} />
                            </View>

                            <TouchableOpacity style={[styles.primaryButton, saving && styles.disabledButton]} onPress={requestOTP} disabled={saving}>
                                {saving ? <ActivityIndicator color="#fff" /> : (
                                    <>
                                        <Text style={styles.primaryButtonText}>Verify Email</Text>
                                        <ChevronRight size={18} color="#fff" />
                                    </>
                                )}
                            </TouchableOpacity>

                            <View style={styles.footerLink}>
                                <Text style={styles.footerText}>Already have an account? </Text>
                                <Link href="/login" asChild>
                                    <TouchableOpacity>
                                        <Text style={styles.linkText}>Log in</Text>
                                    </TouchableOpacity>
                                </Link>
                            </View>
                        </View>
                    )}

                    {step === 2 && (
                        <View style={styles.stepContainer}>
                            <View style={styles.iconCircle}>
                                <Mail size={32} color={Colors.primary} />
                            </View>
                            <Text style={[styles.stepTitle, {textAlign: 'center'}]}>Verify Your Email</Text>
                            <Text style={[styles.stepSubtitle, {textAlign: 'center'}]}>Step 02: Verification Code</Text>
                            <Text style={styles.emailSentText}>We sent a 6-digit code to {studentData.email}</Text>

                            <View style={styles.otpContainer}>
                                <Text style={[styles.label, {textAlign: 'center'}]}>6-Digit Code</Text>
                                <TextInput 
                                    style={styles.otpInput} 
                                    placeholder="000000" 
                                    maxLength={6}
                                    keyboardType="number-pad"
                                    value={otp}
                                    onChangeText={(t) => setOtp(t.replace(/\D/g, ''))}
                                />
                            </View>

                            <TouchableOpacity style={[styles.primaryButton, (saving || otp.length < 6) && styles.disabledButton]} onPress={verifyAndRegister} disabled={saving || otp.length < 6}>
                                {saving ? <ActivityIndicator color="#fff" /> : (
                                    <>
                                        <Text style={styles.primaryButtonText}>Complete Registration</Text>
                                        <ChevronRight size={18} color="#fff" />
                                    </>
                                )}
                            </TouchableOpacity>

                            <View style={styles.resendContainer}>
                                {otpCooldown > 0 ? (
                                    <Text style={styles.resendText}>Resend code in {otpCooldown}s</Text>
                                ) : (
                                    <TouchableOpacity onPress={requestOTP}>
                                        <Text style={styles.linkText}>Resend Code</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            
                            <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
                                <Text style={styles.backButtonText}>← Back to Details</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {step === 3 && (
                        <View style={styles.stepContainer}>
                            <View style={[styles.iconCircle, {backgroundColor: '#ecfdf5', borderColor: '#d1fae5'}]}>
                                <CheckCircle2 size={32} color={Colors.success} />
                            </View>
                            <Text style={[styles.stepTitle, {textAlign: 'center'}]}>Registration Success</Text>
                            <Text style={styles.successDesc}>Verification complete. Save your official QR credentials below for campus entry.</Text>

                            <View style={styles.qrContainer} ref={qrRef} collapsable={false}>
                                <QRCode value={formatQRData(studentData)} size={200} />
                            </View>

                            <View style={styles.successActions}>
                                <TouchableOpacity style={[styles.primaryButton, {flex: 1, marginRight: 8}]} onPress={downloadQR}>
                                    <Download size={18} color="#fff" style={{marginRight: 8}}/>
                                    <Text style={styles.primaryButtonText}>Save QR</Text>
                                </TouchableOpacity>
                                
                                <Link href="/login" asChild>
                                    <TouchableOpacity style={[styles.secondaryButton, {flex: 1, marginLeft: 8}]}>
                                        <Text style={styles.secondaryButtonText}>Login</Text>
                                    </TouchableOpacity>
                                </Link>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        padding: 24,
        flexGrow: 1,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 20,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    logoBox: {
        position: 'relative',
        marginRight: 8,
    },
    logoAccent: {
        position: 'absolute',
        top: -4,
        left: -4,
        width: 16,
        height: 12,
        backgroundColor: Colors.accent,
        borderTopRightRadius: 4,
        borderTopLeftRadius: 2,
    },
    logoOsa: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.text,
        zIndex: 10,
    },
    logoConnect: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
        textTransform: 'uppercase',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: Colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 2,
        opacity: 0.6,
        marginTop: 4,
    },
    card: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    stepContainer: {
        width: '100%',
    },
    stepHeader: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.background,
        paddingBottom: 16,
        marginBottom: 24,
    },
    stepTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
    },
    stepSubtitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: Colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 10,
        fontWeight: 'bold',
        color: Colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 6,
        marginLeft: 4,
    },
    input: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        padding: 12,
        color: Colors.text,
        fontWeight: '600',
        fontSize: 14,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: 16,
        opacity: 0.5,
    },
    primaryButton: {
        backgroundColor: Colors.secondary,
        height: 48,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    disabledButton: {
        opacity: 0.7,
    },
    primaryButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginRight: 8,
    },
    secondaryButton: {
        backgroundColor: Colors.background,
        height: 48,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    secondaryButtonText: {
        color: Colors.textMuted,
        fontWeight: 'bold',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    footerLink: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    footerText: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    linkText: {
        color: Colors.secondary,
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        textDecorationLine: 'underline',
    },
    iconCircle: {
        width: 64,
        height: 64,
        backgroundColor: '#eff6ff',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    emailSentText: {
        textAlign: 'center',
        color: Colors.textMuted,
        fontSize: 14,
        marginTop: 12,
        marginBottom: 24,
    },
    otpContainer: {
        maxWidth: 240,
        alignSelf: 'center',
        width: '100%',
        marginBottom: 24,
    },
    otpInput: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        padding: 16,
        color: Colors.text,
        fontWeight: 'bold',
        fontSize: 24,
        letterSpacing: 8,
        textAlign: 'center',
    },
    resendContainer: {
        alignItems: 'center',
        marginTop: 16,
    },
    resendText: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    backButton: {
        alignItems: 'center',
        marginTop: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    backButtonText: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    successDesc: {
        textAlign: 'center',
        color: Colors.textMuted,
        fontSize: 14,
        fontWeight: '600',
        marginTop: 8,
        marginBottom: 32,
        paddingHorizontal: 16,
    },
    qrContainer: {
        backgroundColor: '#fff',
        padding: 24,
        borderRadius: 16,
        alignSelf: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: 32,
    },
    successActions: {
        flexDirection: 'row',
        justifyContent: 'center',
    }
});
