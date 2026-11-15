import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { AlertTriangle, ChartPie, House, User } from 'lucide-react-native';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { shellColors } from './StudentShell';

// The frame of the guard and faculty & staff screens (mirrors the website's components/ReporterShell.jsx): the
// floating tab bar at the bottom (Analytics, Home in the middle, Profile), the same look and sliding circle as the
// students' (components/StudentShell.jsx), and the "Log out?" question. The provider sits in app/staff/_layout.jsx.
const ShellContext = createContext({ openLogout: () => {} });
export const useReporterShell = () => useContext(ShellContext);

const HOME = '/staff/dashboard';
const NAV = [
    { to: '/staff/analytics', label: 'Analytics', Icon: ChartPie },
    { to: HOME, label: 'Home', Icon: House },
    { to: '/staff/profile', label: 'Profile', Icon: User },
];
const TAB_BAR_HEIGHT = 64;
export const REPORTER_TAB_SPACE = TAB_BAR_HEIGHT + 20; // room the screens leave for the bar
const NO_TAB_BAR = ['/staff/scan'];
const TAB_CIRCLE = 50;

export function ReporterShellProvider({ children }) {
    const { logout } = useAuth();
    const { isDarkMode, colors } = useTheme();
    const sc = shellColors(isDarkMode);
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const [logoutAsk, setLogoutAsk] = useState(false);
    const tabPos = useRef(new Animated.Value(1)).current;
    const [slotWidth, setSlotWidth] = useState(0);

    // Home (the report form) stays at the bottom of the stack, so a half-filled report survives switching tabs;
    // the other tabs open on top of it (same as the students' tabs)
    const go = (to) => {
        if (pathname === to) return;
        if (to === HOME) { router.dismissTo(HOME); return; }
        if (pathname !== HOME && router.canDismiss()) router.dismissTo(HOME);
        router.push(to);
    };

    const tabBar = !NO_TAB_BAR.includes(pathname);
    const tabIndex = NAV.findIndex(({ to, also = [] }) => pathname === to || also.includes(pathname));
    const tabPlaced = useRef(false);
    useEffect(() => {
        if (tabIndex < 0) return;
        if (!tabPlaced.current) { tabPlaced.current = true; tabPos.setValue(tabIndex); return; }
        Animated.timing(tabPos, { toValue: tabIndex, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, [tabIndex, tabPos]);

    const styles = getStyles(colors, sc);
    return (
        <ShellContext.Provider value={{ openLogout: () => setLogoutAsk(true), go }}>
            <View style={{ flex: 1, backgroundColor: colors.background, paddingBottom: tabBar ? REPORTER_TAB_SPACE + insets.bottom : 0 }}>
                {children}
            </View>
            {tabBar && (
                <View style={[styles.tabBarWrap, { bottom: 12 + insets.bottom }]} pointerEvents="box-none">
                    <View style={styles.tabBar} accessibilityRole="tablist">
                        <View style={styles.tabRow} onLayout={(e) => setSlotWidth(e.nativeEvent.layout.width / NAV.length)}>
                            {slotWidth > 0 && tabIndex >= 0 && (
                                <Animated.View pointerEvents="none" style={[styles.tabCircle, {
                                    left: (slotWidth - TAB_CIRCLE) / 2,
                                    transform: [{ translateX: Animated.multiply(tabPos, slotWidth) }],
                                }]} />
                            )}
                            {NAV.map(({ to, label, Icon, also = [] }) => {
                                const active = pathname === to || also.includes(pathname);
                                return (
                                    <TouchableOpacity key={to} onPress={() => go(to)} style={styles.tab}
                                        accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: active }}>
                                        <Icon size={active ? 26 : 22} color={active ? '#ffffff' : colors.textMuted} strokeWidth={active ? 2.4 : 2} />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            )}

            <Modal visible={logoutAsk} transparent animationType="none" onRequestClose={() => setLogoutAsk(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <AlertTriangle size={22} color={colors.danger} />
                            <Text style={styles.modalTitle}>Log out?</Text>
                        </View>
                        <Text style={styles.modalMessage}>Are you sure you want to log out of your account?</Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setLogoutAsk(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirm} onPress={() => { setLogoutAsk(false); logout(); }}><Text style={styles.modalConfirmText}>Log Out</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ShellContext.Provider>
    );
}

const getStyles = (colors, sc) => StyleSheet.create({
    tabBarWrap: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
    tabBar: {
        width: '100%', maxWidth: 300, height: TAB_BAR_HEIGHT, padding: 6, justifyContent: 'center',
        borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: sc.barEdge,
        shadowColor: '#101a4b', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 12,
    },
    tabRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    tab: { flex: 1, height: TAB_CIRCLE, alignItems: 'center', justifyContent: 'center' },
    tabCircle: {
        position: 'absolute', top: '50%', marginTop: -TAB_CIRCLE / 2, width: TAB_CIRCLE, height: TAB_CIRCLE, borderRadius: TAB_CIRCLE / 2,
        backgroundColor: colors.primary,
        shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4,
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: colors.card, borderRadius: 20, padding: 22, width: '100%', maxWidth: 360 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    modalTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
    modalMessage: { fontSize: 14, color: colors.textMuted, marginBottom: 20, lineHeight: 20 },
    modalActions: { flexDirection: 'row', gap: 10 },
    modalCancel: { flex: 1, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    modalCancelText: { fontWeight: '500', color: colors.textMuted },
    modalConfirm: { flex: 1, padding: 13, borderRadius: 12, backgroundColor: '#e11d48', alignItems: 'center' },
    modalConfirmText: { fontWeight: '600', color: '#fff' },
});
