import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Pressable, Platform } from 'react-native';
import { AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from './ThemeContext';

// Time-out receipt for one service session (timelog_receipt in backend/core/views.py).
// "Ended By" is the proof of how the session ended (scanned the QR code, left the area, location off...).
// Shown after time out and in the e-ticket's service log. Mirrors frontend/src/components/SessionReceipt.jsx.

const PH = { timeZone: 'Asia/Manila' };
export const receiptDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-PH', { ...PH, weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }) : '—';
export const receiptTime = (iso) => iso ? new Date(iso).toLocaleTimeString('en-PH', { ...PH, hour: 'numeric', minute: '2-digit', second: '2-digit' }) : '—';

export const formatDuration = (seconds) => {
    const s = Math.max(0, Math.round(seconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h ? `${h}h ${m}m ${sec}s` : m ? `${m}m ${sec}s` : `${sec}s`;
};

// Stopped by the system rather than by scanning out
export const FLAGGED_ENDS = ['left_area', 'location_off', 'app_closed', 'idle'];


const Line = ({ styles, label, value, color }) => (
    <View style={styles.line}>
        <Text style={styles.lineLabel}>{label}</Text>
        <Text style={[styles.lineValue, color && { color }]}>{value}</Text>
    </View>
);

// The receipt's lines and activity list, without the pop-up around it
export function SessionReceiptBody({ receipt, hideDate = false }) {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const flagged = FLAGGED_ENDS.includes(receipt.end_reason);

    return (
        <View>
            {!hideDate && <Line styles={styles} label="DATE" value={receiptDate(receipt.time_in)} />}
            <Line styles={styles} label="ASSIGNED BUILDING" value={receipt.building ? `${receipt.building}${receipt.site_code ? ` (${receipt.site_code})` : ''}` : '—'} />
            <Line styles={styles} label="TIME IN" value={receiptTime(receipt.time_in)} />
            <Line styles={styles} label="TIME OUT" value={receipt.time_out ? receiptTime(receipt.time_out) : 'Still running'} />
            <Line styles={styles} label="TIME SERVED" value={formatDuration(receipt.duration_seconds)} />
            <Line
                styles={styles}
                label="ENDED BY"
                value={`${receipt.end_reason_label || '—'}${receipt.out_distance_m != null && flagged ? ` (${receipt.out_distance_m} m away)` : ''}`}
                color={flagged ? '#dc2626' : '#059669'}
            />

        </View>
    );
}

// Pop-up shown right after a session ends
export default function SessionReceipt({ receipt, onClose }) {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    if (!receipt) return null;
    const flagged = FLAGGED_ENDS.includes(receipt.end_reason);
    const accent = flagged ? '#dc2626' : '#059669';

    return (
        <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            {/* The card sits inside a full-screen dimmed, blurred layer so only the receipt is in focus */}
            <View style={styles.overlay}>
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close receipt" />
                <View style={styles.card}>
                    <ScrollView contentContainerStyle={{ padding: 20 }}>
                        <View style={[styles.iconCircle, { backgroundColor: flagged ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)' }]}>
                            {flagged ? <AlertTriangle size={24} color={accent} /> : <CheckCircle2 size={24} color={accent} />}
                        </View>
                        <Text style={styles.title}>Time-Out Receipt</Text>
                        <Text style={styles.subtitle}>
                            {receipt.already_ended ? 'Your timer had already stopped.' : flagged ? 'Your timer was stopped automatically.' : 'Your session was recorded.'}
                            {receipt.remaining_hours != null ? ` ${formatDuration(receipt.remaining_hours * 3600)} left to serve.` : ''}
                        </Text>

                        <SessionReceiptBody receipt={receipt} />

                        <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                            <Text style={styles.doneText}>DONE</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const getStyles = (colors) => StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: Platform.OS === 'android' ? 'rgba(15,23,42,0.6)' : 'rgba(15,23,42,0.35)' },
    card: { width: '100%', maxWidth: 400, maxHeight: '90%', backgroundColor: colors.card, borderRadius: 20 },
    iconCircle: { width: 48, height: 48, borderRadius: 24, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    title: { fontSize: 18, fontWeight: '900', color: colors.text, textAlign: 'center' },
    subtitle: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textAlign: 'center', marginTop: 2, marginBottom: 12 },
    line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderStyle: 'dashed', borderBottomColor: colors.border },
    lineLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: colors.textMuted },
    lineValue: { flexShrink: 1, fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'right' },
    doneButton: { marginTop: 20, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    doneText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
});
