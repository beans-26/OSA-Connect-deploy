import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { Mail, Lock, ChevronRight, CheckCircle2, ArrowLeft } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import api from '../services/api';

const CSSLogo = () => (
    <View style={styles.logoContainer}>
        <View style={styles.logoBox}>
            <View style={styles.logoAccent} />
            <Text style={styles.logoOsa}>OSA</Text>
        </View>
        <Text style={styles.logoConnect}>Connect</Text>
    </View>
);

export default function ForgotPassword() {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [otpCooldown, setOtpCooldown] = useState(0);

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

    const handleRequestOTP = async () => {
        if (!email) {
            Alert.alert('Error', 'Please enter your email');
            return;
        }
        setLoading(true);
        try {
            await api.post('/students/request_password_reset/', { email });
            setStep(2);
            startCooldown();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to send reset code');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = () => {
        if (otp.length === 6) {
            setStep(3);
        } else {
            Alert.alert('Error', 'Please enter a 6-digit code');
        }
    };

    const handleResetPassword = async () => {
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        if (!newPassword) {
            Alert.alert('Error', 'Please enter a new password');
            return;
        }
        setLoading(true);
        try {
            await api.post('/students/reset_password/', { email, otp, password: newPassword });
            setStep(4);
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <CSSLogo />
                    <Text style={styles.title}>Security Recovery</Text>
                </View>

                <View style={styles.card}>
                    {step === 1 && (
                        <View style={styles.stepContainer}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Account Email</Text>
                                <View style={styles.inputContainer}>
                                    <Mail size={18} color={Colors.textMuted} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter registered email"
                                        placeholderTextColor={Colors.textMuted}
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>
                            </View>
                            
                            <TouchableOpacity style={[styles.primaryButton, loading && styles.disabledButton]} onPress={handleRequestOTP} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff" /> : (
                                    <>
                                        <Text style={styles.primaryButtonText}>Send Reset Code</Text>
                                        <ChevronRight size={16} color="#fff" />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {step === 2 && (
                        <View style={styles.stepContainer}>
                            <Text style={styles.emailSentText}>We sent a verification code to</Text>
                            <Text style={styles.emailText}>{email}</Text>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, {textAlign: 'center'}]}>6-Digit Code</Text>
                                <TextInput
                                    style={styles.otpInput}
                                    placeholder="000000"
                                    placeholderTextColor={Colors.textMuted}
                                    maxLength={6}
                                    keyboardType="number-pad"
                                    value={otp}
                                    onChangeText={(t) => setOtp(t.replace(/\D/g, ''))}
                                />
                            </View>
                            
                            <TouchableOpacity style={[styles.primaryButton, otp.length < 6 && styles.disabledButton]} onPress={handleVerifyOTP} disabled={otp.length < 6}>
                                <Text style={styles.primaryButtonText}>Verify Code</Text>
                                <ChevronRight size={16} color="#fff" />
                            </TouchableOpacity>

                            <View style={styles.resendContainer}>
                                {otpCooldown > 0 ? (
                                    <Text style={styles.resendText}>Resend in {otpCooldown}s</Text>
                                ) : (
                                    <TouchableOpacity onPress={handleRequestOTP}>
                                        <Text style={styles.linkText}>Resend Code</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}

                    {step === 3 && (
                        <View style={styles.stepContainer}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>New Password</Text>
                                <View style={styles.inputContainer}>
                                    <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="New password"
                                        placeholderTextColor={Colors.textMuted}
                                        secureTextEntry
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Confirm Password</Text>
                                <View style={styles.inputContainer}>
                                    <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Confirm password"
                                        placeholderTextColor={Colors.textMuted}
                                        secureTextEntry
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                    />
                                </View>
                            </View>
                            
                            <TouchableOpacity style={[styles.primaryButton, loading && styles.disabledButton]} onPress={handleResetPassword} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff" /> : (
                                    <>
                                        <Text style={styles.primaryButtonText}>Update Password</Text>
                                        <CheckCircle2 size={16} color="#fff" />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {step === 4 && (
                        <View style={[styles.stepContainer, {alignItems: 'center'}]}>
                            <View style={styles.successIconContainer}>
                                <CheckCircle2 size={32} color={Colors.success} />
                            </View>
                            <Text style={styles.successTitle}>Password Reset Success</Text>
                            <Text style={styles.successSubtitle}>Your security credentials have been updated successfully.</Text>
                            
                            <Link href="/login" asChild>
                                <TouchableOpacity style={[styles.primaryButton, {width: '100%', backgroundColor: Colors.text}]}>
                                    <Text style={styles.primaryButtonText}>Back to Login</Text>
                                </TouchableOpacity>
                            </Link>
                        </View>
                    )}
                </View>

                {step < 4 && (
                    <View style={styles.footer}>
                        <Link href="/login" asChild>
                            <TouchableOpacity style={styles.backLink}>
                                <ArrowLeft size={12} color={Colors.textMuted} style={{marginRight: 4}} />
                                <Text style={styles.backLinkText}>Back to Login</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
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
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
        textTransform: 'uppercase',
        letterSpacing: -0.5,
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
    inputGroup: {
        marginBottom: 20,
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
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        height: 48,
    },
    inputIcon: {
        paddingHorizontal: 12,
    },
    input: {
        flex: 1,
        height: '100%',
        color: Colors.text,
        fontWeight: '600',
        fontSize: 14,
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
    primaryButton: {
        backgroundColor: Colors.secondary,
        height: 48,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
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
    emailSentText: {
        textAlign: 'center',
        color: Colors.textMuted,
        fontSize: 14,
        marginTop: 8,
    },
    emailText: {
        textAlign: 'center',
        color: Colors.text,
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 24,
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
    linkText: {
        color: Colors.secondary,
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        textDecorationLine: 'underline',
    },
    successIconContainer: {
        width: 64,
        height: 64,
        backgroundColor: '#ecfdf5',
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#d1fae5',
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 8,
    },
    successSubtitle: {
        fontSize: 14,
        color: Colors.textMuted,
        textAlign: 'center',
        marginBottom: 24,
    },
    footer: {
        alignItems: 'center',
        marginTop: 24,
    },
    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backLinkText: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
});
