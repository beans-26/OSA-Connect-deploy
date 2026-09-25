import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { User, Lock, Eye, EyeOff, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../components/AuthContext';
import { useTheme } from '../components/ThemeContext';
import api from '../services/api';

const CSSLogo = ({ styles }) => (
    <View style={styles.logoContainer}>
        <View style={styles.logoBox}>
            <View style={styles.logoAccent} />
            <Text style={styles.logoOsa}>OSA</Text>
        </View>
        <Text style={styles.logoConnect}>Connect</Text>
    </View>
);

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    // Follows the app's light/dark setting like the other screens
    const { isDarkMode, colors } = useTheme();
    const styles = getStyles(colors, isDarkMode);

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
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            {/* Scrolls on short screens / with the keyboard open; centered 448px column on wide screens */}
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.content}>
                <View style={styles.header}>
                    <CSSLogo styles={styles} />
                    <Text style={styles.title}>Login to Portal</Text>
                    <Text style={styles.subtitle}>Smart student violation management</Text>
                </View>

                <View style={styles.card}>
                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Student ID / Username</Text>
                        <View style={styles.inputContainer}>
                            <User size={18} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                               
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                returnKeyType="go"
                                onSubmitEditing={handleLogin}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.inputContainer}>
                            <Lock size={18} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                               
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                returnKeyType="go"
                                onSubmitEditing={handleLogin}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                {showPassword ? (
                                    <EyeOff size={18} color={colors.textMuted} />
                                ) : (
                                    <Eye size={18} color={colors.textMuted} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.forgotPasswordContainer}>
                        <Link href="/forgot-password" asChild>
                            <TouchableOpacity>
                                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>

                    <TouchableOpacity 
                        style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <>
                                <Text style={styles.loginButtonText}>Login</Text>
                                <ChevronRight size={16} color="#ffffff" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>New to the system? </Text>
                    <Link href="/register" asChild>
                        <TouchableOpacity>
                            <Text style={styles.registerLink}>Register profile</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const getStyles = (Colors, isDarkMode) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    content: {
        width: '100%',
        maxWidth: 448,
        alignSelf: 'center',
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
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textMuted,
        fontWeight: '500',
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
    errorBox: {
        backgroundColor: isDarkMode ? 'rgba(248, 113, 113, 0.12)' : '#fef2f2',
        borderColor: isDarkMode ? 'rgba(248, 113, 113, 0.3)' : '#fee2e2',
        borderWidth: 1,
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
    },
    errorText: {
        color: Colors.danger,
        fontWeight: 'bold',
        fontSize: 10,
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    inputGroup: {
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
        marginHorizontal: 12,
    },
    input: {
        flex: 1,
        // Without minWidth the web <input> keeps its default size and pushes the eye icon out
        minWidth: 0,
        height: '100%',
        color: Colors.text,
        fontWeight: '600',
        fontSize: 14,
    },
    eyeIcon: {
        padding: 12,
    },
    forgotPasswordContainer: {
        alignItems: 'flex-end',
        marginBottom: 24,
    },
    forgotPasswordText: {
        color: Colors.primary,
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    loginButton: {
        backgroundColor: Colors.secondary,
        height: 48,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginRight: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 32,
    },
    footerText: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '600',
    },
    registerLink: {
        color: Colors.primary,
        fontSize: 12,
        fontWeight: 'bold',
    },
});
