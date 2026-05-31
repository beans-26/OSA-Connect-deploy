import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, Modal } from 'react-native';
import { User, Shield, ArrowLeft, LogOut, AlertTriangle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../components/AuthContext';
import { Colors } from '../../constants/Colors';

export default function StaffSettings() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                
                {/* Custom Header */}
                <View style={styles.customHeader}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitleText}>Profile Settings</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    
                    {/* Basic Information */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <User size={18} color={Colors.primary} />
                            <Text style={styles.cardTitle}>Personnel Information</Text>
                        </View>

                        <View style={styles.infoGroup}>
                            <Text style={styles.infoLabel}>Full Name</Text>
                            <Text style={styles.infoValue}>{user?.name || user?.full_name || 'Personnel'}</Text>
                        </View>

                        <View style={styles.infoGroup}>
                            <View style={styles.labelRow}>
                                <Shield size={12} color={Colors.textMuted} style={styles.labelIcon}/>
                                <Text style={styles.infoLabel}>Role</Text>
                            </View>
                            <Text style={styles.infoValueSmall}>{user?.role?.toUpperCase() || 'N/A'}</Text>
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={styles.logoutButton} 
                        onPress={() => setShowLogoutModal(true)}
                    >
                        <LogOut size={20} color={Colors.danger} />
                        <Text style={styles.logoutButtonText}>Log Out</Text>
                    </TouchableOpacity>

                </ScrollView>
            </View>
            
            <Modal visible={showLogoutModal} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <AlertTriangle size={24} color={Colors.danger} />
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

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    customHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: Colors.background,
    },
    backButton: {
        padding: 4,
    },
    headerTitleText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
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
    logoutButton: {
        flexDirection: 'row',
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.danger,
        height: 48,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 24,
    },
    logoutButtonText: {
        color: Colors.danger,
        fontWeight: 'bold',
        fontSize: 12,
        marginLeft: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
        marginLeft: 8,
    },
    modalMessage: {
        fontSize: 14,
        color: Colors.textMuted,
        marginBottom: 24,
        lineHeight: 20,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalCancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: Colors.background,
    },
    modalCancelText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.textMuted,
    },
    modalConfirmButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: Colors.danger,
    },
    modalConfirmText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#fff',
    },
});
