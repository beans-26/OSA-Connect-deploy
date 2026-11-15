import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Ticket } from 'lucide-react-native';
import { useTheme } from '../../components/ThemeContext';
import { StudentBackdrop, cardLook } from '../../components/StudentLook';
import { StudentTopBar, useStudentShell } from '../../components/StudentShell';
import TicketDetails from '../../components/TicketDetails';
import StudentGuide from '../../components/StudentGuide';
import { ticketStatusLabel } from '../../components/ticketStatus';

// Status pills in the admin feed's style: small, uppercase, tinted (light / dark). Same as the website.
const BADGE = {
    Active: [{ bg: '#dbeafe', text: '#1e40af' }, { bg: 'rgba(59,130,246,0.15)', text: '#93c5fd' }],
    Ongoing: [{ bg: '#dcfce7', text: '#047857' }, { bg: 'rgba(16,185,129,0.15)', text: '#6ee7b7' }],
    Completed: [{ bg: '#fef3c7', text: '#b45309' }, { bg: 'rgba(245,158,11,0.15)', text: '#fcd34d' }],
    Cleared: [{ bg: '#f1f5f9', text: '#64748b' }, { bg: 'rgba(100,116,139,0.2)', text: '#cbd5e1' }],
};
const OTHER_BADGE = [{ bg: '#faf5ff', text: '#7c3aed' }, { bg: 'rgba(139,92,246,0.15)', text: '#c4b5fd' }];

// The side menu's E-Tickets screen (mirrors frontend/src/pages/student/ETickets.jsx): every e-ticket, with
// "How to serve your hours" for an open one. Tapping a ticket opens its service log and forms. The list is the
// shell's copy (the dashboard and the shell keep it fresh), so opening this screen doesn't download it again.
export default function ETicketsScreen() {
    const { isDarkMode, colors } = useTheme();
    const { records, recordsLoaded, reload, guideAsk } = useStudentShell();
    const styles = getStyles(colors, isDarkMode);
    const tickets = records.tickets;
    const [openTicket, setOpenTicket] = useState(null);
    const [guideGeneral, setGuideGeneral] = useState(false);
    const [guideTicket, setGuideTicket] = useState(null);
    useEffect(() => { reload(); }, [reload]);

    const guideFor = tickets.find((t) => t.status === 'Ongoing') || tickets.find((t) => t.status === 'Active');
    // The book icon in the header (top right) opens "How to serve your hours"; only taps made while this screen is
    // open, so coming back to it doesn't reopen it. Same as the website.
    const askSeen = useRef(guideAsk);
    useEffect(() => {
        if (guideAsk === askSeen.current) return;
        askSeen.current = guideAsk;
        if (guideFor) setGuideTicket(guideFor);
        else setGuideGeneral(true); // no open ticket: the same steps, in general
    }, [guideAsk]); // eslint-disable-line react-hooks/exhaustive-deps
    // Keep an open ticket's details current as the list refreshes
    const shown = openTicket && (tickets.find((t) => t.id === openTicket.id) || openTicket);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <StudentBackdrop isDarkMode={isDarkMode} />
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.card} />
            <StudentTopBar title="E-Tickets" />
            <ScrollView contentContainerStyle={styles.content}>
                {!recordsLoaded ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
                ) : tickets.length === 0 ? (
                    <View style={styles.empty}>
                        {/* 🫡 in black and white, same image as the website */}
                        <Image source={require('../../assets/images/salute.png')} style={{ width: 44, height: 44 }} fadeDuration={0} accessibilityIgnoresInvertColors />
                        <Text style={styles.emptyText}>No e-tickets. You have no community service to serve.</Text>
                    </View>
                ) : (
                    tickets.map((ticket, idx) => {
                        const badge = (BADGE[ticket.status] || OTHER_BADGE)[isDarkMode ? 1 : 0];
                        const open = ticket.status === 'Active' || ticket.status === 'Ongoing';
                        return (
                            <TouchableOpacity key={ticket.id || idx} style={styles.row} onPress={() => setOpenTicket(ticket)} accessibilityRole="button">
                                {/* Icon in a soft circle, like the admin violators feed */}
                                <View style={[styles.iconCircle, { backgroundColor: open ? (isDarkMode ? 'rgba(59,130,246,0.15)' : '#dbeafe') : (isDarkMode ? 'rgba(100,116,139,0.2)' : '#f1f5f9') }]}>
                                    <Ticket size={20} color={open ? (isDarkMode ? '#93c5fd' : '#1e3a8a') : (isDarkMode ? '#cbd5e1' : '#64748b')} />
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={styles.rowViolation} numberOfLines={1}>{ticket.violation_details?.violation_type || 'Violation'}</Text>
                                    <Text style={styles.rowTitle} numberOfLines={1}>Ticket #{ticket.id}</Text>
                                    <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                                            <Text style={[styles.badgeText, { color: badge.text }]}>{ticketStatusLabel(ticket)}</Text>
                                        </View>
                                        <Text style={styles.rowSmall}>{Math.round((ticket.total_hours_required || 0) * 100) / 100} hrs required</Text>
                                    </View>
                                </View>
                                <ChevronRight size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>
            <TicketDetails ticket={shown} onClose={() => setOpenTicket(null)} />
            <StudentGuide ticket={guideTicket} general={guideGeneral} onClose={() => { setGuideTicket(null); setGuideGeneral(false); }} onOpenTicket={(t) => { setGuideTicket(null); setOpenTicket(t); }} />
        </SafeAreaView>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    subtitle: { fontSize: 14, fontWeight: '500', color: colors.textMuted, marginBottom: 12, lineHeight: 20 },
    guide: {
        flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, padding: 12, borderRadius: 16, borderWidth: 1,
        borderColor: isDarkMode ? 'rgba(245,158,11,0.4)' : '#fcd34d', backgroundColor: isDarkMode ? 'rgba(245,158,11,0.1)' : '#fffbeb',
    },
    guideTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
    guideText: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
    empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyText: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 20, padding: 14, marginBottom: 10, ...cardLook(isDarkMode) },
    iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    rowViolation: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: isDarkMode ? '#f87171' : '#dc2626' },
    rowTitle: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 2 },
    rowSmall: { fontSize: 11, fontWeight: '500', color: colors.textMuted },
    badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
});
