import React from 'react';
import { Switch, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from './ThemeContext';
import { shellColors } from './StudentShell';

// The grouped-list look of the student Settings and Personal Info screens (mirrors
// frontend/src/components/SettingsList.jsx): an uppercase label over a rounded card of rows.
const useStyles = () => {
    const { colors } = useTheme();
    return { colors, styles: getStyles(colors) };
};

export function Group({ label, children }) {
    const { styles } = useStyles();
    const rows = React.Children.toArray(children).filter(Boolean);
    return (
        <View style={styles.group}>
            {label ? <Text style={styles.groupLabel}>{label.toUpperCase()}</Text> : null}
            <View style={styles.card}>
                {rows.map((row, i) => <View key={i} style={i > 0 && styles.divider}>{row}</View>)}
            </View>
        </View>
    );
}

const RowText = ({ title, subtitle, styles }) => (
    <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
);

export function Row({ title, subtitle, value, onPress }) {
    const { styles, colors } = useStyles();
    const content = (
        <>
            <RowText title={title} subtitle={subtitle} styles={styles} />
            {value ? <Text style={styles.value}>{value}</Text> : null}
            {onPress ? <ChevronRight size={18} color={colors.textMuted} /> : null}
        </>
    );
    return onPress
        ? <TouchableOpacity style={styles.row} onPress={onPress} accessibilityRole="button">{content}</TouchableOpacity>
        : <View style={styles.row}>{content}</View>;
}

export function ToggleRow({ title, subtitle, value, onValueChange }) {
    const { styles, colors } = useStyles();
    const { isDarkMode } = useTheme();
    return (
        <View style={styles.row}>
            <RowText title={title} subtitle={subtitle} styles={styles} />
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: colors.border, true: shellColors(isDarkMode).accent }}
                thumbColor="#fff"
                activeThumbColor="#fff"
                accessibilityLabel={title}
            />
        </View>
    );
}

export function InfoRow({ label, value, action }) {
    const { styles } = useStyles();
    return (
        <View style={styles.row}>
            <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value || '—'}</Text>
            </View>
            {action}
        </View>
    );
}

const getStyles = (colors) => StyleSheet.create({
    group: { marginBottom: 16 },
    groupLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: colors.textMuted, marginBottom: 8, paddingHorizontal: 4 },
    card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    divider: { borderTopWidth: 1, borderTopColor: colors.border },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
    title: { fontSize: 15, fontWeight: '600', color: colors.text },
    subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    value: { fontSize: 14, color: colors.textMuted },
    infoLabel: { fontSize: 12, color: colors.textMuted },
    infoValue: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 2 },
});
