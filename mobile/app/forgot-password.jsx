import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { Mail, MailWarning, ChevronRight, CheckCircle2, ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import AuthScreen, { authColors as C, authStyles as A } from '../components/AuthScreen';
import api from '../services/api';

// Forgot password, in the same look as registration and the website (frontend/src/pages/ForgotPassword.jsx):
// 1) the account's email, 2) the emailed code (checked right away), 3) the new password, then a done screen.
// The code is valid 5 minutes; a new one can be asked for after a minute.

const OFFLINE_MESSAGE = "Can't reach the server. Check your internet connection and try again.";
const STEP_COUNT = 3;
const CODE_LENGTH = 6;
const CODE_LIFETIME_S = 300;
const RESEND_AFTER_S = 60;
const MIN_PASSWORD = 8;
const TITLES = { 1: 'Forgot your password?', 2: 'Enter the code', 3: 'Set a new password', 4: 'Password changed' };

const errorOf = (error, fallback) => (error.response ? (error.response.data?.error || fallback) : OFFLINE_MESSAGE);

export default function ForgotPassword() {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false); // the code email is on its way ("Sending code to …")
    const [error, setError] = useState('');
    const [codeError, setCodeError] = useState('');
    const [focused, setFocused] = useState('');
    const [sentAt, setSentAt] = useState(0);
    const [now, setNow] = useState(Date.now());
    const codeBoxes = useRef([]);

    useEffect(() => {
        if (step !== 2) return undefined;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [step]);

    const secondsSinceSent = Math.floor((now - sentAt) / 1000);
    const expiresIn = Math.max(0, CODE_LIFETIME_S - secondsSinceSent);
    const resendIn = Math.max(0, RESEND_AFTER_S - secondsSinceSent);
    const expiresLabel = `${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, '0')}`;
    const codeComplete = /^\d{6}$/.test(otp);
    const mismatch = confirm.length > 0 && password !== confirm;
    const tooShort = password.length > 0 && password.length < MIN_PASSWORD;

    const inputStyle = (key, invalid) => [A.input, focused === key && A.inputFocused, invalid && A.inputError];

    // The 6 code boxes: typing moves on, backspace goes back, a pasted code fills them all (same as registration)
    const focusBox = (i) => codeBoxes.current[Math.max(0, Math.min(CODE_LENGTH - 1, i))]?.focus();
    const changeBox = (i, text) => {
        const chars = otp.padEnd(CODE_LENGTH, ' ').split('');
        let digits = text.replace(/\D/g, '');
        setCodeError('');
        if (!digits) {
            chars[i] = ' ';
            setOtp(chars.join('').trimEnd());
            return;
        }
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

    // Straight to the code step while the email is sent (that takes a few seconds); if the server says no
    // (e.g. no account with that email), back to step 1 with the reason
    const requestCode = async () => {
        if (sending) return;
        if (!email.trim()) { setError('Type the email you registered with.'); return; }
        const resending = step === 2;
        setError('');
        setOtp('');
        setCodeError('');
        const at = Date.now();
        setSentAt(at);
        setNow(at);
        setStep(2);
        setSending(true);
        setTimeout(() => focusBox(0), 300);
        try {
            await api.post('/students/request_password_reset/', { email: email.trim() });
        } catch (e) {
            if (!resending) setStep(1);
            setError(errorOf(e, "Couldn't send the reset code. Try again."));
        } finally {
            setSending(false);
        }
    };

    // Step 2: the code is checked before the student types a new password
    const verifyCode = async () => {
        if (loading) return;
        if (!codeComplete) { setCodeError('Enter the 6-digit code from the email.'); return; }
        setLoading(true);
        setError('');
        setCodeError('');
        try {
            await api.post('/students/verify_reset_code/', { email: email.trim(), otp });
            setStep(3);
        } catch (e) {
            if (e.response) {
                setCodeError(e.response.data?.error || "That code didn't work. Check it and try again.");
                setOtp('');
                setTimeout(() => focusBox(0), 100);
            } else {
                setError(OFFLINE_MESSAGE);
            }
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async () => {
        if (loading) return;
        if (password.length < MIN_PASSWORD) { setError(`Your new password needs at least ${MIN_PASSWORD} characters.`); return; }
        if (password !== confirm) { setError('The passwords do not match.'); return; }
        setLoading(true);
        setError('');
        setCodeError('');
        try {
            await api.post('/students/reset_password/', { email: email.trim(), otp, password });
            setStep(4);
        } catch (e) {
            const message = errorOf(e, "Couldn't reset the password. Try again.");
            if (e.response && /code/i.test(message)) {
                // The code ran out while typing the password: back to the code step to get a new one
                setStep(2);
                setCodeError(message);
                setOtp('');
                setTimeout(() => focusBox(0), 100);
            } else {
                setError(message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthScreen maxWidth={460} logoWidth={270}>
            <Text style={styles.stepLabel}>{step > STEP_COUNT ? 'DONE' : `STEP ${step} OF ${STEP_COUNT}`}</Text>
            <View style={styles.progress}>
                {[1, 2, 3].map((n) => (
                    <View key={n} style={[styles.progressPart, { backgroundColor: n <= step ? C.gold : C.track }]} />
                ))}
            </View>
            <Text style={[A.title, styles.heading]}>{TITLES[step]}</Text>

            {error ? <Text style={styles.errorBox}>{error}</Text> : null}

            {step === 1 && (
                <View>
                    <Text style={[A.subtitle, styles.intro]}>Type the email you registered with. We&apos;ll send you a 6-digit code to set a new password.</Text>
                    <Text style={A.label}>Email</Text>
                    <TextInput
                        style={inputStyle('email')}
                        placeholder="Email"
                        placeholderTextColor={C.placeholder}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        value={email}
                        onChangeText={setEmail}
                        onFocus={() => setFocused('email')}
                        onBlur={() => setFocused('')}
                        returnKeyType="go"
                        onSubmitEditing={requestCode}
                    />
                    <TouchableOpacity style={[A.primaryButton, styles.fullButton, sending && A.disabled]} onPress={requestCode} disabled={sending}>
                        {loading ? <ActivityIndicator color="#ffffff" /> : (
                            <>
                                <Text style={A.primaryButtonText}>Send reset code</Text>
                                <ChevronRight size={16} color="#ffffff" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {step === 2 && (
                <View>
                    <Text style={[A.subtitle, styles.intro]}>Enter the 6-digit code we sent you. It expires in 5 minutes.</Text>
                    {/* Same reminder as registration: the code email often lands in Spam */}
                    <View style={styles.spamNote}>
                        <MailWarning size={22} color="#d97706" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.spamTitle}>No email yet? Check your Spam or Junk folder.</Text>
                            <Text style={styles.spamText}>The code often lands there. Open it and mark it &quot;Not spam&quot; so the next one arrives in your inbox.</Text>
                        </View>
                    </View>

                    <View style={styles.panel}>
                        {sending ? <ActivityIndicator size="small" color={C.navy} /> : <Mail size={16} color={C.navy} />}
                        <Text style={styles.panelText}>
                            {sending ? 'Sending code to ' : 'Code sent to '}<Text style={styles.bold}>{email.trim()}</Text>{sending ? '…' : ''}
                        </Text>
                    </View>

                    <View style={styles.codeRow}>
                        {Array.from({ length: CODE_LENGTH }, (_, i) => (
                            <TextInput
                                key={i}
                                ref={(el) => { codeBoxes.current[i] = el; }}
                                style={[styles.codeBox, focused === `code${i}` && styles.codeBoxFocused, codeError && styles.codeBoxError]}
                                keyboardType="number-pad"
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
                            />
                        ))}
                    </View>
                    {codeError ? <Text style={A.errorText}>{codeError}</Text> : null}
                    <View style={styles.expiryRow}>
                        {expiresIn > 0
                            ? <Text style={styles.small}>Code expires in <Text style={styles.bold}>{expiresLabel}</Text></Text>
                            : <Text style={[styles.small, styles.expired]}>Code expired</Text>}
                        <Text style={styles.small}> · </Text>
                        {resendIn > 0 ? (
                            <Text style={styles.small}>Resend in {resendIn}s</Text>
                        ) : (
                            <TouchableOpacity onPress={requestCode} disabled={loading || sending}>
                                <Text style={A.linkText}>Resend code</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.buttonPair}>
                        <TouchableOpacity style={[styles.outlineButton, styles.pairItem]} onPress={() => { setStep(1); setError(''); setCodeError(''); }}>
                            <Text style={styles.outlineButtonText}>← Change email</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[A.primaryButton, styles.pairItem, (loading || !codeComplete || expiresIn === 0) && A.disabled]}
                            onPress={verifyCode}
                            disabled={loading || !codeComplete || expiresIn === 0}
                        >
                            {loading ? <ActivityIndicator color="#ffffff" /> : (
                                <>
                                    <Text style={A.primaryButtonText} numberOfLines={1}>Enter code</Text>
                                    <ChevronRight size={16} color="#ffffff" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {step === 3 && (
                <View>
                    <Text style={[A.subtitle, styles.intro]}>Code accepted. Choose a new password for <Text style={styles.bold}>{email.trim()}</Text>.</Text>
                    <View style={styles.passwordHeader}>
                        <Text style={[A.label, { marginBottom: 0 }]}>New password</Text>
                        <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8} style={styles.showToggle} accessibilityLabel={showPassword ? 'Hide passwords' : 'Show passwords'}>
                            {showPassword ? <EyeOff size={15} color={C.textMuted} /> : <Eye size={15} color={C.textMuted} />}
                            <Text style={styles.showText}>{showPassword ? 'Hide' : 'Show'}</Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={inputStyle('password', tooShort)}
                        placeholder="New password"
                        placeholderTextColor={C.placeholder}
                        secureTextEntry={!showPassword}
                        autoComplete="new-password"
                        value={password}
                        onChangeText={setPassword}
                        onFocus={() => setFocused('password')}
                        onBlur={() => setFocused('')}
                    />
                    <Text style={[A.hint, tooShort && styles.hintError]}>At least {MIN_PASSWORD} characters.</Text>
                    <Text style={[A.label, styles.confirmLabel]}>Re-enter password</Text>
                    <TextInput
                        style={inputStyle('confirm', mismatch)}
                        placeholder="Re-enter password"
                        placeholderTextColor={C.placeholder}
                        secureTextEntry={!showPassword}
                        autoComplete="new-password"
                        value={confirm}
                        onChangeText={setConfirm}
                        onFocus={() => setFocused('confirm')}
                        onBlur={() => setFocused('')}
                        returnKeyType="go"
                        onSubmitEditing={resetPassword}
                    />
                    {mismatch ? <Text style={A.errorText}>Passwords do not match.</Text> : null}
                    <TouchableOpacity style={[A.primaryButton, styles.fullButton, loading && A.disabled]} onPress={resetPassword} disabled={loading}>
                        {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={A.primaryButtonText}>Save new password</Text>}
                    </TouchableOpacity>
                </View>
            )}

            {step === 4 && (
                <View>
                    <View style={styles.doneBox}>
                        <CheckCircle2 size={22} color={C.success} />
                        <Text style={styles.doneText}>Your password was changed. Log in with your Student ID or email and the new password.</Text>
                    </View>
                    <Link href="/login" asChild>
                        <TouchableOpacity style={[A.primaryButton, styles.fullButton]}>
                            <Text style={A.primaryButtonText}>Back to login</Text>
                            <ChevronRight size={16} color="#ffffff" />
                        </TouchableOpacity>
                    </Link>
                </View>
            )}

            {step < 4 && (
                <Link href="/login" asChild>
                    <TouchableOpacity style={styles.backLink}>
                        <ArrowLeft size={14} color={C.text} />
                        <Text style={A.linkText}>Back to login</Text>
                    </TouchableOpacity>
                </Link>
            )}
        </AuthScreen>
    );
}

const styles = StyleSheet.create({
    stepLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.6, color: C.goldText },
    progress: { flexDirection: 'row', gap: 6, marginTop: 8 },
    progressPart: { flex: 1, height: 6, borderRadius: 3 },
    heading: { marginTop: 12 },
    intro: { marginBottom: 14 },
    errorBox: {
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#fecaca',
        backgroundColor: '#fef2f2',
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        fontWeight: '700',
        color: C.danger,
    },
    fullButton: { marginTop: 18 },
    spamNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        borderWidth: 2,
        borderColor: '#fbbf24',
        backgroundColor: '#fffbeb',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 11,
        marginBottom: 14,
    },
    spamTitle: { fontSize: 14, fontWeight: '900', color: '#78350f' },
    spamText: { fontSize: 12, fontWeight: '600', color: '#92400e', marginTop: 2, lineHeight: 17 },
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
    codeBoxError: { borderColor: C.danger },
    expiryRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 10 },
    small: { fontSize: 12, color: C.textSoft },
    expired: { fontWeight: '700', color: C.danger },
    passwordHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 5 },
    showToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    showText: { fontSize: 12, fontWeight: '700', color: C.textMuted },
    hintError: { color: C.danger, fontWeight: '700' },
    confirmLabel: { marginTop: 10 },
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
    doneBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#6ee7b7',
        backgroundColor: '#ecfdf5',
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 11,
    },
    doneText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#065f46', lineHeight: 18 },
    backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 16 },
});
