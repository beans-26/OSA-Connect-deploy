import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../components/ThemeContext';
import { StudentTopBar, useStudentShell } from '../../components/StudentShell';
import { Group, InfoRow } from '../../components/SettingsList';
import ContactDetailsCard from '../../components/ContactDetailsCard';

const yearText = (y) => {
    if (!/^\d+$/.test(y || '')) return y;
    const n = Number(y);
    return `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] || 'th'} Year`;
};

// Mirrors frontend/src/pages/student/PersonalInfo.jsx
export default function PersonalInfo() {
    const { isDarkMode, colors } = useTheme();
    const { profile, setProfile } = useStudentShell();
    const styles = getStyles(colors);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.card} />
            <StudentTopBar title="Personal Info" />
            {!profile ? (
                <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : (
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                        <Group label="Basic information">
                            <InfoRow label="Full name" value={profile.name} />
                            <InfoRow label="Student ID" value={profile.student_id} />
                            <InfoRow label="Course" value={profile.course} />
                            <InfoRow label="College" value={profile.department} />
                            <InfoRow label="Year level" value={yearText(profile.year_level)} />
                            <InfoRow label="Gender" value={profile.gender} />
                        </Group>
                        <ContactDetailsCard studentInfo={profile} onUpdated={(changes) => setProfile((p) => ({ ...p, ...changes }))} />
                        <Text style={styles.note}>Wrong name, course or college? Visit the OSA office to have it corrected.</Text>
                    </ScrollView>
                </KeyboardAvoidingView>
            )}
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 16, paddingBottom: 40 },
    note: { fontSize: 12, color: colors.textMuted, paddingHorizontal: 4 },
});
