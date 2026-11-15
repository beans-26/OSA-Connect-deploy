import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BadgeCheck, ChevronRight, CircleQuestionMark, LogOut, Mail, User } from 'lucide-react-native';
import { useAuth } from '../../components/AuthContext';
import { useTheme } from '../../components/ThemeContext';
import { HomeHeader } from '../../components/StudentLook';
import { useReporterShell } from '../../components/ReporterShell';

const ROLE_LABEL = { guard: 'Guard', staff: 'Faculty' };

// The Profile tab of the guard and faculty & staff screens (same as the website's pages/guard/ReporterProfile.jsx):
// the account, Help (faculty & staff) and Log out (asks first, components/ReporterShell.jsx).
export default function ReporterProfile() {
    const { user } = useAuth();
    const router = useRouter();
    const { colors, isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const { openLogout } = useReporterShell();
    const styles = getStyles(colors, isDarkMode);
    const name = user?.full_name || user?.name || user?.username || 'Account';
    const rows = [
        { Icon: User, label: 'Name', value: name },
        { Icon: BadgeCheck, label: 'Role', value: ROLE_LABEL[user?.role] || '—' },
        { Icon: Mail, label: user?.username?.includes('@') ? 'Email' : 'Username', value: user?.username || '—' },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ paddingTop: insets.top }}>
                <HomeHeader isDarkMode={isDarkMode} greeting="Profile" name={`${name} · ${ROLE_LABEL[user?.role] || ''}`} />
            </View>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.section}>ACCOUNT</Text>
                <View style={styles.card}>
                    {rows.map(({ Icon, label, value }, i) => (
                        <View key={label} style={[styles.row, i > 0 && styles.rowLine]}>
                            <Icon size={20} color={colors.textMuted} />
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={styles.rowLabel}>{label}</Text>
                                <Text style={styles.rowValue}>{value}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {user?.role === 'staff' && (
                    <>
                        <Text style={[styles.section, { marginTop: 20 }]}>SUPPORT</Text>
                        <TouchableOpacity style={[styles.card, styles.row]} onPress={() => router.push('/help')} accessibilityRole="button">
                            <CircleQuestionMark size={20} color={colors.textMuted} />
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={styles.rowValue}>Help &amp; Support</Text>
                                <Text style={[styles.rowLabel, { marginTop: 2 }]}>How to file a violation report</Text>
                            </View>
                            <ChevronRight size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                    </>
                )}

                <TouchableOpacity style={[styles.card, styles.logout]} onPress={openLogout} accessibilityRole="button">
                    <LogOut size={18} color={colors.danger} />
                    <Text style={styles.logoutText}>Log out</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    content: { padding: 16, paddingBottom: 28, width: '100%', maxWidth: 560, alignSelf: 'center' },
    section: { marginBottom: 8, paddingHorizontal: 4, fontSize: 12, fontWeight: '700', letterSpacing: 1, color: colors.textMuted },
    card: {
        borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden',
        shadowColor: '#101a4b', shadowOpacity: isDarkMode ? 0 : 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 2,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
    rowLine: { borderTopWidth: 1, borderTopColor: colors.border },
    rowLabel: { fontSize: 12, color: colors.textMuted },
    rowValue: { marginTop: 1, fontSize: 15, fontWeight: '600', color: colors.text },
    logout: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
    logoutText: { fontSize: 15, fontWeight: '600', color: colors.danger },
});
