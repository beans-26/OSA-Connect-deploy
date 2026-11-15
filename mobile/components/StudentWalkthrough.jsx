import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, Animated, Easing } from 'react-native';
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
const ART_MAX_WIDTH = 190;

// A picture layer's motion as an Animated style, from its frames (shared/walkthrough-art.js); progress runs 0 -> 1
// once per loop. Moves are in picture units, scaled to the drawn width. Motion off: the still frame.
export const layerMotion = (anim, progress, scale, still) => {
    const [ox, oy] = anim.origin || [ART_WIDTH / 2, ART_HEIGHT / 2];
    const transformOrigin = `${(ox / ART_WIDTH) * 100}% ${(oy / ART_HEIGHT) * 100}%`;
    if (still) {
        const f = restFrame(anim);
        return { transformOrigin, opacity: f.o, transform: [{ translateX: f.tx * scale }, { translateY: f.ty * scale }, { rotate: `${f.r}deg` }, { scale: f.s }] };
    }
    const frames = anim.frames.map(fullFrame);
    // The native driver can't ease inside interpolate, so the ease-in-out between frames is baked in as extra
    // points (SUBSTEPS per gap, linear in between), the same curve as the website's CSS
    const SUBSTEPS = anim.linear ? 1 : 8;
    const ease = anim.linear ? (t) => t : Easing.inOut(Easing.quad);
    const gaps = frames.length - 1;
    const inputRange = [];
    const points = [];
    for (let i = 0; i < gaps; i += 1) {
        for (let k = 0; k < SUBSTEPS; k += 1) {
            const t = k / SUBSTEPS;
            inputRange.push((i + t) / gaps);
            points.push([frames[i], frames[i + 1], ease(t)]);
        }
    }
    inputRange.push(1);
    points.push([frames[gaps], frames[gaps], 0]);
    const track = (key, map = (v) => v) => progress.interpolate({
        inputRange,
        // Rounded: float noise like 8.9e-16 must not reach the native side as "8.9e-16deg"
        outputRange: points.map(([a, b, e]) => map(Math.round((a[key] + (b[key] - a[key]) * e) * 1000) / 1000)),
    });
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
// the icon bubble pops in (always, whatever the phone's motion setting). firstTime (right after the first
// login): it can't be closed until the last step. Reopened from Help: closes any time.
// The e-ticket's "How to serve your hours" (StudentGuide) uses it too, with its own title, intro, steps (the
// serving ones), last button and an action on one step (open the e-ticket on the forms step).
// paused: hidden for now (e.g. while the e-ticket its button opened is showing), back on the same step after
export default function StudentWalkthrough({ visible, paused = false, firstTime = false, onFinish, onClose, title = guide.title, intro = guide.intro, steps = guide.steps, finishLabel = 'I understand', stepAction }) {
    const { colors, isDarkMode } = useTheme();
    const [step, setStep] = useState(0);
    const [artWidth, setArtWidth] = useState(ART_MAX_WIDTH);
    // Always animated, whatever the phone's motion setting ("Remove animations", battery saver): asked for 2026-11
    const reduceMotion = false;
    const [textHeights, setTextHeights] = useState({}); // each step's words, measured: the box fits the tallest
    const slide = useRef(new Animated.Value(1)).current; // 0 -> 1 as a step comes in
    const dir = useRef(1); // 1 = came from Next, -1 = from Back
    const pop = useRef(new Animated.Value(1)).current;
    const last = step === steps.length - 1;

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
            // JavaScript-driven: Android's native animation engine (release APK) silently skipped these loops
            // (many keyframes, rotation strings, a custom pivot), so the people stood still. The pictures are small.
            Animated.timing(clocks[i], { toValue: 1, duration: l.anim.duration, easing: Easing.linear, useNativeDriver: false }),
        )).filter(Boolean);
        loops.forEach((loop) => loop.start());
        return () => loops.forEach((loop) => loop.stop());
    }, [art, clocks, visible, reduceMotion]);

    if (!visible || paused) return null;
    const Icon = ICONS[s.icon] || BadgeCheck;
    const textMax = Math.max(0, ...Object.values(textHeights));
    // A step's title, words and (on its step) the action button; live: the one shown, the others only measure
    const stepWords = (st, live) => (
        <>
            <Text accessibilityRole={live ? 'header' : undefined} style={{ marginTop: 2, fontSize: 18, fontWeight: '700', color: colors.text }}>{st.title}</Text>
            <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 20, color: colors.text }}>{st.text}</Text>
            {stepAction && stepAction.scene === st.scene && (
                <TouchableOpacity onPress={live ? stepAction.onPress : undefined} disabled={!live} accessibilityRole="button"
                    style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, backgroundColor: AMBER, padding: 12 }}>
                    {stepAction.Icon && <stepAction.Icon size={18} color="#fff" />}
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{stepAction.label}</Text>
                </TouchableOpacity>
            )}
        </>
    );
    const go = (to) => { dir.current = to > step ? 1 : -1; setStep(to); };
    const next = () => (last ? (onFinish || onClose)() : go(step + 1));
    const iconColor = hl ? '#d97706' : last ? '#10b981' : (isDarkMode ? '#60a5fa' : '#1e3a8a');
    const artHeight = (artWidth * ART_HEIGHT) / ART_WIDTH;
    const layer = { position: 'absolute', left: 0, top: 0, width: artWidth, height: artHeight };

    return (
        <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={firstTime ? () => {} : onClose}>
            <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 }}>
                <View style={{ maxHeight: '100%', width: '100%', maxWidth: 380, alignSelf: 'center', backgroundColor: colors.card, borderRadius: 24, overflow: 'hidden' }}>
                    {!firstTime && (
                        <TouchableOpacity onPress={onClose} accessibilityLabel="Close" hitSlop={8}
                            style={{ position: 'absolute', right: 12, top: 12, zIndex: 1, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                            <X size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}

                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 6 }} bounces={false}>
                        <Text style={{ paddingRight: 40, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', color: colors.primary }}>{title}</Text>
                        {/* On every step (it used to show on the first only, so the box shrank after it) */}
                        {!!intro && <Text style={{ marginTop: 4, paddingRight: 40, fontSize: 14, lineHeight: 20, color: colors.textMuted }}>{intro}</Text>}

                        <Animated.View style={{
                            marginTop: 12, borderRadius: 16, padding: 16,
                            backgroundColor: hl ? (isDarkMode ? 'rgba(245,158,11,0.12)' : '#fffbeb') : colors.background,
                            // The highlighted step's border is on every step (see-through), so it doesn't add 4 px
                            borderWidth: 2, borderColor: hl ? AMBER : 'transparent',
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
                            <Text style={{ marginTop: 8, fontSize: 12, fontWeight: '600', color: colors.textMuted }}>Step {step + 1} of {steps.length}</Text>
                            {/* At least as tall as the longest step (measured below, out of sight), so the box doesn't
                                change size on Next / Back */}
                            <View style={{ minHeight: textMax }}>
                                {stepWords(s, true)}
                                <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
                                    style={{ position: 'absolute', left: 0, right: 0, top: 0, opacity: 0 }}>
                                    {steps.map((st, i) => (
                                        <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: 0 }}
                                            onLayout={(e) => { const h = Math.ceil(e.nativeEvent.layout.height); setTextHeights((prev) => (prev[i] === h ? prev : { ...prev, [i]: h })); }}>
                                            {stepWords(st, false)}
                                        </View>
                                    ))}
                                </View>
                            </View>
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

                    <View style={{ flexDirection: 'row', gap: 8, padding: 14, borderTopWidth: 1, borderTopColor: colors.border }}>
                        {step > 0 && (
                            <TouchableOpacity onPress={() => go(step - 1)} accessibilityRole="button"
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 12 }}>
                                <ChevronLeft size={18} color={colors.text} />
                                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Back</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={next} accessibilityRole="button"
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 14, backgroundColor: colors.primary, paddingVertical: 12, borderWidth: 1, borderColor: 'transparent' /* as tall as Back */ }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{last ? finishLabel : 'Next'}</Text>
                            {!last && <ChevronRight size={18} color="#fff" />}
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
}
