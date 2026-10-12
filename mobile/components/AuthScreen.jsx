import React, { useRef, useSyncExternalStore } from 'react';
import { View, Image, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { introStore } from './introStore';

// Shared look for the login and register screens: a plain white page with the OSAConnect logo above the form
// (like the website's login on a phone). These screens always use the light look.

export const authColors = {
    text: '#0f172a',
    textSoft: '#334155',
    textMuted: '#475569',
    placeholder: 'rgba(100,116,139,0.55)',
    navy: '#1e3a8a',
    link: '#1e40af',
    focus: '#2563eb',
    gold: '#f59e0b',
    goldText: '#d97706',
    goldButton: '#fbbf24',
    success: '#047857',
    danger: '#dc2626',
    field: '#f8fafc',
    fieldBorder: '#cbd5e1',
    panel: '#f1f5f9',
    track: '#e2e8f0',
};
const C = authColors;

export const authStyles = StyleSheet.create({
    label: { fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 5 },
    optional: { fontSize: 11, fontWeight: '500', color: C.textMuted },
    hint: { fontSize: 11, color: C.textSoft, marginTop: 4 },
    input: {
        backgroundColor: C.field,
        borderWidth: 1,
        borderColor: C.fieldBorder,
        borderRadius: 6,
        paddingHorizontal: 10,
        height: 42,
        color: C.text,
        fontSize: 14,
        fontWeight: '600',
    },
    inputFocused: { borderColor: C.focus, backgroundColor: '#ffffff' },
    inputError: { borderColor: C.danger },
    errorText: { fontSize: 11, fontWeight: '700', color: C.danger, marginTop: 4 },
    primaryButton: {
        height: 42,
        paddingHorizontal: 16,
        borderRadius: 6,
        backgroundColor: C.navy,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    primaryButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
    disabled: { opacity: 0.6 },
    title: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
    subtitle: { fontSize: 13, color: C.textSoft, marginTop: 4, lineHeight: 18 },
    linkText: { fontSize: 12, fontWeight: '700', color: C.text, textDecorationLine: 'underline' },
});

export default function AuthScreen({ maxWidth = 400, logoWidth = 220, children }) {
    const insets = useSafeAreaInsets();
    // While the opening animation runs, its logo glides into this logo's spot: report where that is, and
    // keep this one hidden until the animation hands over
    const introDone = useSyncExternalStore(introStore.subscribe, introStore.isDone);
    const logoRef = useRef(null);
    const reportLogoSpot = () => {
        if (introStore.isDone()) return;
        logoRef.current?.measureInWindow((x, y, width, height) => introStore.setTarget({ x, y, width, height }));
    };
    return (
        <View style={styles.background}>
            {/* Dark icons on the white page; the app's own setting comes back when this screen closes */}
            <StatusBar style="dark" />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.fill}>
                <ScrollView
                    contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={[styles.column, { maxWidth }]}>
                        {/* The logo image (1032 x 392) includes the "One scan at a time" tagline */}
                        <Image
                            ref={logoRef}
                            onLayout={reportLogoSpot}
                            source={require('../assets/images/osaconnect-logo.png')}
                            style={{ width: logoWidth, height: Math.round(logoWidth * 392 / 1032), opacity: introDone ? 1 : 0 }}
                            resizeMode="contain"
                            accessibilityLabel="OSAConnect: One scan at a time"
                        />
                        <View style={styles.card}>{children}</View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    background: { flex: 1, backgroundColor: '#ffffff' },
    fill: { flex: 1 },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16 },
    column: { width: '100%', alignSelf: 'center', alignItems: 'center', gap: 16 },
    card: { width: '100%', paddingVertical: 4 },
});
