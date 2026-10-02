import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, CheckCircle2, Clock, Info } from 'lucide-react-native';
import { useTheme } from './ThemeContext';
import { shellColors } from './StudentShell';

// One notification row, used by the Notifications screen and the bell's panel (StudentShell).
// Mirrors frontend/src/components/NotificationItem.jsx.
const TONES = {
    info: { Icon: Info, light: ['#dbeafe', '#1d4ed8'], dark: ['rgba(59,130,246,0.15)', '#93c5fd'] },
    warn: { Icon: Clock, light: ['#fef3c7', '#b45309'], dark: ['rgba(245,158,11,0.15)', '#fcd34d'] },
    good: { Icon: CheckCircle2, light: ['#d1fae5', '#047857'], dark: ['rgba(16,185,129,0.15)', '#6ee7b7'] },
    bad: { Icon: AlertTriangle, light: ['#fee2e2', '#dc2626'], dark: ['rgba(239,68,68,0.15)', '#fca5a5'] },
};

const when = (iso) => {
    const t = Date.parse(iso);
    if (!t) return '';
    const mins = Math.round((Date.now() - t) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    if (mins < 24 * 60) return `${Math.round(mins / 60)} hr ago`;
    return new Date(t).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

export default function NotificationItem({ n, fresh, first, compact = false }) {
    const { isDarkMode, colors } = useTheme();
    const sc = shellColors(isDarkMode);
    const styles = getStyles(colors);
    const tone = TONES[n.tone] || TONES.info;
    const [bg, fg] = isDarkMode ? tone.dark : tone.light;
    const size = compact ? 32 : 36;
    return (
        <View style={[styles.item, compact && { paddingHorizontal: 14, paddingVertical: 12 }, !first && styles.divider, fresh && { backgroundColor: sc.accentSoft }]}>
            <View style={[styles.icon, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}><tone.Icon size={compact ? 15 : 17} color={fg} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.titleRow}>
                    <Text style={styles.title}>{n.title}</Text>
                    <Text style={styles.time}>{when(n.at)}</Text>
                </View>
                <Text style={styles.body} numberOfLines={compact ? 2 : undefined}>{n.body}</Text>
            </View>
            {fresh && <View style={[styles.dot, { backgroundColor: sc.accent }]} accessibilityLabel="New" />}
        </View>
    );
}

const getStyles = (colors) => StyleSheet.create({
    item: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
    divider: { borderTopWidth: 1, borderTopColor: colors.border },
    icon: { alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
    title: { flexShrink: 1, fontSize: 14, fontWeight: '700', color: colors.text },
    time: { fontSize: 11, color: colors.textMuted },
    body: { marginTop: 2, fontSize: 12, lineHeight: 18, color: colors.textMuted },
    dot: { width: 8, height: 8, borderRadius: 4, marginTop: 8 },
});
