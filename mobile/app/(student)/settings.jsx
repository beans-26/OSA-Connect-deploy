import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView, Modal, StatusBar, Switch } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { User, Mail, Phone, BookOpen, Building2, Lock, ArrowLeft, LogOut, AlertTriangle, Moon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../components/AuthContext';
import { useTheme } from '../../components/ThemeContext';
import api from '../../services/api';

export default function Settings() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const { isDarkMode, themeMode, changeTheme, colors } = useTheme();
    const styles = getStyles(colors);

    const [studentInfo, setStudentInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    useEffect(() => {
        fetchStudentInfo();
    }, [user?.username]);

    const fetchStudentInfo = async () => {
        if (!user?.username) return;
        try {
            const response = await api.get(`/students/${user.username}/`);
            setStudentInfo(response.data);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch student profile');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!passwords.current || !passwords.new || !passwords.confirm) {
            Alert.alert('Error', 'Please fill all password fields');
            return;
        }
        if (passwords.new !== passwords.confirm) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }
        
        setPasswordLoading(true);
        try {
            await api.post('/students/change_password/', {
                student_id: studentInfo.student_id,
                current_password: passwords.current,
                new_password: passwords.new
            });
            Alert.alert('Success', 'Password updated successfully!');
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to update password');
        } finally {
            setPasswordLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!studentInfo) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Profile not found. Please contact administration.</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
                
                {/* Custom Header */}
                <View style={styles.customHeader}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitleText}>Profile Settings</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    
                    {/* QR Code Card */}
                <View style={styles.qrCard}>
                    <View style={styles.qrWrapper}>
                        <QRCode
                            value={studentInfo.student_id}
                            size={160}
                            color={isDarkMode ? '#0f172a' : '#000'}
                            backgroundColor={isDarkMode ? '#fff' : '#fff'}
                        />
                    </View>
                    <Text style={styles.studentName}>{studentInfo.name}</Text>
                    <Text style={styles.studentId}>{studentInfo.student_id}</Text>
                    <Text style={styles.qrDesc}>
                        Present this personalized QR code to campus guards for instant violation registration or service hub scanning.
                    </Text>
                </View>

                {/* Basic Information */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <User size={18} color={colors.primary} />
                        <Text style={styles.cardTitle}>Basic Information</Text>
                    </View>

                    <View style={styles.infoGroup}>
                        <Text style={styles.infoLabel}>Full Identity Name</Text>
                        <Text style={styles.infoValue}>{studentInfo.name}</Text>
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.infoGroup, {flex: 1}]}>
                            <View style={styles.labelRow}>
                                <BookOpen size={12} color={colors.textMuted} style={styles.labelIcon}/>
                                <Text style={styles.infoLabel}>Course</Text>
                            </View>
                            <Text style={styles.infoValueSmall}>{studentInfo.course || 'N/A'}</Text>
                        </View>
                        <View style={[styles.infoGroup, {flex: 1}]}>
                            <View style={styles.labelRow}>
                                <Building2 size={12} color={colors.textMuted} style={styles.labelIcon}/>
                                <Text style={styles.infoLabel}>Department</Text>
                            </View>
                            <Text style={styles.infoValueSmall}>{studentInfo.department || 'N/A'}</Text>
                        </View>
                    </View>
                </View>

                {/* Contact Details */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Mail size={18} color={colors.primary} />
                        <Text style={styles.cardTitle}>Contact Details</Text>
                    </View>

                    <View style={styles.infoGroup}>
                        <Text style={styles.infoLabel}>Institutional Email</Text>
                        <Text style={styles.infoValue}>{studentInfo.email || 'N/A'}</Text>
                    </View>

                    <View style={styles.infoGroup}>
                        <View style={styles.labelRow}>
                            <Phone size={12} color={colors.textMuted} style={styles.labelIcon}/>
                            <Text style={styles.infoLabel}>Primary Contact</Text>
                        </View>
                        <Text style={styles.infoValue}>{studentInfo.contact_number || 'N/A'}</Text>
                    </View>
                </View>

                {/* Appearance Settings */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Moon size={18} color={colors.primary} />
                        <Text style={styles.cardTitle}>Appearance</Text>
                    </View>
                    
                    <View style={styles.switchRow}>
                        <View>
                            <Text style={styles.infoValueSmall}>Dark Mode</Text>
                            <Text style={[styles.infoLabel, { textTransform: 'none', marginTop: 2 }]}>
                                {themeMode === 'system' ? 'Syncs with system settings' : 'Manually enabled'}
                            </Text>
                        </View>
                        <Switch
                            value={isDarkMode}
                            onValueChange={(val) => changeTheme(val ? 'dark' : 'light')}
                            trackColor={{ false: colors.border, true: colors.success }}
                            thumbColor="#fff"
                        />
                    </View>
                </View>

                {/* Security Settings */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Lock size={18} color={colors.primary} />
                        <Text style={styles.cardTitle}>Security Settings</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.infoLabel}>Current Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor={colors.textMuted}
                            secureTextEntry
                            value={passwords.current}
                            onChangeText={(t) => setPasswords({...passwords, current: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.infoLabel}>New Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor={colors.textMuted}
                            secureTextEntry
                            value={passwords.new}
                            onChangeText={(t) => setPasswords({...passwords, new: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.infoLabel}>Confirm New Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor={colors.textMuted}
                            secureTextEntry
                            value={passwords.confirm}
                            onChangeText={(t) => setPasswords({...passwords, confirm: t})}
                        />
                    </View>

                    <TouchableOpacity 
                        style={[styles.primaryButton, passwordLoading && styles.disabledButton]} 
                        onPress={handleChangePassword}
                        disabled={passwordLoading}
                    >
                        {passwordLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.primaryButtonText}>Update Password</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity 
                    style={styles.logoutButton} 
                    onPress={() => setShowLogoutModal(true)}
                >
                    <LogOut size={20} color={colors.danger} />
                    <Text style={styles.logoutButtonText}>Log Out</Text>
                </TouchableOpacity>

            </ScrollView>
        </KeyboardAvoidingView>

            <Modal visible={showLogoutModal} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <AlertTriangle size={24} color={colors.danger} />
                            <Text style={styles.modalTitle}>Log Out</Text>
                        </View>
                        <Text style={styles.modalMessage}>Are you sure you want to log out?</Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowLogoutModal(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirmButton} onPress={() => {
                                setShowLogoutModal(false);
                                logout();
                            }}>
                                <Text style={styles.modalConfirmText}>Log Out</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    customHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: colors.background,
    },
    backButton: {
        padding: 4,
    },
    headerTitleText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    centerContainer: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    errorText: {
        color: colors.textMuted,
        fontWeight: 'bold',
        fontSize: 14,
    },
    qrCard: {
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 2,
        borderColor: colors.background,
    },
    qrWrapper: {
        backgroundColor: colors.card,
        padding: 12,
        borderRadius: 24,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
        marginBottom: 20,
    },
    studentName: {
        fontSize: 24,
        fontWeight: '900',
        color: colors.text,
        marginBottom: 4,
    },
    studentId: {
        fontSize: 14,
        fontWeight: '900',
        color: colors.primary,
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 16,
    },
    qrDesc: {
        fontSize: 12,
        color: colors.textMuted,
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginLeft: 12,
    },
    infoGroup: {
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    labelIcon: {
        marginRight: 6,
    },
    infoLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    infoValueSmall: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text,
        textTransform: 'uppercase',
    },
    inputGroup: {
        marginBottom: 16,
    },
    input: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        color: colors.text,
        fontWeight: '600',
    },
    primaryButton: {
        backgroundColor: colors.secondary,
        height: 48,
        borderRadius: 8,
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
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.card,
        borderWidth: 2,
        borderColor: colors.danger,
        padding: 16,
        borderRadius: 16,
        marginTop: 8,
    },
    logoutButtonText: {
        color: colors.danger,
        fontWeight: '900',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: colors.danger,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginLeft: 8,
    },
    modalMessage: {
        fontSize: 14,
        color: colors.text,
        marginBottom: 24,
        lineHeight: 20,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalCancelButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: colors.background,
        alignItems: 'center',
    },
    modalCancelText: {
        fontWeight: 'bold',
        color: colors.textMuted,
    },
    modalConfirmButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: colors.danger,
        alignItems: 'center',
    },
    modalConfirmText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#fff',
    },
});
