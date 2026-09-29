import React from 'react';
import { View, Image, ImageBackground, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Shared look for the login and register screens (same as the website's): the USTP campus photo
// (pre-blurred image) with a light wash, the OSAConnect logo, and a blue glass box for the form.
// These screens always use the light look so the logo and text read clearly over the photo.

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
    field: 'rgba(255,255,255,0.75)',
    fieldBorder: 'rgba(255,255,255,0.85)',
    panel: 'rgba(255,255,255,0.6)',
    track: 'rgba(255,255,255,0.6)',
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

export default function AuthScreen({ maxWidth = 400, children }) {
    const insets = useSafeAreaInsets();
    return (
        <ImageBackground source={require('../assets/images/ustp-campus-blur.jpg')} style={styles.background} resizeMode="cover">
            <View style={styles.wash} pointerEvents="none" />
            {/* Dark icons over the light photo; the app's own setting comes back when this screen closes */}
            <StatusBar style="dark" />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.fill}>
                <ScrollView
                    contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={[styles.column, { maxWidth }]}>
                        {/* The logo image includes the "Smart student violation management" tagline */}
                        <Image
                            source={require('../assets/images/osaconnect-logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                            accessibilityLabel="OSAConnect: Smart student violation management"
                        />
                        <View style={styles.card}>{children}</View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: { flex: 1, backgroundColor: '#f8fafc' },
    wash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.4)' },
    fill: { flex: 1 },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16 },
    column: { width: '100%', alignSelf: 'center', alignItems: 'center', gap: 16 },
    // The logo file is 507 x 99
    logo: { width: 220, height: 43 },
    card: {
        width: '100%',
        padding: 18,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.75)',
        backgroundColor: 'rgba(224,242,254,0.62)',
    },
});
