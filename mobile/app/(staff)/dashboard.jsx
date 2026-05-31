import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors } from '../../constants/Colors';
import { User, QrCode, ClipboardList, AlertCircle, Calendar, Clock, X, ChevronDown } from 'lucide-react-native';
import api from '../../services/api';
import { useAuth } from '../../components/AuthContext';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';

const VIOLATION_TYPES = [
    "Curfew Violation",
    "ID Violation",
    "Uniform Violation",
    "Dress Code Violation",
    "Verbal Abuse",
    "Stalking",
    "Indecent Conduct",
    "Alcohol Influence",
    "Alcohol Possession",
    "Pornographic Materials",
    "Threats & Coercion",
    "Gambling",
    "Littering",
    "ID Misuse",
    "Lab Tampering",
    "Exam Tampering",
    "Smoking"
];

export default function PersonnelDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const [loading, setLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [alertMessage, setAlertMessage] = useState({ visible: false, title: '', message: '', type: 'info' });

    const [form, setForm] = useState({
        student_id: '',
        name: '',
        course: '',
        department: '',
        violation_type: 'Curfew Violation',
        guard_name: 'Guard 1',
    });

    const debounceTimer = useRef(null);

    const fetchStudentData = async (id) => {
        const cleanId = id?.trim();
        if (!cleanId || cleanId.length < 5) return;
        
        try {
            const response = await api.get(`/students/${cleanId}/`);
            if (response.data) {
                setForm(prev => {
                    // Only update if the form's current student_id matches what we fetched
                    if (prev.student_id !== cleanId) return prev;
                    
                    return {
                        ...prev,
                        name: response.data.name || '',
                        course: response.data.course || '',
                        department: response.data.department || '',
                    };
                });
            }
        } catch (error) {
            // Silently fail if student not found during typing
            console.log("Student not found yet", cleanId);
        }
    };

    const handleIdChange = (text) => {
        const cleanText = text.trim();
        setForm(prev => ({ ...prev, student_id: cleanText, name: '', course: '', department: '' }));
        
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
        
        if (cleanText.length >= 5) {
            debounceTimer.current = setTimeout(() => {
                fetchStudentData(cleanText);
            }, 500);
        }
    };

    const handleBarCodeScanned = async ({ type, data }) => {
        setIsScanning(false);
        
        try {
            // First check if it's JSON (the Smart QR code might have details)
            const parsed = JSON.parse(data);
            if (parsed.student_id) {
                setForm(prev => ({ ...prev, student_id: parsed.student_id }));
                await fetchStudentData(parsed.student_id);
                return;
            }
        } catch (e) {
            // Ignore JSON parse error
        }

        // Handle regular text (comma separated or raw ID)
        const parts = data.split(',').map(p => p.trim());
        if (parts.length >= 2) {
            const name = parts[0];
            const studentId = parts[1];
            const course = parts[2] || '';
            setForm(prev => ({ ...prev, student_id: studentId, name: name, course: course }));
            await fetchStudentData(studentId);
        } else {
            // Try to extract ID
            const idMatch = data.match(/\b(20\d{7,})\b/);
            const studentId = idMatch ? idMatch[1] : data;
            setForm(prev => ({ ...prev, student_id: studentId }));
            await fetchStudentData(studentId);
        }
    };

    const startScan = async () => {
        if (!permission) return;
        if (!permission.granted) {
            const { granted } = await requestPermission();
            if (!granted) {
                Alert.alert("Permission required", "Camera access is needed to scan QR codes.");
                return;
            }
        }
        setIsScanning(true);
    };

    const confirmSubmit = () => {
        if (!form.student_id || !form.violation_type) {
            setAlertMessage({ visible: true, title: 'Error', message: 'Student ID and Violation Type are required.', type: 'error' });
            return;
        }
        setShowConfirmModal(true);
    };

    const processSubmission = async () => {
        setShowConfirmModal(false);
        setLoading(true);
        try {
            await api.post('/violations/', {
                student_id: form.student_id,
                violation: form.violation_type,
                reporting_guard: form.guard_name,
                status: 'Pending OSA Review'
            });

            setAlertMessage({ visible: true, title: 'Success', message: 'Violation report submitted successfully.', type: 'success' });
            setForm({
                student_id: '',
                name: '',
                course: '',
                department: '',
                violation_type: 'Curfew Violation',
                guard_name: 'Guard 1',
            });
        } catch (error) {
            console.error("Report submission failed:", error);
            setAlertMessage({ visible: true, title: 'Error', message: error.response?.data?.error || 'Failed to submit report. Please check student ID.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                <View style={styles.headerCard}>
                    <AlertCircle size={32} color={Colors.primary} style={styles.headerIcon} />
                    <Text style={styles.headerTitle}>Report Violation</Text>
                    <Text style={styles.headerSubtitle}>Record student violations directly to the system</Text>
                </View>

                <View style={styles.formCard}>
                    {/* Scanner Button */}
                    <TouchableOpacity style={styles.scanButton} onPress={startScan}>
                        <QrCode size={24} color="#fff" />
                        <Text style={styles.scanButtonText}>Scan Student QR Code</Text>
                    </TouchableOpacity>

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR ENTER MANUALLY</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Form Fields */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Student ID *</Text>
                        <View style={styles.inputContainer}>
                            <User size={18} color={Colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 2023303188"
                                value={form.student_id}
                                onChangeText={handleIdChange}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Student Name</Text>
                        <View style={[styles.inputContainer, styles.readOnlyInput]}>
                            <TextInput
                                style={styles.input}
                                placeholder="Auto-filled"
                                value={form.name}
                                editable={false}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Course</Text>
                        <View style={[styles.inputContainer, styles.readOnlyInput]}>
                            <TextInput
                                style={styles.input}
                                placeholder="Auto-filled"
                                value={form.course}
                                editable={false}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Violation Type *</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={form.violation_type}
                                onValueChange={(itemValue) => setForm(prev => ({ ...prev, violation_type: itemValue }))}
                                style={styles.picker}
                            >
                                {VIOLATION_TYPES.map(type => (
                                    <Picker.Item key={type} label={type} value={type} />
                                ))}
                            </Picker>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Guard Name *</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={form.guard_name}
                                onValueChange={(itemValue) => setForm(prev => ({ ...prev, guard_name: itemValue }))}
                                style={styles.picker}
                            >
                                {["Guard 1", "Guard 2", "Guard 3", "Guard 4", "Guard 5"].map(guard => (
                                    <Picker.Item key={guard} label={guard} value={guard} />
                                ))}
                            </Picker>
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
                        onPress={confirmSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <ClipboardList size={20} color="#fff" />
                                <Text style={styles.submitButtonText}>Submit Report</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

            </ScrollView>

            {/* QR Scanner Modal */}
            <Modal visible={isScanning} animationType="slide" transparent={false}>
                <View style={styles.scannerContainer}>
                    <CameraView
                        style={StyleSheet.absoluteFillObject}
                        facing="back"
                        onBarcodeScanned={handleBarCodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ["qr"],
                        }}
                    />
                    <View style={styles.scannerOverlay}>
                        <Text style={styles.scannerText}>Scan Student ID QR Code</Text>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setIsScanning(false)}>
                            <X size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Confirmation Modal */}
            <Modal visible={showConfirmModal} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <AlertCircle size={24} color="#f59e0b" />
                            <Text style={styles.modalTitle}>Confirm Submission</Text>
                        </View>
                        <Text style={styles.modalMessage}>
                            Are you sure you want to report <Text style={{fontWeight: 'bold'}}>{form.name || form.student_id}</Text> for {form.violation_type}?
                        </Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowConfirmModal(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirmButton} onPress={processSubmission}>
                                <Text style={styles.modalConfirmText}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Alert Modal */}
            <Modal visible={alertMessage.visible} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <AlertCircle size={24} color={alertMessage.type === 'error' ? Colors.danger : Colors.primary} />
                            <Text style={styles.modalTitle}>{alertMessage.title}</Text>
                        </View>
                        <Text style={styles.modalMessage}>{alertMessage.message}</Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={[styles.modalConfirmButton, { backgroundColor: alertMessage.type === 'error' ? Colors.danger : Colors.primary }]} 
                                onPress={() => setAlertMessage({ ...alertMessage, visible: false })}
                            >
                                <Text style={styles.modalConfirmText}>OK</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    headerCard: {
        alignItems: 'center',
        paddingVertical: 20,
        marginBottom: 20,
    },
    headerIcon: {
        marginBottom: 10,
    },
    topRightIcon: {
        position: 'absolute',
        top: 20,
        right: 0,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: Colors.textMuted,
        textAlign: 'center',
    },
    formCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    scanButton: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    scanButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 10,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.border,
    },
    dividerText: {
        color: Colors.textMuted,
        paddingHorizontal: 15,
        fontSize: 12,
        fontWeight: 'bold',
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
        paddingHorizontal: 15,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: Colors.text,
    },
    readOnlyInput: {
        backgroundColor: '#f5f5f5',
        opacity: 0.8,
    },
    pickerContainer: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        width: '100%',
    },
    textAreaContainer: {
        alignItems: 'flex-start',
    },
    textArea: {
        height: 100,
        paddingTop: 12,
    },
    submitButton: {
        backgroundColor: Colors.danger,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginTop: 10,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 10,
    },
    scannerContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    scannerOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 40,
        alignItems: 'center',
    },
    scannerText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    closeButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
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
