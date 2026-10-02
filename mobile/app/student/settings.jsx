import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut } from 'lucide-react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useTheme } from '../../components/ThemeContext';
import { StudentTopBar, useStudentShell } from '../../components/StudentShell';
import { Group, Row, ToggleRow } from '../../components/SettingsList';

// Mirrors frontend/src/pages/student/Settings.jsx: Appearance, Notifications, Security, Support, Log out.
// The profile and contact details are on Personal Info.
export default function Settings() {
    const router = useRouter();
    const { isDarkMode, changeTheme, colors } = useTheme();
    const { reminders, setReminders, openLogout } = useStudentShell();
    const styles = getStyles(colors);
    const version = Constants.expoConfig?.version || '1.0';

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.card} />
            <StudentTopBar title="Settings" />
            <ScrollView contentContainerStyle={styles.content}>
                <Group label="Appearance">
                    <ToggleRow title="Dark mode" subtitle="Easier on the eyes at night" value={isDarkMode} onValueChange={(on) => changeTheme(on ? 'dark' : 'light')} />
                </Group>
                <Group label="Notifications">
                    <ToggleRow title="Deadline reminders" subtitle="Remind me if I haven't served" value={reminders} onValueChange={setReminders} />
                </Group>
                <Group label="Security">
                    <Row title="Change password" onPress={() => router.push('/student/change-password')} />
                </Group>
                <Group label="Support">
                    <Row title="Help & Support" subtitle="FAQ, penalties, troubleshooting and contact info" onPress={() => router.push('/help')} />
                    <Row title="About OSAConnect" value={`Version ${version}`} />
                </Group>
                <TouchableOpacity style={styles.logout} onPress={openLogout} accessibilityRole="button">
                    <LogOut size={18} color={colors.danger} />
                    <Text style={styles.logoutText}>Log out</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    logout: {
        marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16,
        borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    },
    logoutText: { fontSize: 15, fontWeight: '600', color: colors.danger },
});
