import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import { introStore } from './introStore';

// The logo animation shown when the app opens, drawn over the whole app (mounted once in app/_layout.jsx).
// The scan symbol is drawn with Views so it can move: the viewfinder corners snap in like a camera focusing,
// the ring grows into place, the orange dot pops and pulses once, then the "OSA CONNECT" text fades in.
// Then the symbol and text glide into the login page's logo (its spot comes from AuthScreen through
// introStore) while the white background fades away, and the login's own logo takes over in the same place.
// Already logged in (no login page): it fades out instead. Calls onDone when it's gone.

const NAVY = '#101A4B';
const ORANGE = '#FFAC17';
const SIZE = 112; // the symbol's width and height on the opening screen
const k = SIZE / 88; // the logo's drawing units (the brackets span 88)
const STROKE = 6 * k;
const ARM = 29 * k;
const RING = 46 * k;
const DOT = 15 * k;
const TEXT_W = 170;
const TEXT_H = TEXT_W * 450 / 690;
const GAP = 18;

// Where the symbol and the text sit inside the login logo image (osaconnect-logo.png), in the logo's drawing
// units: the image shows x 26-284, y 33-131; the brackets span 32-120 x 37-125; the text image 143-281 x 40-130
const LOGO_W = 258;
const MARK_IN_LOGO = { x: 32 - 26, y: 37 - 33, size: 88 };
const TEXT_IN_LOGO = { x: 143 - 26, y: 40 - 33, w: 138 };

const CORNERS = [
    { key: 'tl', pos: { top: 0, left: 0 }, border: { borderTopWidth: STROKE, borderLeftWidth: STROKE }, dir: [-1, -1] },
    { key: 'tr', pos: { top: 0, right: 0 }, border: { borderTopWidth: STROKE, borderRightWidth: STROKE }, dir: [1, -1] },
    { key: 'br', pos: { bottom: 0, right: 0 }, border: { borderBottomWidth: STROKE, borderRightWidth: STROKE }, dir: [1, 1] },
    { key: 'bl', pos: { bottom: 0, left: 0 }, border: { borderBottomWidth: STROKE, borderLeftWidth: STROKE }, dir: [-1, 1] },
];

// Resolves with the login logo's spot, or null if no login page reports one within `ms` (already logged in)
const waitForTarget = (ms) => new Promise((resolve) => {
    if (introStore.getTarget()) {
        resolve(introStore.getTarget());
        return;
    }
    let unsubscribe = () => {};
    const timer = setTimeout(() => { unsubscribe(); resolve(introStore.getTarget()); }, ms);
    unsubscribe = introStore.subscribe(() => {
        if (introStore.getTarget()) { clearTimeout(timer); unsubscribe(); resolve(introStore.getTarget()); }
    });
});

export default function LogoIntro({ onDone }) {
    const { width: W, height: H } = useWindowDimensions();
    const corners = useState(() => new Animated.Value(0))[0]; // 0 spread out, 1 in place
    const ring = useState(() => new Animated.Value(0))[0];
    const dot = useState(() => new Animated.Value(0))[0];
    const text = useState(() => new Animated.Value(0))[0];
    const backdrop = useState(() => new Animated.Value(1))[0]; // the white background
    const whole = useState(() => new Animated.Value(1))[0]; // everything (fade-out when there's no login page)
    // The glide to the login logo: 0 = opening position, 1 = the login logo's spot
    const move = useState(() => new Animated.Value(0))[0];
    const [path, setPath] = useState(null);

    // Opening layout: the symbol above the text, the pair centred a little above the middle
    const top = (H - 40) / 2 - (SIZE + GAP + TEXT_H) / 2;
    const markStart = { left: (W - SIZE) / 2, top };
    const textStart = { left: (W - TEXT_W) / 2, top: top + SIZE + GAP };

    useEffect(() => {
        let cancelled = false;
        const opening = Animated.sequence([
            Animated.spring(corners, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
            Animated.parallel([
                Animated.timing(ring, { toValue: 1, duration: 380, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
                Animated.sequence([
                    Animated.delay(220),
                    // Pop in, then one soft pulse
                    Animated.timing(dot, { toValue: 1.25, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                    Animated.timing(dot, { toValue: 1, duration: 180, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                ]),
            ]),
            Animated.timing(text, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.delay(350),
        ]);
        const finish = () => {
            if (cancelled) return;
            introStore.finish();
            onDone?.();
        };
        opening.start(async ({ finished }) => {
            if (!finished || cancelled) return;
            const target = await waitForTarget(900);
            if (cancelled) return;
            if (!target) {
                Animated.timing(whole, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(finish);
                return;
            }
            // Centre and size of the symbol and of the text inside the login logo
            const s = target.width / LOGO_W;
            const markSize = MARK_IN_LOGO.size * s;
            const textW = TEXT_IN_LOGO.w * s;
            setPath({
                mark: {
                    dx: target.x + MARK_IN_LOGO.x * s + markSize / 2 - (markStart.left + SIZE / 2),
                    dy: target.y + MARK_IN_LOGO.y * s + markSize / 2 - (markStart.top + SIZE / 2),
                    scale: markSize / SIZE,
                },
                text: {
                    dx: target.x + TEXT_IN_LOGO.x * s + textW / 2 - (textStart.left + TEXT_W / 2),
                    dy: target.y + TEXT_IN_LOGO.y * s + (textW * 450 / 690) / 2 - (textStart.top + TEXT_H / 2),
                    scale: textW / TEXT_W,
                },
            });
            Animated.parallel([
                Animated.timing(move, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
                Animated.timing(backdrop, { toValue: 0, duration: 550, delay: 100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            ]).start(finish);
        });
        return () => { cancelled = true; opening.stop(); };
    // The opening positions only matter at the start; re-running on a size change would restart it
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // translate first, then scale (about the element's own centre)
    const glide = (p) => p ? [
        { translateX: move.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
        { translateY: move.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy] }) },
        { scale: move.interpolate({ inputRange: [0, 1], outputRange: [1, p.scale] }) },
    ] : [];

    return (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: whole }]} accessibilityLabel="OSAConnect: One scan at a time">
            <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdrop }]} />
            <Animated.View style={[styles.mark, markStart, { transform: glide(path?.mark) }]}>
                {CORNERS.map(({ key, pos, border, dir }) => (
                    <Animated.View
                        key={key}
                        style={[styles.corner, pos, border, {
                            opacity: corners.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
                            transform: [
                                { translateX: corners.interpolate({ inputRange: [0, 1], outputRange: [dir[0] * 22, 0] }) },
                                { translateY: corners.interpolate({ inputRange: [0, 1], outputRange: [dir[1] * 22, 0] }) },
                            ],
                        }]}
                    />
                ))}
                <Animated.View style={[styles.ring, { opacity: ring, transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] }]} />
                <Animated.View style={[styles.dot, { transform: [{ scale: dot }] }]} />
            </Animated.View>
            <Animated.View style={[styles.text, textStart, { transform: glide(path?.text) }]}>
                <Animated.Image
                    source={require('../assets/images/osaconnect-wordmark-text.png')}
                    style={[styles.textImage, {
                        opacity: text,
                        transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
                    }]}
                    resizeMode="contain"
                />
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    backdrop: { backgroundColor: '#ffffff' },
    mark: { position: 'absolute', width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
    corner: { position: 'absolute', width: ARM, height: ARM, borderColor: NAVY },
    ring: { position: 'absolute', width: RING, height: RING, borderRadius: RING / 2, borderWidth: 8 * k, borderColor: NAVY },
    dot: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: ORANGE },
    text: { position: 'absolute', width: TEXT_W, height: TEXT_H },
    textImage: { width: TEXT_W, height: TEXT_H },
});
