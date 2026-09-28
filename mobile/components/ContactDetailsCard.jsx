import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Mail, Phone } from 'lucide-react-native';
import api from '../services/api';

// Student Settings "Contact Details": email and contact number, each with a Change form. A new email
// only saves after the 6-digit code sent to it is entered; both ask for the current password.
// Mirrors ContactDetailsSection in frontend/src/pages/student/Settings.jsx.
// `styles` are the settings screen's own (card, input, infoLabel, ...).
const FAINT = 'rgba(148,163,184,0.4)';

export default function ContactDetailsCard({ studentInfo, onUpdated, styles, colors }) {
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
        <View style={local.buttons}>
            <TouchableOpacity style={[local.button, { backgroundColor: colors.background }]} onPress={onCancel}>
                <Text style={[styles.primaryButtonText, { color: colors.textMuted }]}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[local.button, { backgroundColor: colors.primary }, (busy || disabled) && styles.disabledButton]}
                onPress={onSubmit}
                disabled={busy || disabled}
            >
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{label}</Text>}
            </TouchableOpacity>
        </View>
    );

    const changeButton = (field) => (
        <TouchableOpacity style={[local.change, { borderColor: colors.border }]} onPress={() => open(field)}>
            <Text style={[local.changeText, { color: colors.primary }]}>CHANGE</Text>
        </TouchableOpacity>
    );

    const input = (props) => (
        <TextInput style={[styles.input, local.field]} placeholderTextColor={FAINT} autoCapitalize="none" {...props} />
    );

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Mail size={18} color={colors.primary} />
                <Text style={styles.cardTitle}>Contact Details</Text>
            </View>

            {!!message.text && (
                <Text style={[local.message, message.type === 'success' ? local.success : local.error]}>{message.text}</Text>
            )}

            <View style={styles.infoGroup}>
                <View style={local.row}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.infoLabel}>Institutional Email</Text>
                        <Text style={styles.infoValue}>{studentInfo.email || 'N/A'}</Text>
                    </View>
                    {editing !== 'email' && changeButton('email')}
                </View>
                {editing === 'email' && (!codeSentTo ? (
                    <View style={local.form}>
                        {input({ placeholder: 'New Email', keyboardType: 'email-address', value: form.value, onChangeText: (t) => setForm({ ...form, value: t }) })}
                        {input({ placeholder: 'Current Password', secureTextEntry: true, value: form.password, onChangeText: (t) => setForm({ ...form, password: t }) })}
                        {buttons({ onCancel: close, onSubmit: sendEmailCode, label: 'Send Code', disabled: !form.value.trim() || !form.password })}
                    </View>
                ) : (
                    <View style={local.form}>
                        <Text style={[local.hint, { color: colors.textMuted }]}>
                            Enter the 6-digit code sent to <Text style={{ fontWeight: '800', color: colors.text }}>{codeSentTo}</Text>. It expires in 5 minutes.
                        </Text>
                        {input({ placeholder: '6-Digit Code', keyboardType: 'number-pad', maxLength: 6, value: form.code, onChangeText: (t) => setForm({ ...form, code: t.replace(/\D/g, '') }), style: [styles.input, local.field, local.code] })}
                        {buttons({ onCancel: () => setCodeSentTo(''), cancelLabel: 'Back', onSubmit: confirmEmail, label: 'Verify & Save', disabled: form.code.length < 6 })}
                    </View>
                ))}
            </View>

            <View style={styles.infoGroup}>
                <View style={local.row}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.labelRow}>
                            <Phone size={12} color={colors.textMuted} style={styles.labelIcon} />
                            <Text style={styles.infoLabel}>Primary Contact</Text>
                        </View>
                        <Text style={styles.infoValue}>{studentInfo.contact_number || 'N/A'}</Text>
                    </View>
                    {editing !== 'contact' && changeButton('contact')}
                </View>
                {editing === 'contact' && (
                    <View style={local.form}>
                        {input({ placeholder: 'New Contact Number', keyboardType: 'number-pad', maxLength: 11, value: form.value, onChangeText: (t) => setForm({ ...form, value: t.replace(/\D/g, '').slice(0, 11) }) })}
                        {input({ placeholder: 'Current Password', secureTextEntry: true, value: form.password, onChangeText: (t) => setForm({ ...form, password: t }) })}
                        {buttons({ onCancel: close, onSubmit: saveContact, label: 'Save', disabled: form.value.length !== 11 || !form.password })}
                    </View>
                )}
            </View>
        </View>
    );
}

const local = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    change: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    changeText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    form: { marginTop: 12, gap: 10 },
    field: { marginBottom: 0 },
    code: { textAlign: 'center', letterSpacing: 6, fontSize: 18 },
    hint: { fontSize: 12, lineHeight: 17 },
    buttons: { flexDirection: 'row', gap: 8 },
    button: { flex: 1, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    message: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 12, fontWeight: '700', textAlign: 'center', overflow: 'hidden' },
    success: { borderColor: '#a7f3d0', backgroundColor: '#ecfdf5', color: '#059669' },
    error: { borderColor: '#fecaca', backgroundColor: '#fef2f2', color: '#dc2626' },
});
