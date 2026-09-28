import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronDown, MapPin, LogIn } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from './ThemeContext';
import api from '../services/api';
import { SessionReceiptBody, receiptDate, formatDuration, FLAGGED_ENDS } from './SessionReceipt';

// Opened by tapping an e-ticket on the student dashboard: the ticket, then its service log grouped by
// date. Each date is a toggle listing that day's sessions (Session 1, 2, ...); tapping one opens its
// receipt (several can be open at once). Mirrors frontend/src/components/TicketDetails.jsx.
export default function TicketDetails({ ticket, onClose }) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const styles = getStyles(colors);
    const [receipts, setReceipts] = useState(null);
    const [error, setError] = useState('');
    const [openDate, setOpenDate] = useState(null);
    const [openSessions, setOpenSessions] = useState(() => new Set());

    const toggleSession = (id) => setOpenSessions((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });

    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        if (!ticket) return;
        setError('');
        setReceipts(null);
        api.get('/timelogs/receipts/', { params: { eticket_id: ticket.id }, timeout: 20000 })
            .then(({ data }) => setReceipts(Array.isArray(data) ? data : []))
            .catch((e) => setError(e.response ? "Couldn't load your service log." : "Can't reach the server. Check your connection."));
    }, [ticket?.id, attempt]);

    if (!ticket) return null;

    // Newest day first (the API's order); sessions within a day oldest first
    const days = [];
    (receipts || []).forEach((r) => {
        const date = receiptDate(r.time_in);
        const day = days.find((d) => d.date === date);
        if (day) day.sessions.unshift(r);
        else days.push({ date, sessions: [r] });
    });

    const building = ticket.assigned_site?.name || ticket.assigned_location || '—';
    const remaining = ticket.base_remaining_hours ?? ticket.remaining_hours ?? 0;

    return (
        <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            {/* The sheet sits inside a full-screen dimmed, blurred layer so only the ticket is in focus */}
            <View style={styles.overlay}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
            <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.kicker}>E-TICKET</Text>
                        <Text style={styles.title}>{ticket.violation_details?.violation_type || 'Violation'}</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.close} accessibilityLabel="Close">
                        <X size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}>
                    <View style={styles.tile}>
                        <View style={styles.tileLabelRow}>
                            <MapPin size={12} color={colors.textMuted} />
                            <Text style={styles.tileLabel}>ASSIGNED BUILDING</Text>
                        </View>
                        <Text style={styles.tileValue}>{building}</Text>
                    </View>
                    <View style={styles.tileRow}>
                        <View style={[styles.tile, { flex: 1 }]}>
                            <Text style={styles.tileLabel}>REQUIRED</Text>
                            <Text style={styles.tileValue}>{ticket.total_hours_required || 0} hrs</Text>
                        </View>
                        <View style={[styles.tile, { flex: 1 }]}>
                            <Text style={styles.tileLabel}>REMAINING</Text>
                            <Text style={styles.tileValue}>{formatDuration(remaining * 3600)}</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>SERVICE LOG</Text>
                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.error}>{error}</Text>
                            <TouchableOpacity onPress={() => setAttempt((n) => n + 1)} style={styles.retry}>
                                <Text style={styles.retryText}>TRY AGAIN</Text>
                            </TouchableOpacity>
                        </View>
                    ) : !receipts ? (
                        <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
                    ) : days.length === 0 ? (
                        <Text style={styles.empty}>No sessions yet. Scan your building&apos;s QR code to start.</Text>
                    ) : days.map(({ date, sessions }) => {
                        const open = openDate === date;
                        const total = sessions.reduce((sum, r) => sum + (r.duration_seconds || 0), 0);
                        const flagged = sessions.some((r) => FLAGGED_ENDS.includes(r.end_reason));
                        return (
                            <View key={date} style={styles.day}>
                                <TouchableOpacity style={styles.dayHeader} onPress={() => setOpenDate(open ? null : date)} accessibilityState={{ expanded: open }}>
                                    <View style={[styles.dot, { backgroundColor: flagged ? '#ef4444' : colors.success }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.dayDate}>{date}</Text>
                                        <Text style={styles.daySub}>
                                            {sessions.length} session{sessions.length > 1 ? 's' : ''} · {formatDuration(total)} served
                                        </Text>
                                    </View>
                                    <ChevronDown size={18} color={colors.textMuted} style={open && styles.flipped} />
                                </TouchableOpacity>
                                {open && (
                                    <View style={styles.dayBody}>
                                        {sessions.map((r, i) => {
                                            const sessionOpen = openSessions.has(r.id);
                                            const stopped = FLAGGED_ENDS.includes(r.end_reason);
                                            return (
                                                <View key={r.id} style={styles.session}>
                                                    <TouchableOpacity style={styles.sessionHeader} onPress={() => toggleSession(r.id)} accessibilityState={{ expanded: sessionOpen }}>
                                                        <LogIn size={15} color={stopped ? '#ef4444' : colors.primary} />
                                                        <Text style={styles.sessionTitle}>
                                                            Session {i + 1}
                                                        </Text>
                                                        <ChevronDown size={16} color={colors.textMuted} style={sessionOpen && styles.flipped} />
                                                    </TouchableOpacity>
                                                    {sessionOpen && (
                                                        <View style={styles.sessionBody}>
                                                            <SessionReceiptBody receipt={r} hideDate />
                                                        </View>
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </ScrollView>
            </View>
            </View>
        </Modal>
    );
}

const getStyles = (colors) => StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: Platform.OS === 'android' ? 'rgba(15,23,42,0.6)' : 'rgba(15,23,42,0.35)' },
    sheet: { maxHeight: '85%', backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, width: '100%', maxWidth: 576, alignSelf: 'center' },
    header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 2, color: colors.textMuted },
    title: { fontSize: 18, fontWeight: '900', color: colors.text },
    close: { padding: 8, borderRadius: 20, backgroundColor: colors.background },
    tileRow: { flexDirection: 'row', gap: 8 },
    tile: { backgroundColor: colors.background, borderRadius: 12, padding: 12, marginBottom: 8 },
    tileLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tileLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1, color: colors.textMuted },
    tileValue: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 2 },
    sectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2, color: colors.textMuted, marginTop: 12, marginBottom: 8 },
    errorBox: { alignItems: 'center', gap: 10, paddingVertical: 12 },
    error: { fontSize: 13, fontWeight: '600', color: '#dc2626', textAlign: 'center' },
    retry: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
    retryText: { fontSize: 11, fontWeight: '900', letterSpacing: 1, color: colors.primary },
    empty: { fontSize: 13, fontStyle: 'italic', color: colors.textMuted, textAlign: 'center', backgroundColor: colors.background, borderRadius: 12, padding: 16 },
    day: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginBottom: 8, overflow: 'hidden' },
    dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    dayDate: { fontSize: 13, fontWeight: '700', color: colors.text },
    daySub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
    dayBody: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background, padding: 10, gap: 8 },
    session: { backgroundColor: colors.card, borderRadius: 12, overflow: 'hidden' },
    sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
    sessionTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
    sessionBody: { borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 14, paddingBottom: 8 },
    flipped: { transform: [{ rotate: '180deg' }] },
});
