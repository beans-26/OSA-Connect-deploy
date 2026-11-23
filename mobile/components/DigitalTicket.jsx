import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable, Animated, Easing, ScrollView } from 'react-native';
import { X, ShieldCheck } from 'lucide-react-native';
import { ticketStatusLabel } from './ticketStatus';
import { useStudentShell } from './StudentShell';

// The digital e-ticket a student shows a guard (opened from the ticket's details, components/TicketDetails.jsx):
// who they are, the violation, where the case stands and their service. The clock at the bottom runs live, so a
// guard can tell it's the real screen and not a screenshot. Mirrors frontend/src/components/DigitalTicket.jsx.

// Screenshots and screen recordings of the e-ticket come out black while it's open (Android FLAG_SECURE,
// expo-screen-capture, app 1.5.0 and later). Loaded defensively: an app without the native module just doesn't block.
let usePreventScreenCapture = () => {};
try {
    usePreventScreenCapture = require('expo-screen-capture').usePreventScreenCapture;
} catch {
    // older app build: no screenshot blocking; the moving watermark and the live clock still give a screenshot away
}

// Colors of the status band, by the database status
const STATUS_TONE = { Active: '#1e3a8a', Ongoing: '#047857', Completed: '#b45309', Cleared: '#334155', Dismissed: '#b91c1c' };

// The watermark: the student ID and the time to the second, in rows across the card, drifting sideways.
// A screenshot freezes it (and its time stops), so a guard can tell a picture from the real screen.
const WATERMARK_ROWS = 9;
function Watermark({ studentId, time }) {
    const drift = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(Animated.timing(drift, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true }));
        loop.start();
        return () => loop.stop();
    }, [drift]);
    const text = `${studentId} · ${time}`;
    const row = Array.from({ length: 4 }, () => text).join('      ');
    return (
        <View pointerEvents="none" style={styles.watermark}>
            <Animated.View style={{ transform: [{ rotate: '-24deg' }, { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-160, 0] }) }] }}>
                {Array.from({ length: WATERMARK_ROWS }, (_, i) => (
                    <Text key={i} numberOfLines={1} style={[styles.watermarkText, i % 2 ? { marginLeft: 80 } : null]}>{row}</Text>
                ))}
            </Animated.View>
        </View>
    );
}

const manila = (date, options) => date.toLocaleString('en-PH', { timeZone: 'Asia/Manila', ...options });
const fmtDay = (iso) => {
    const d = iso ? new Date(iso) : null;
    return d && !Number.isNaN(d.getTime()) ? manila(d, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
};
// "3h 05m"
const hoursMinutes = (hours) => {
    const mins = Math.max(0, Math.round((hours || 0) * 60));
    return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
};

const Line = ({ label, value, color }) => (
    <View style={styles.line}>
        <Text style={styles.lineLabel}>{label.toUpperCase()}</Text>
        <Text style={[styles.lineValue, color && { color }]}>{value}</Text>
    </View>
);

export default function DigitalTicket({ ticket, onClose }) {
    usePreventScreenCapture('digital-ticket');
    // Shown from the copy saved on the phone (no data): when that copy was last updated
    const offlineSince = useStudentShell()?.offlineSince;
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    // The live dot pulses so the screen visibly moves
    const pulse = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }));
        loop.start();
        return () => loop.stop();
    }, [pulse]);
    if (!ticket) return null;

    const v = ticket.violation_details || {};
    const student = v.student_details || {};
    const required = ticket.total_hours_required || 0;
    const remaining = ticket.base_remaining_hours ?? ticket.remaining_hours ?? 0;
    const open = ['Active', 'Ongoing'].includes(ticket.status);
    const building = ticket.assigned_location || v.assigned_building;
    const ticketNo = String(ticket.id || '').slice(-8).toUpperCase();

    return (
        <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
                <ScrollView contentContainerStyle={styles.center} style={{ width: '100%' }}>
                    <View style={styles.card}>
                        <View style={styles.header}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.kicker}>USTP OFFICE OF STUDENT AFFAIRS</Text>
                                <Text style={styles.title}>Digital E-Ticket</Text>
                                <Text style={styles.ticketNo}>No. {ticketNo}</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.close} accessibilityLabel="Close">
                                <X size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {offlineSince ? (
                            <View style={styles.offline}>
                                <Text style={styles.offlineText}>OFFLINE · LAST UPDATED {manila(new Date(offlineSince), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase()}</Text>
                            </View>
                        ) : null}
                        {/* Where the case stands, big enough to read at arm's length */}
                        <View style={[styles.status, { backgroundColor: STATUS_TONE[ticket.status] || '#334155' }]}>
                            <ShieldCheck size={20} color="#fff" />
                            <Text style={styles.statusText}>{ticketStatusLabel(ticket).toUpperCase()}</Text>
                        </View>

                        <View style={styles.body}>
                            <Watermark studentId={student.student_id || ''} time={manila(now, { hour: 'numeric', minute: '2-digit', second: '2-digit' })} />
                            <Text style={styles.name} numberOfLines={1}>{student.display_name || student.name || '—'}</Text>
                            <Text style={styles.id}>{student.student_id || '—'}</Text>
                            {student.course ? <Text style={styles.course} numberOfLines={1}>{student.course}</Text> : null}

                            <View style={styles.section}>
                                <Line label="Violation" value={v.violation_type || '—'} color="#dc2626" />
                                <Line label="Offense" value={`#${v.offense_count || 1}`} />
                                <Line label="Reported" value={fmtDay(v.created_at)} />
                            </View>
                            <View style={styles.section}>
                                <Line label="Service site" value={building || '—'} />
                                <Line label="Hours required" value={hoursMinutes(required)} />
                                <Line label={open ? 'Time left' : 'Time served'} value={hoursMinutes(open ? remaining : required - remaining)} />
                                {open && ticket.deadline ? <Line label="Deadline" value={fmtDay(new Date(Date.parse(ticket.deadline) - 1).toISOString())} /> : null}
                                {ticket.status === 'Cleared' ? <Line label="Cleared" value={fmtDay(v.cleared_at)} color="#047857" /> : null}
                            </View>
                        </View>

                        {/* Live clock: it keeps ticking, so a screenshot shows a stopped time */}
                        <View style={styles.clock}>
                            <View style={styles.dotWrap}>
                                <Animated.View style={[styles.dotPulse, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }] }]} />
                                <View style={styles.dot} />
                            </View>
                            <Text style={styles.clockText}>
                                {manila(now, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · {manila(now, { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(11,20,55,0.92)' },
    center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
    card: { width: '100%', maxWidth: 384, borderRadius: 28, overflow: 'hidden', backgroundColor: '#ffffff' },
    // Same blue as the ticket sheet's header
    header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, backgroundColor: '#162a6e' },
    kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 2, color: '#dbeafe' },
    title: { marginTop: 2, fontSize: 20, fontWeight: '900', color: '#ffffff' },
    ticketNo: { marginTop: 4, fontSize: 12, fontWeight: '700', color: '#dbeafe', fontFamily: 'monospace' },
    close: { padding: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' },
    offline: { paddingVertical: 6, paddingHorizontal: 20, backgroundColor: '#fef3c7' },
    offlineText: { textAlign: 'center', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: '#92400e' },
    status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20 },
    statusText: { fontSize: 18, fontWeight: '900', letterSpacing: 0.5, color: '#ffffff' },
    body: { paddingHorizontal: 20, paddingVertical: 16, overflow: 'hidden' },
    // Behind the text, faint enough to read through
    watermark: { position: 'absolute', top: -60, bottom: -60, left: -120, right: -120, justifyContent: 'center' },
    watermarkText: { fontSize: 13, fontWeight: '900', color: 'rgba(30,58,138,0.09)', lineHeight: 30, fontVariant: ['tabular-nums'] },
    name: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    id: { fontSize: 14, fontWeight: '700', color: '#475569', fontFamily: 'monospace' },
    course: { fontSize: 12, fontWeight: '600', color: '#64748b' },
    section: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: '#e2e8f0' },
    line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, paddingVertical: 4 },
    lineLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, color: '#64748b' },
    lineValue: { flexShrink: 1, textAlign: 'right', fontSize: 14, fontWeight: '700', color: '#0f172a' },
    clock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#f8fafc' },
    dotWrap: { width: 10, height: 10, alignItems: 'center', justifyContent: 'center' },
    dotPulse: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#34d399' },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981' },
    clockText: { fontSize: 12, fontWeight: '700', color: '#475569', fontVariant: ['tabular-nums'] },
});
