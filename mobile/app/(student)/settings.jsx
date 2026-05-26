import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { User, Mail, Phone, BookOpen, Building2, Lock } from 'lucide-react-native';
import { useAuth } from '../../components/AuthContext';
import { Colors } from '../../constants/Colors';
import api from '../../services/api';

export default function Settings() {
    const { user } = useAuth();
    const [studentInfo, setStudentInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [passwordLoading, setPasswordLoading] = useState(false);

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
                <ActivityIndicator size="large" color={Colors.primary} />
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                {/* QR Code Card */}
                <View style={styles.qrCard}>
                    <View style={styles.qrWrapper}>
                        <QRCode
                            value={studentInfo.student_id}
                            size={160}
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
                        <User size={18} color={Colors.primary} />
                        <Text style={styles.cardTitle}>Basic Information</Text>
                    </View>

                    <View style={styles.infoGroup}>
                        <Text style={styles.infoLabel}>Full Identity Name</Text>
                        <Text style={styles.infoValue}>{studentInfo.name}</Text>
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.infoGroup, {flex: 1}]}>
                            <View style={styles.labelRow}>
                                <BookOpen size={12} color={Colors.textMuted} style={styles.labelIcon}/>
                                <Text style={styles.infoLabel}>Course</Text>
                            </View>
                            <Text style={styles.infoValueSmall}>{studentInfo.course || 'N/A'}</Text>
                        </View>
                        <View style={[styles.infoGroup, {flex: 1}]}>
                            <View style={styles.labelRow}>
                                <Building2 size={12} color={Colors.textMuted} style={styles.labelIcon}/>
                                <Text style={styles.infoLabel}>Department</Text>
                            </View>
                            <Text style={styles.infoValueSmall}>{studentInfo.department || 'N/A'}</Text>
                        </View>
                    </View>
                </View>

                {/* Contact Details */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Mail size={18} color={Colors.primary} />
                        <Text style={styles.cardTitle}>Contact Details</Text>
                    </View>

                    <View style={styles.infoGroup}>
                        <Text style={styles.infoLabel}>Institutional Email</Text>
                        <Text style={styles.infoValue}>{studentInfo.email || 'N/A'}</Text>
                    </View>

                    <View style={styles.infoGroup}>
                        <View style={styles.labelRow}>
                            <Phone size={12} color={Colors.textMuted} style={styles.labelIcon}/>
                            <Text style={styles.infoLabel}>Primary Contact</Text>
                        </View>
                        <Text style={styles.infoValue}>{studentInfo.contact_number || 'N/A'}</Text>
                    </View>
                </View>

                {/* Security Settings */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Lock size={18} color={Colors.primary} />
                        <Text style={styles.cardTitle}>Security Settings</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.infoLabel}>Current Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
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

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    centerContainer: {
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    errorText: {
        color: Colors.textMuted,
        fontWeight: 'bold',
        fontSize: 14,
    },
    qrCard: {
        backgroundColor: Colors.card,
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 2,
        borderColor: Colors.background,
    },
    qrWrapper: {
        backgroundColor: Colors.card,
        padding: 16,
        borderRadius: 24,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
        marginBottom: 24,
    },
    studentName: {
        fontSize: 24,
        fontWeight: '900',
        color: Colors.text,
        marginBottom: 4,
    },
    studentId: {
        fontSize: 14,
        fontWeight: '900',
        color: Colors.primary,
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 16,
    },
    qrDesc: {
        fontSize: 12,
        color: Colors.textMuted,
        textAlign: 'center',
        paddingHorizontal: 16,
    },
    card: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: Colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    cardTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: Colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginLeft: 12,
    },
    infoGroup: {
        marginBottom: 20,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
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
        color: Colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
    },
    infoValueSmall: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.text,
        textTransform: 'uppercase',
    },
    inputGroup: {
        marginBottom: 16,
    },
    input: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        padding: 12,
        color: Colors.text,
        fontWeight: '600',
    },
    primaryButton: {
        backgroundColor: Colors.secondary,
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
});
