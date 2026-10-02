import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import api from '../services/api';
import { useTheme } from './ThemeContext';
import { shellColors } from './StudentShell';
import { Group, InfoRow } from './SettingsList';

// Personal Info "Contact details": email and contact number, each with a Change form. A new email only saves
// after the 6-digit code sent to it is entered; both ask for the current password.
// Mirrors ContactDetails in frontend/src/pages/student/PersonalInfo.jsx.
const FAINT = 'rgba(148,163,184,0.6)';

export default function ContactDetailsCard({ studentInfo, onUpdated }) {
    const { colors, isDarkMode } = useTheme();
    const accent = shellColors(isDarkMode).accent;
    const styles = getStyles(colors, accent);
    const [editing, setEditing] = useState(null); // 'email' | 'contact' | null
    const [form, setForm] = useState({ value: '', password: '', code: '' });
    const [codeSentTo, setCodeSentTo] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const open = (field) => {
        setEditing(field);
        setForm({ value: '', password: '', code: '' });
        setCodeSentTo('');
        setMessage({ type: '', text: '' });
    };
    const close = () => setEditing(null);

    const run = async (request, onOk) => {
        if (busy) return;
        setBusy(true);
        setMessage({ type: '', text: '' });
        try {
            const { data } = await request();
            onOk(data);
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response ? (error.response.data?.error || 'Something went wrong.') : "Can't reach the server. Check your connection.",
            });
        } finally {
            setBusy(false);
        }
    };

    const sendEmailCode = () => run(
        () => api.post('/students/request_email_change/', {
            student_id: studentInfo.student_id, current_password: form.password, new_email: form.value.trim(),
        }),
        (data) => {
            setCodeSentTo(form.value.trim().toLowerCase());
            setMessage({ type: 'success', text: data.message || 'Code sent.' });
        }
    );

    const confirmEmail = () => run(
        () => api.post('/students/confirm_email_change/', {
            student_id: studentInfo.student_id, new_email: codeSentTo, otp: form.code.trim(),
        }),
        (data) => {
            onUpdated({ email: data.email });
            close();
            setMessage({ type: 'success', text: 'Email updated.' });
        }
    );

    const saveContact = () => run(
        () => api.post('/students/update_contact/', {
            student_id: studentInfo.student_id, current_password: form.password, contact_number: form.value,
        }),
        (data) => {
            onUpdated({ contact_number: data.contact_number });
            close();
            setMessage({ type: 'success', text: 'Contact number updated.' });
        }
    );

    const buttons = ({ onCancel, cancelLabel = 'Cancel', onSubmit, label, disabled }) => (
        <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancel} onPress={onCancel}>
                <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submit, (busy || disabled) && { opacity: 0.6 }]} onPress={onSubmit} disabled={busy || disabled}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{label}</Text>}
            </TouchableOpacity>
        </View>
    );
    const changeButton = (field) => (
        <TouchableOpacity style={styles.change} onPress={() => open(field)} accessibilityRole="button">
            <Text style={styles.changeText}>Change</Text>
        </TouchableOpacity>
    );
    const input = (props) => <TextInput style={styles.input} placeholderTextColor={FAINT} autoCapitalize="none" {...props} />;

    return (
        <Group label="Contact details">
            {!!message.text && (
                <Text style={[styles.message, message.type === 'success' ? styles.success : styles.error]}>{message.text}</Text>
            )}
            <View>
                <InfoRow label="Email" value={studentInfo.email} action={editing !== 'email' && changeButton('email')} />
                {editing === 'email' && (!codeSentTo ? (
                    <View style={styles.form}>
                        {input({ placeholder: 'New email', keyboardType: 'email-address', value: form.value, onChangeText: (t) => setForm({ ...form, value: t }) })}
                        {input({ placeholder: 'Current password', secureTextEntry: true, value: form.password, onChangeText: (t) => setForm({ ...form, password: t }) })}
                        {buttons({ onCancel: close, onSubmit: sendEmailCode, label: 'Send code', disabled: !form.value.trim() || !form.password })}
                    </View>
                ) : (
                    <View style={styles.form}>
                        <Text style={styles.hint}>
                            Enter the 6-digit code sent to <Text style={{ fontWeight: '800', color: colors.text }}>{codeSentTo}</Text>. It expires in 5 minutes. Check Spam / Junk too.
                        </Text>
                        {input({ placeholder: '6-digit code', keyboardType: 'number-pad', maxLength: 6, value: form.code, onChangeText: (t) => setForm({ ...form, code: t.replace(/\D/g, '') }), style: [styles.input, styles.code] })}
                        {buttons({ onCancel: () => setCodeSentTo(''), cancelLabel: 'Back', onSubmit: confirmEmail, label: 'Verify & save', disabled: form.code.length < 6 })}
                    </View>
                ))}
            </View>
            <View>
                <InfoRow label="Contact number" value={studentInfo.contact_number} action={editing !== 'contact' && changeButton('contact')} />
                {editing === 'contact' && (
                    <View style={styles.form}>
                        {input({ placeholder: 'New contact number', keyboardType: 'number-pad', maxLength: 11, value: form.value, onChangeText: (t) => setForm({ ...form, value: t.replace(/\D/g, '').slice(0, 11) }) })}
                        {input({ placeholder: 'Current password', secureTextEntry: true, value: form.password, onChangeText: (t) => setForm({ ...form, password: t }) })}
                        {buttons({ onCancel: close, onSubmit: saveContact, label: 'Save', disabled: form.value.length !== 11 || !form.password })}
                    </View>
                )}
            </View>
        </Group>
    );
}

const getStyles = (colors, accent) => StyleSheet.create({
    change: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    changeText: { fontSize: 14, fontWeight: '600', color: accent },
    form: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
    input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: colors.text },
    code: { textAlign: 'center', letterSpacing: 6, fontSize: 18 },
    hint: { fontSize: 12, lineHeight: 17, color: colors.textMuted },
    buttons: { flexDirection: 'row', gap: 8 },
    cancel: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    cancelText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
    submit: { flex: 1, height: 44, borderRadius: 12, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' },
    submitText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    message: { margin: 12, marginBottom: 0, borderRadius: 8, padding: 10, fontSize: 12, fontWeight: '700', textAlign: 'center', overflow: 'hidden' },
    success: { backgroundColor: '#ecfdf5', color: '#059669' },
    error: { backgroundColor: '#fef2f2', color: '#dc2626' },
});
