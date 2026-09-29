import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { User, Lock, Eye, EyeOff, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../components/AuthContext';
import AuthScreen, { authColors as C, authStyles as A } from '../components/AuthScreen';
import api from '../services/api';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [focused, setFocused] = useState('');
    const { login } = useAuth();

    const handleLogin = async () => {
        // Enter can fire this while a request is still running
        if (loading) return;
        if (!username || !password) {
            setError('Please enter both ID and password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.post('/login/', { username, password });

            if (response.data.role === 'admin') {
                setError('Admin login is not supported on mobile');
                setLoading(false);
                return;
            }

            const userData = {
                // Sent with every API request (services/api.js)
                token: response.data.token,
                username: response.data.username,
                role: response.data.role,
                student_id: response.data.student_id,
                name: response.data.name,
                // Staff/guard display name, used as the reporter on violation reports
                full_name: response.data.full_name
            };

            await login(userData);
        } catch (error) {
            const errData = error.response?.data?.error;
            let errMsg = 'System connection failure';
            if (typeof errData === 'string') {
                errMsg = errData;
            } else if (errData && typeof errData === 'object' && errData.message) {
                errMsg = errData.message;
            }
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthScreen maxWidth={384}>
            <Text style={[A.title, styles.title]}>Login</Text>

            {error ? (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}

            <View style={[styles.field, focused === 'id' && A.inputFocused]}>
                <User size={16} color={C.textMuted} style={styles.icon} />
                <TextInput
                    style={styles.input}
                    placeholder="Student ID"
                    placeholderTextColor={C.placeholder}
                    accessibilityLabel="Student ID"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoComplete="username"
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                    onFocus={() => setFocused('id')}
                    onBlur={() => setFocused('')}
                />
            </View>

            <View style={[styles.field, focused === 'password' && A.inputFocused]}>
                <Lock size={16} color={C.textMuted} style={styles.icon} />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={C.placeholder}
                    accessibilityLabel="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="current-password"
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused('')}
                />
                <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eye}
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                    {showPassword ? <EyeOff size={16} color={C.textMuted} /> : <Eye size={16} color={C.textMuted} />}
                </TouchableOpacity>
            </View>

            {/* Forgot password on the left, Login on the right (same as the website) */}
            <View style={styles.actions}>
                <Link href="/forgot-password" asChild>
                    <TouchableOpacity>
                        <Text style={styles.forgot}>Forgot password?</Text>
                    </TouchableOpacity>
                </Link>
                <TouchableOpacity style={[A.primaryButton, loading && A.disabled]} onPress={handleLogin} disabled={loading}>
                    {loading ? <ActivityIndicator color="#ffffff" /> : (
                        <>
                            <Text style={A.primaryButtonText}>Login</Text>
                            <ChevronRight size={16} color="#ffffff" />
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Dashed line: Android only draws dashes reliably on a full border, so it's a thin box */}
            <View style={styles.dashed} />
            <View>
                <Text style={styles.newTitle}>New student?</Text>
                <Text style={styles.newText}>
                    If you don&apos;t have an account yet,{' '}
                    <Link href="/register" style={styles.registerLink}>register here</Link>
                    {' '}to get your QR ID and follow your service hours.
                </Text>
            </View>
        </AuthScreen>
    );
}

const styles = StyleSheet.create({
    title: { marginBottom: 14, fontSize: 19 },
    errorBox: {
        backgroundColor: '#fef2f2',
        borderColor: '#fee2e2',
        borderWidth: 1,
        borderRadius: 6,
        padding: 10,
        marginBottom: 12,
    },
    errorText: { color: C.danger, fontWeight: '700', fontSize: 12 },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.field,
        borderWidth: 1,
        borderColor: C.fieldBorder,
        borderRadius: 6,
        height: 42,
        marginBottom: 10,
    },
    icon: { marginLeft: 12, marginRight: 8 },
    input: {
        flex: 1,
        // Without minWidth the web <input> keeps its default size and pushes the eye icon out
        minWidth: 0,
        height: '100%',
        color: C.text,
        fontWeight: '600',
        fontSize: 14,
    },
    eye: { paddingHorizontal: 12, height: '100%', justifyContent: 'center' },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    forgot: { fontSize: 12, fontWeight: '700', color: C.link },
    dashed: {
        height: 1,
        marginTop: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderRadius: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(100,116,139,0.6)',
    },
    newTitle: { fontSize: 14, fontWeight: '700', color: C.text },
    newText: { fontSize: 12, color: '#1e293b', lineHeight: 18, marginTop: 4 },
    registerLink: { fontWeight: '700', color: C.link, textDecorationLine: 'underline' },
});
