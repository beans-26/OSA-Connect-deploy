import React, { useEffect, useRef } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BellOff } from 'lucide-react-native';
import { useTheme } from '../../components/ThemeContext';
import { StudentTopBar, useStudentShell } from '../../components/StudentShell';
import NotificationItem from '../../components/NotificationItem';

// Mirrors frontend/src/pages/student/Notifications.jsx. Opening the screen marks everything read (the new
// ones keep their dot until the student leaves).
export default function NotificationsScreen() {
    const { isDarkMode, colors } = useTheme();
    const { notifications, seen, markAllRead } = useStudentShell();
    const styles = getStyles(colors);
    const newIds = useRef(null);
    if (newIds.current === null && notifications.length) newIds.current = new Set(notifications.filter((n) => !seen.has(n.id)).map((n) => n.id));
    useEffect(() => { markAllRead(); }, [markAllRead]);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.card} />
            <StudentTopBar title="Notifications" />
            <ScrollView contentContainerStyle={styles.content}>
                {notifications.length === 0 ? (
                    <View style={styles.empty}>
                        <BellOff size={34} color={colors.textMuted} />
                        <Text style={styles.emptyTitle}>No notifications</Text>
                        <Text style={styles.emptyText}>Updates about your violations and service hours show up here.</Text>
                    </View>
                ) : (
                    <View style={styles.card}>
                        {notifications.map((n, i) => <NotificationItem key={n.id} n={n} first={i === 0} fresh={newIds.current?.has(n.id)} />)}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    empty: { alignItems: 'center', marginTop: 64, paddingHorizontal: 24 },
    emptyTitle: { marginTop: 12, fontSize: 14, fontWeight: '600', color: colors.text },
    emptyText: { marginTop: 4, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
    card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
});
