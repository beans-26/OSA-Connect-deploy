import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '../../components/AuthContext';
import { useTheme } from '../../components/ThemeContext';
import { StudentTopBar, shellColors } from '../../components/StudentShell';
import api from '../../services/api';

// Settings > Change password (mirrors frontend/src/pages/student/ChangePassword.jsx)
export default function ChangePassword() {
    const { user } = useAuth();
    const { isDarkMode, colors } = useTheme();
    const styles = getStyles(colors, shellColors(isDarkMode));
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const submit = async () => {
        if (!passwords.current || !passwords.new || !passwords.confirm) return setMessage({ type: 'error', text: 'Fill in all three fields.' });
        if (passwords.new.length < 8) return setMessage({ type: 'error', text: 'The new password needs at least 8 characters.' });
        if (passwords.new !== passwords.confirm) return setMessage({ type: 'error', text: "The new passwords don't match." });
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            await api.post('/students/change_password/', { student_id: user.username, current_password: passwords.current, new_password: passwords.new });
            setMessage({ type: 'success', text: 'Password updated.' });
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response ? (err.response.data?.error || "Couldn't update the password.") : "Can't reach the server. Check your connection." });
        } finally {
            setLoading(false);
        }
    };

    const fields = [
        ['current', 'Current password'],
        ['new', 'New password (at least 8 characters)'],
        ['confirm', 'Confirm new password'],
    ];
    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.card} />
            <StudentTopBar title="Change password" back="/student/settings" />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <View style={styles.card}>
                        {!!message.text && <Text style={[styles.message, message.type === 'success' ? styles.success : styles.error]}>{message.text}</Text>}
                        {fields.map(([key, label]) => (
                            <View key={key} style={{ marginBottom: 12 }}>
                                <Text style={styles.label}>{label}</Text>
                                <TextInput
                                    style={styles.input}
                                    secureTextEntry={!show}
                                    autoCapitalize="none"
                                    value={passwords[key]}
                                    onChangeText={(t) => setPasswords({ ...passwords, [key]: t })}
                                />
                            </View>
                        ))}
                        <TouchableOpacity style={styles.showRow} onPress={() => setShow(!show)}>
                            {show ? <EyeOff size={14} color={styles.showText.color} /> : <Eye size={14} color={styles.showText.color} />}
                            <Text style={styles.showText}>{show ? 'Hide passwords' : 'Show passwords'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Update password</Text>}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const getStyles = (colors, sc) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 },
    label: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
    input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: colors.text },
    showRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
    showText: { fontSize: 12, fontWeight: '600', color: sc.accent },
    button: { height: 48, borderRadius: 12, backgroundColor: sc.accent, alignItems: 'center', justifyContent: 'center' },
    buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    message: { marginBottom: 12, borderRadius: 8, padding: 10, fontSize: 12, fontWeight: '700', textAlign: 'center', overflow: 'hidden' },
    success: { backgroundColor: '#ecfdf5', color: '#059669' },
    error: { backgroundColor: '#fef2f2', color: '#dc2626' },
});
