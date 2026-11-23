import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Pressable, ActivityIndicator, Platform, Animated, Easing, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronDown, LogIn, CheckCircle2, Clock, FileText, MapPin, CalendarClock, ScanFace, Ban } from 'lucide-react-native';
import { ticketReceipt } from './ticketStatus';
import { BlurView } from 'expo-blur';
import { useTheme } from './ThemeContext';
import api from '../services/api';
import { SessionReceiptBody, receiptDate, formatDuration, FLAGGED_ENDS } from './SessionReceipt';
import ServiceForms from './ServiceForms';
import DigitalTicket from './DigitalTicket';

// Opened by tapping an e-ticket on the student dashboard: the ticket, then its service log grouped by
// date. Each date is a toggle listing that day's sessions (Session 1, 2, ...); tapping one opens its
// receipt (several can be open at once). Mirrors frontend/src/components/TicketDetails.jsx.
// The coloured title bar stays put while the receipt scrolls; the ISO and reflection forms are in here too.
// "28h 05m"
const hoursMinutes = (hours) => {
    const mins = Math.max(0, Math.round((hours || 0) * 60));
    return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
};

export default function TicketDetails({ ticket, onClose }) {
    const { colors, isDarkMode } = useTheme();
    // The full receipt (violation, sanction, buildings...) is folded away so the essentials come first
    const [showDetails, setShowDetails] = useState(false);
    // The sheet slides up from the bottom as it opens; the dimmed background fades in
    const rise = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (!ticket) return;
        rise.setValue(0);
        setShowDetails(false);
        Animated.timing(rise, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, [ticket?.id, rise]);
    // Closing (X, a tap outside, the back button): the sheet slides back down, then it's removed
    const closingRef = useRef(false);
    useEffect(() => { closingRef.current = false; }, [ticket?.id]);
    const close = () => {
        if (closingRef.current) return;
        closingRef.current = true;
        Animated.timing(rise, { toValue: 0, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => onClose());
    };
    const insets = useSafeAreaInsets();
    const styles = getStyles(colors);
    const [receipts, setReceipts] = useState(null);
    const [error, setError] = useState('');
    // The digital e-ticket the student shows a guard
    const [showDigital, setShowDigital] = useState(false);
    useEffect(() => { setShowDigital(false); }, [ticket?.id]);
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

    // The ticket as a short receipt (same as the website): violation, required action, buildings assigned
    const summary = ticketReceipt(ticket, receipts);
    const HEADER = {
        done: { box: { borderColor: '#e2e8f0', backgroundColor: '#f1f5f9' }, title: '#334155', sub: '#64748b', Icon: CheckCircle2 },
        clearance: { box: { borderColor: '#a7f3d0', backgroundColor: '#ecfdf5' }, title: '#065f46', sub: '#047857', Icon: FileText },
        active: { box: { borderColor: colors.border, backgroundColor: colors.background }, title: colors.text, sub: colors.textMuted, Icon: Clock },
        dismissed: { box: { borderColor: '#fecaca', backgroundColor: '#fef2f2' }, title: '#991b1b', sub: '#b91c1c', Icon: Ban },
    }[summary.header.tone];
    const TONE = { red: '#dc2626', good: '#059669', bad: '#dc2626' };
    const required = ticket.total_hours_required || 0;
    const remaining = ticket.base_remaining_hours ?? ticket.remaining_hours ?? 0;
    const pct = required ? Math.min(100, Math.round(((required - remaining) / required) * 100)) : 0;
    const isOpen = ['Active', 'Ongoing'].includes(ticket.status);
    const deadline = summary.sections[1].lines.find(([label]) => label === 'Deadline');
    const building = summary.buildings[summary.buildings.length - 1]?.name;
    const sheetHeight = Dimensions.get('window').height;

    return (
        <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={close}>
            {/* The sheet sits inside a full-screen dimmed, blurred layer so only the ticket is in focus */}
            <View style={styles.overlay}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.dim, { opacity: rise }]}>
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            </Animated.View>
            <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" />
            <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 12, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [sheetHeight, 0] }) }] }]}>
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.kicker}>E-TICKET</Text>
                        <Text style={styles.title}>{ticket.violation_details?.violation_type || 'Violation'}</Text>
                    </View>
                    <TouchableOpacity onPress={close} style={styles.close} accessibilityLabel="Close">
                        <X size={18} color="#fff" />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}>
                    {/* At a glance: where the ticket stands, time left, progress, building and deadline. Same as the website. */}
                    <View style={styles.glance}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={[styles.glanceIcon, HEADER.box]}><HEADER.Icon size={20} color={HEADER.title} /></View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.glanceTitle}>{summary.header.title}</Text>
                                <Text style={styles.glanceSub}>{isOpen ? 'Time left to serve' : summary.header.subtitle}</Text>
                            </View>
                        </View>
                        {isOpen && (
                            <>
                                <Text style={styles.glanceTime}>{hoursMinutes(remaining)}</Text>
                                <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }}>
                                    <View style={[styles.progressFill, { width: `${pct}%` }]} />
                                </View>
                                <Text style={styles.glanceSub}>{hoursMinutes(required - remaining)} of {hoursMinutes(required)} served</Text>
                            </>
                        )}
                        {(building || deadline) && (
                            <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {!!building && (
                                    <View style={[styles.chip, { backgroundColor: isDarkMode ? 'rgba(59,130,246,0.16)' : '#eef2ff' }]}>
                                        <MapPin size={13} color={isDarkMode ? '#93c5fd' : '#1e3a8a'} />
                                        <Text style={[styles.chipText, { color: isDarkMode ? '#93c5fd' : '#1e3a8a' }]}>{building}</Text>
                                    </View>
                                )}
                                {deadline && (
                                    <View style={[styles.chip, { backgroundColor: deadline[2] === 'bad' ? (isDarkMode ? 'rgba(239,68,68,0.15)' : '#fee2e2') : colors.background }]}>
                                        <CalendarClock size={13} color={deadline[2] === 'bad' ? (isDarkMode ? '#fca5a5' : '#b91c1c') : colors.textMuted} />
                                        <Text style={[styles.chipText, { color: deadline[2] === 'bad' ? (isDarkMode ? '#fca5a5' : '#b91c1c') : colors.textMuted }]}>Deadline {deadline[1]}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* The e-ticket to show a guard, full screen (same as the website) */}
                    <TouchableOpacity style={styles.digitalButton} onPress={() => setShowDigital(true)} accessibilityRole="button">
                        <ScanFace size={18} color="#fff" />
                        <Text style={styles.digitalButtonText}>Show digital e-ticket to guard</Text>
                    </TouchableOpacity>

                    {['Active', 'Ongoing', 'Completed'].includes(ticket.status) && <ServiceForms />}

                    {/* The full receipt, folded away: violation, required action, buildings assigned */}
                    <View style={styles.receipt}>
                        <TouchableOpacity onPress={() => setShowDetails((v) => !v)} style={styles.detailsToggle} accessibilityRole="button" accessibilityState={{ expanded: showDetails }}>
                            <Text style={styles.detailsTitle}>Ticket details</Text>
                            <ChevronDown size={18} color={colors.textMuted} style={showDetails && styles.flipped} />
                        </TouchableOpacity>
                        {showDetails && (
                        <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
                        {summary.sections.map((section, i) => (
                            <View key={section.title} style={[styles.receiptSection, i === 0 && { borderTopWidth: 0 }]}>
                                <Text style={styles.receiptSectionTitle}>{section.title.toUpperCase()}</Text>
                                {section.lines.map(([label, value, tone]) => (
                                    <View key={label} style={styles.receiptLine}>
                                        <Text style={styles.receiptLabel}>{label}</Text>
                                        <Text style={[styles.receiptValue, tone && { color: TONE[tone] }]}>{value}</Text>
                                    </View>
                                ))}
                            </View>
                        ))}
                        {summary.buildings.length > 0 && (
                            <View style={styles.receiptSection}>
                                <Text style={styles.receiptSectionTitle}>BUILDING{summary.buildings.length === 1 ? '' : 'S'} ASSIGNED</Text>
                                {summary.buildings.map((b, i) => (
                                    <View key={i} style={styles.receiptLine}>
                                        <Text style={[styles.receiptValue, { textAlign: 'left' }]}>
                                            {summary.buildings.length > 1 ? `${i + 1}. ` : ''}{b.name}
                                        </Text>
                                        {b.date ? <Text style={styles.receiptLabel}>{b.date}</Text> : null}
                                    </View>
                                ))}
                            </View>
                        )}
                        </View>
                        )}
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
            </Animated.View>
            </View>
            {showDigital && <DigitalTicket ticket={ticket} onClose={() => setShowDigital(false)} />}
        </Modal>
    );
}

const getStyles = (colors) => StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    dim: { backgroundColor: Platform.OS === 'android' ? 'rgba(15,23,42,0.6)' : 'rgba(15,23,42,0.35)' },
    sheet: { maxHeight: '85%', backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', width: '100%', maxWidth: 576, alignSelf: 'center' },
    // Outside the ScrollView, so it stays at the top while the receipt scrolls
    header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 16, gap: 12, backgroundColor: '#162a6e', marginBottom: 16 },
    kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: '#dbeafe' },
    title: { fontSize: 18, fontWeight: '700', color: '#fff' },
    close: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)' },
    digitalButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#162a6e', marginBottom: 16 },
    digitalButtonText: { fontSize: 14, fontWeight: '900', color: '#ffffff' },
    receipt: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, overflow: 'hidden', marginBottom: 16 },
    detailsToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
    detailsTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
    glance: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 16, marginBottom: 16, backgroundColor: colors.card },
    glanceIcon: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    glanceTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
    glanceSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    glanceTime: { marginTop: 12, fontSize: 32, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
    progress: { marginTop: 10, marginBottom: 4, height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.border },
    progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
    chipText: { fontSize: 12, fontWeight: '500' },
    receiptHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
    receiptTitle: { fontSize: 14, fontWeight: '700' },
    receiptSub: { fontSize: 11, fontWeight: '500', marginTop: 1 },
    receiptSection: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
    receiptSectionTitle: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: colors.textMuted, marginBottom: 4 },
    receiptLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, paddingVertical: 4 },
    receiptLabel: { fontSize: 11, fontWeight: '500', color: colors.textMuted },
    receiptValue: { flexShrink: 1, fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'right' },
    sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: colors.textMuted, marginTop: 12, marginBottom: 8 },
    errorBox: { alignItems: 'center', gap: 10, paddingVertical: 12 },
    error: { fontSize: 13, fontWeight: '500', color: '#dc2626', textAlign: 'center' },
    retry: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
    retryText: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: colors.primary },
    empty: { fontSize: 13, fontStyle: 'italic', color: colors.textMuted, textAlign: 'center', backgroundColor: colors.background, borderRadius: 12, padding: 16 },
    day: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginBottom: 8, overflow: 'hidden' },
    dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    dayDate: { fontSize: 13, fontWeight: '600', color: colors.text },
    daySub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
    dayBody: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background, padding: 10, gap: 8 },
    session: { backgroundColor: colors.card, borderRadius: 12, overflow: 'hidden' },
    sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
    sessionTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
    sessionBody: { borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 14, paddingBottom: 8 },
    flipped: { transform: [{ rotate: '180deg' }] },
});
