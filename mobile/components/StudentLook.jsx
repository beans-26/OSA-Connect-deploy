import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

// The look of the student screens (mirrors the website's .student-backdrop, .s-card and .s-hero in
// frontend/src/index.css): a plain white background, cards with a soft shadow, and gradient headers.
// Only colours and shadows: the screens' layout stays the same.

/** The plain background of a student screen: white (dark mode: the screen's own dark background). Put it first
    inside the screen's root view. Same as the website. */
export function StudentBackdrop({ isDarkMode }) {
    if (isDarkMode) return null;
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff' }]} pointerEvents="none" />;
}

const HERO = {
    blue: ['#0f1a4a', '#1e3a8a'],
    live: ['#047857', '#10b981'],
    away: ['#b91c1c', '#ef4444'],
};
const heroXml = ([from, to]) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><defs>`
    + `<linearGradient id="h" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>`
    + `</defs><rect width="100" height="100" fill="url(#h)"/></svg>`;
const HERO_XML = Object.fromEntries(Object.entries(HERO).map(([k, v]) => [k, heroXml(v)]));

/**
 * A gradient header across the top of a card (the admin "Today's Activity" look): an icon chip, a title and a
 * subtitle, and something on the right (a pill). `inset` is the card's padding, so it reaches the card's edges.
 */
export function HeroHeader({ variant = 'blue', Icon, title, subtitle, right, inset = 16 }) {
    return (
        <View style={{ marginHorizontal: -inset, marginTop: -inset, marginBottom: 12, paddingHorizontal: inset, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <SvgXml xml={HERO_XML[variant] || HERO_XML.blue} width="100%" height="100%" />
            </View>
            {Icon && (
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={20} color="#ffffff" />
                </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: '#ffffff', fontSize: 14, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>{title}</Text>
                {!!subtitle && <Text numberOfLines={1} style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500', marginTop: 1 }}>{subtitle}</Text>}
            </View>
            {right}
        </View>
    );
}

/** A pill on a gradient header ("Not timed in"). */
export function HeroPill({ children }) {
    return (
        <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
            <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '600' }}>{children}</Text>
        </View>
    );
}

/** The cards' soft shadow and light edge (the website's .s-card). */
export const cardLook = (isDarkMode) => ({
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#eef2f7',
    shadowColor: '#101a4b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: isDarkMode ? 0.4 : 0.14,
    shadowRadius: 18,
    elevation: 5,
});

// Home's header: a blue gradient with soft light spots and rounded bottom corners (the website's Home header)
const homeHeroXml = (dark) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><defs>`
    + `<linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${dark ? '#0b1338' : '#0f1a4a'}"/>`
    + `<stop offset="0.5" stop-color="${dark ? '#122159' : '#162a6e'}"/><stop offset="1" stop-color="${dark ? '#1a3278' : '#1e3a8a'}"/></linearGradient>`
    + `<radialGradient id="w" cx="0.95" cy="0" r="0.55"><stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="o" cx="0.25" cy="1.1" r="0.5"><stop offset="0" stop-color="#ffac17" stop-opacity="0.2"/><stop offset="1" stop-color="#ffac17" stop-opacity="0"/></radialGradient>`
    + `</defs><rect width="100" height="100" fill="url(#b)"/><rect width="100" height="100" fill="url(#w)"/><rect width="100" height="100" fill="url(#o)"/></svg>`;
const HOME_HERO = { light: homeHeroXml(false), dark: homeHeroXml(true) };

/** The student screens' header: a title, a line under it, something on the left (a back arrow) and on the right. */
export function HomeHeader({ isDarkMode, greeting, name, left, right }) {
    return (
        <View style={{ borderBottomLeftRadius: 20, borderBottomRightRadius: 20, overflow: 'hidden', shadowColor: '#0f1a4a', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 18, elevation: 8 }}>
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <SvgXml xml={isDarkMode ? HOME_HERO.dark : HOME_HERO.light} width="100%" height="100%" />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 }}>
                {left}
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text accessibilityRole="header" numberOfLines={1} style={{ color: '#ffffff', fontSize: 20, fontWeight: '600', letterSpacing: -0.2 }}>{greeting}</Text>
                    {!!name && <Text numberOfLines={1} style={{ marginTop: 1, color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500' }}>{name}</Text>}
                </View>
                {right}
            </View>
        </View>
    );
}
