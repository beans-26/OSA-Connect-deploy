import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, Animated, Easing, AccessibilityInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { BadgeCheck, ChevronLeft, ChevronRight, FileDown, LocateFixed, Mail, MapPin, QrCode, Repeat, Scale, ScanLine, Ticket, X } from 'lucide-react-native';
import { useTheme } from './ThemeContext';
// Same steps and pictures as the website (frontend/src/components/StudentWalkthrough.jsx)
import help from '../../shared/help-content.json';
import { walkthroughScene, fullFrame, restFrame, ART_WIDTH, ART_HEIGHT } from '../../shared/walkthrough-art';

const guide = help.student.walkthrough;
const ICONS = { BadgeCheck, FileDown, LocateFixed, Mail, MapPin, QrCode, Repeat, Scale, ScanLine, Ticket };
const AMBER = '#f59e0b';
const ART_MAX_WIDTH = 260;

// A picture layer's motion as an Animated style, from its frames (shared/walkthrough-art.js); progress runs 0 -> 1
// once per loop. Moves are in picture units, scaled to the drawn width. Motion off: the still frame.
const layerMotion = (anim, progress, scale, still) => {
    const [ox, oy] = anim.origin || [ART_WIDTH / 2, ART_HEIGHT / 2];
    const transformOrigin = `${(ox / ART_WIDTH) * 100}% ${(oy / ART_HEIGHT) * 100}%`;
    if (still) {
        const f = restFrame(anim);
        return { transformOrigin, opacity: f.o, transform: [{ translateX: f.tx * scale }, { translateY: f.ty * scale }, { rotate: `${f.r}deg` }, { scale: f.s }] };
    }
    const frames = anim.frames.map(fullFrame);
    const inputRange = frames.map((_, i) => i / (frames.length - 1));
    const easing = anim.linear ? undefined : Easing.inOut(Easing.quad);
    const track = (key, map = (v) => v) => progress.interpolate({ inputRange, outputRange: frames.map((f) => map(f[key])), easing });
    return {
        transformOrigin,
        opacity: track('o'),
        transform: [
            { translateX: track('tx', (v) => v * scale) },
            { translateY: track('ty', (v) => v * scale) },
            { rotate: track('r', (v) => `${v}deg`) },
            { scale: track('s') },
        ],
    };
};

// "How OSAConnect works": what happens if the student gets a violation, one step per screen, each with a
// picture of a student doing it. Each step slides in from the side it comes from, the people act the step out and
// the icon bubble pops in (all off when the phone's Reduce motion is on). firstTime (right after the first
// login): it can't be closed until the last step. Reopened from Help: closes any time.
export default function StudentWalkthrough({ visible, firstTime = false, onFinish, onClose }) {
    const { colors, isDarkMode } = useTheme();
    const [step, setStep] = useState(0);
    const [artWidth, setArtWidth] = useState(ART_MAX_WIDTH);
    const [reduceMotion, setReduceMotion] = useState(false);
    const slide = useRef(new Animated.Value(1)).current; // 0 -> 1 as a step comes in
    const dir = useRef(1); // 1 = came from Next, -1 = from Back
    const pop = useRef(new Animated.Value(1)).current;
    const steps = guide.steps;
    const last = step === steps.length - 1;

    useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
        const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
        return () => sub?.remove?.();
    }, []);

    useEffect(() => { if (visible) { dir.current = 1; setStep(0); } }, [visible]);

    // Each new step: slide in, then pop the bubble
    useEffect(() => {
        if (!visible) return;
        if (reduceMotion) { slide.setValue(1); pop.setValue(1); return; }
        slide.setValue(0);
        pop.setValue(0);
        Animated.parallel([
            Animated.timing(slide, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.spring(pop, { toValue: 1, delay: 150, friction: 5, tension: 120, useNativeDriver: true }),
        ]).start();
    }, [step, visible, reduceMotion, slide, pop]);

    // The step's picture, and one looping clock per moving layer in it
    const s = steps[Math.min(step, steps.length - 1)];
    const hl = !!s.highlight;
    const art = useMemo(() => walkthroughScene(s.scene, {
        bg: hl ? (isDarkMode ? '#78350f' : '#fde68a') : (isDarkMode ? '#1e3a8a' : '#dbeafe'),
        ring: isDarkMode ? '#1e293b' : '#ffffff',
    }), [s.scene, hl, isDarkMode]);
    const clocks = useMemo(() => art.layers.map((l) => (l.anim ? new Animated.Value(0) : null)), [art]);
    useEffect(() => {
        if (!visible || reduceMotion) return undefined;
        const loops = art.layers.map((l, i) => l.anim && Animated.loop(
            Animated.timing(clocks[i], { toValue: 1, duration: l.anim.duration, easing: Easing.linear, useNativeDriver: true }),
        )).filter(Boolean);
        loops.forEach((loop) => loop.start());
        return () => loops.forEach((loop) => loop.stop());
    }, [art, clocks, visible, reduceMotion]);

    if (!visible) return null;
    const Icon = ICONS[s.icon] || BadgeCheck;
    const go = (to) => { dir.current = to > step ? 1 : -1; setStep(to); };
    const next = () => (last ? (onFinish || onClose)() : go(step + 1));
    const iconColor = hl ? '#d97706' : last ? '#10b981' : (isDarkMode ? '#60a5fa' : '#1e3a8a');
    const artHeight = (artWidth * ART_HEIGHT) / ART_WIDTH;
    const layer = { position: 'absolute', left: 0, top: 0, width: artWidth, height: artHeight };

    return (
        <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={firstTime ? () => {} : onClose}>
            <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 }}>
                <View style={{ maxHeight: '100%', backgroundColor: colors.card, borderRadius: 24, overflow: 'hidden' }}>
                    {!firstTime && (
                        <TouchableOpacity onPress={onClose} accessibilityLabel="Close" hitSlop={8}
                            style={{ position: 'absolute', right: 12, top: 12, zIndex: 1, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                            <X size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}

                    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 8 }} bounces={false}>
                        <Text style={{ paddingRight: 40, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: colors.primary }}>{guide.title}</Text>
                        {step === 0 && <Text style={{ marginTop: 4, paddingRight: 40, fontSize: 14, lineHeight: 20, color: colors.textMuted }}>{guide.intro}</Text>}

                        <Animated.View style={{
                            marginTop: 16, borderRadius: 16, padding: 20,
                            backgroundColor: hl ? (isDarkMode ? 'rgba(245,158,11,0.12)' : '#fffbeb') : colors.background,
                            borderWidth: hl ? 2 : 0, borderColor: AMBER,
                            opacity: slide,
                            transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [36 * dir.current, 0] }) }],
                        }}>
                            {/* The picture: a student (and a guard on step 1), with the step's icon in the speech bubble */}
                            <View
                                onLayout={(e) => setArtWidth(Math.min(ART_MAX_WIDTH, e.nativeEvent.layout.width))}
                                style={{ width: '100%', alignItems: 'center' }}
                                accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                                <View style={{ width: artWidth, height: artHeight }}>
                                    {art.layers.map((l, i) => (l.anim ? (
                                        <Animated.View key={`${s.scene}-${i}`} style={[layer, layerMotion(l.anim, clocks[i], artWidth / ART_WIDTH, reduceMotion)]}>
                                            <SvgXml xml={l.svg} width={artWidth} height={artHeight} />
                                        </Animated.View>
                                    ) : (
                                        <View key={`${s.scene}-${i}`} style={layer}><SvgXml xml={l.svg} width={artWidth} height={artHeight} /></View>
                                    )))}
                                    <Animated.View style={[layer, { opacity: pop.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }), transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]}>
                                        <SvgXml xml={art.front} width={artWidth} height={artHeight} />
                                        <View style={{ position: 'absolute', left: (art.bubble.left / 100) * artWidth - 12, top: (art.bubble.top / 100) * artHeight - 12 }}>
                                            <Icon size={24} color={iconColor} strokeWidth={2.25} />
                                        </View>
                                    </Animated.View>
                                </View>
                            </View>
                            <Text style={{ marginTop: 12, fontSize: 12, fontWeight: '700', color: colors.textMuted }}>Step {step + 1} of {steps.length}</Text>
                            <Text accessibilityRole="header" style={{ marginTop: 2, fontSize: 20, fontWeight: '800', color: colors.text }}>{s.title}</Text>
                            <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 23, color: colors.text }}>{s.text}</Text>
                        </Animated.View>

                        {/* Progress dots */}
                        <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                            {steps.map((_, i) => (
                                <View key={i} style={{
                                    height: 6, borderRadius: 3, width: i === step ? 20 : 6,
                                    backgroundColor: i <= step ? colors.primary : colors.border,
                                    opacity: i < step ? 0.5 : 1,
                                }} />
                            ))}
                        </View>
                    </ScrollView>

                    <View style={{ flexDirection: 'row', gap: 8, padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                        {step > 0 && (
                            <TouchableOpacity onPress={() => go(step - 1)} accessibilityRole="button"
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 12 }}>
                                <ChevronLeft size={18} color={colors.text} />
                                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Back</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={next} accessibilityRole="button"
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 14, backgroundColor: colors.primary, paddingVertical: 12 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{last ? 'I understand' : 'Next'}</Text>
                            {!last && <ChevronRight size={18} color="#fff" />}
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
}
