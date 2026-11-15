import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, AccessibilityInfo, BackHandler } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ChevronRight } from 'lucide-react-native';
import AuthScreen, { authColors as C } from '../components/AuthScreen';
import { LoginForm } from './login';
import { layerMotion } from '../components/StudentWalkthrough';
import { walkthroughScene, ART_WIDTH, ART_HEIGHT } from '../../shared/walkthrough-art';

// The app's first screen after the opening logo when nobody is logged in: are you a student or faculty?
// Each choice has its own looping figure (shared/walkthrough-art.js) and shows the login for that side right
// here (login.jsx's LoginForm), under the same logo: a new screen loaded the logo again and it showed up late.
// Guards log in on the Faculty side too.
const ART_W = 128;
const ART_H = Math.round((ART_W * ART_HEIGHT) / ART_WIDTH);

const CHOICES = [
    { as: 'student', scene: 'roleStudent', bg: '#dbeafe', title: 'Student', text: 'Your e-tickets, QR ID and service hours' },
    { as: 'faculty', scene: 'roleFaculty', bg: '#ccfbf1', title: 'Faculty', text: 'Report a violation and see the analytics' },
];

// One figure, its layers looping like the walkthrough's (still when the phone's Reduce motion is on)
function Figure({ scene, bg, still }) {
    const art = useMemo(() => walkthroughScene(scene, { bg }), [scene, bg]);
    const clocks = useMemo(() => art.layers.map((l) => (l.anim ? new Animated.Value(0) : null)), [art]);
    useEffect(() => {
        if (still) return undefined;
        const loops = art.layers.map((l, i) => l.anim && Animated.loop(
            // JavaScript-driven: Android's native animation engine (release APK) silently skipped these loops
            // (many keyframes, rotation strings, a custom pivot), so the people stood still. The pictures are small.
            Animated.timing(clocks[i], { toValue: 1, duration: l.anim.duration, easing: Easing.linear, useNativeDriver: false }),
        )).filter(Boolean);
        loops.forEach((loop) => loop.start());
        return () => loops.forEach((loop) => loop.stop());
    }, [art, clocks, still]);
    const layer = { position: 'absolute', left: 0, top: 0, width: ART_W, height: ART_H };
    return (
        <View style={{ width: ART_W, height: ART_H }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {art.layers.map((l, i) => (l.anim ? (
                <Animated.View key={i} style={[layer, layerMotion(l.anim, clocks[i], ART_W / ART_WIDTH, still)]}>
                    <SvgXml xml={l.svg} width={ART_W} height={ART_H} />
                </Animated.View>
            ) : (
                <View key={i} style={layer}><SvgXml xml={l.svg} width={ART_W} height={ART_H} /></View>
            )))}
        </View>
    );
}

export default function Welcome() {
    const [chosen, setChosen] = useState(null); // 'student' | 'faculty' once a card is tapped
    const [still, setStill] = useState(false);
    // The two cards rise in one after the other
    const [rise] = useState(() => CHOICES.map(() => new Animated.Value(0)));
    useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled().then(setStill).catch(() => {});
        Animated.stagger(120, rise.map((v) => Animated.timing(v, { toValue: 1, duration: 420, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }))).start();
    }, [rise]);
    // Android's back button on the login: back to the choice
    useEffect(() => {
        if (!chosen) return undefined;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => { setChosen(null); return true; });
        return () => sub.remove();
    }, [chosen]);

    if (chosen) {
        return (
            <AuthScreen maxWidth={384}>
                <LoginForm key={chosen} faculty={chosen === 'faculty'} onChange={() => setChosen(null)} />
            </AuthScreen>
        );
    }

    return (
        <AuthScreen maxWidth={420}>
            <Text style={styles.title}>Who&apos;s using the app?</Text>
            <Text style={styles.subtitle}>Choose one to log in.</Text>
            <View style={styles.row}>
                {CHOICES.map((c, i) => (
                    <Animated.View key={c.as} style={[styles.cell, { opacity: rise[i], transform: [{ translateY: rise[i].interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
                        <TouchableOpacity
                            style={styles.card}
                            activeOpacity={0.8}
                            onPress={() => setChosen(c.as)}
                            accessibilityRole="button"
                            accessibilityLabel={`${c.title}. ${c.text}`}
                        >
                            <Figure scene={c.scene} bg={c.bg} still={still} />
                            <Text style={styles.cardTitle}>{c.title}</Text>
                            <Text style={styles.cardText}>{c.text}</Text>
                            <View style={styles.go}>
                                <Text style={styles.goText}>Continue</Text>
                                <ChevronRight size={14} color={C.navy} />
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                ))}
            </View>
        </AuthScreen>
    );
}

const styles = StyleSheet.create({
    title: { fontSize: 20, fontWeight: '700', color: C.text, textAlign: 'center', letterSpacing: -0.3 },
    subtitle: { fontSize: 13, color: C.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 16 },
    row: { flexDirection: 'row', gap: 12 },
    cell: { flex: 1 },
    card: {
        flex: 1,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e2e8f0',
        borderRadius: 22,
        backgroundColor: '#ffffff',
        paddingVertical: 14,
        paddingHorizontal: 10,
        shadowColor: '#101a4b',
        shadowOpacity: 0.12,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 3,
    },
    cardTitle: { marginTop: 6, fontSize: 17, fontWeight: '800', color: '#1e2a6b', textTransform: 'uppercase', letterSpacing: 0.5 },
    cardText: { marginTop: 4, fontSize: 11.5, lineHeight: 16, color: C.textMuted, textAlign: 'center', minHeight: 32 },
    go: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 999, backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6 },
    goText: { fontSize: 12, fontWeight: '700', color: C.navy },
});
