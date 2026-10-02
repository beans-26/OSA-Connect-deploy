import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, AppState, BackHandler, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, Bell, BellOff, House, LogOut, Menu, SlidersHorizontal, User, X } from 'lucide-react-native';
import NotificationItem from './NotificationItem';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import api from '../services/api';
import { buildNotifications, hoursLabel, readReminders, readSeen, remainingHours, saveReminders, saveSeen, syncDeadlineReminder, readDataSaver, saveDataSaver, IDLE_REFRESH_MS, SAVER_REFRESH_MS } from './studentNotifications';

// The frame of the student screens (mirrors frontend/src/components/StudentShell.jsx): StudentTopBar (menu,
// title, notification bell) and the side menu (Home, Personal Info, Notifications, Settings, Log out).
// The provider sits in app/student/_layout.jsx, so the profile, tickets and notifications are shared.
const ShellContext = createContext(null);
export const useStudentShell = () => useContext(ShellContext);

// Side menu colours (same as the website's --s-accent / --s-warn tokens)
export const shellColors = (isDarkMode) => (isDarkMode
    ? { accent: '#3b82f6', accentSoft: 'rgba(59,130,246,0.16)', warnBg: 'rgba(245,158,11,0.16)', warnText: '#fcd34d' }
    : { accent: '#2563eb', accentSoft: '#eef2ff', warnBg: '#fef3c7', warnText: '#92400e' });

const NAV = [
    { to: '/student/dashboard', label: 'Home', Icon: House },
    { to: '/student/personal-info', label: 'Personal Info', Icon: User },
    { to: '/student/notifications', label: 'Notifications', Icon: Bell, badge: true },
    { to: '/student/settings', label: 'Settings', Icon: SlidersHorizontal },
];
const MENU_WIDTH = 280;

const initials = (name = '') => {
    const words = name.split(/\s+/).filter(Boolean);
    return ((words[0]?.[0] || '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase() || '?';
};

export function StudentShellProvider({ children }) {
    const { user, logout } = useAuth();
    const { isDarkMode, colors } = useTheme();
    const sc = shellColors(isDarkMode);
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const [profile, setProfile] = useState(null);
    const [records, setRecords] = useState({ violations: [], tickets: [] });
    const [reminders, setRemindersState] = useState(true);
    const [dataSaver, setDataSaverState] = useState(true);
    const [seen, setSeen] = useState(new Set());
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuShown, setMenuShown] = useState(false); // stays true while the close animation runs
    const [logoutAsk, setLogoutAsk] = useState(null); // null | { timerRunning }
    const slide = useRef(new Animated.Value(0)).current;

    const username = user?.username;
    useEffect(() => {
        if (!username) return;
        readSeen(username).then(setSeen);
        readReminders().then(setRemindersState);
        readDataSaver().then(setDataSaverState);
        api.get(`/students/${username}/`).then(({ data }) => setProfile(data)).catch(() => {});
    }, [username]);

    // The dashboard loads the same lists and hands them over (setRecords): no second download within 25 s
    const recordsAt = useRef(0);
    const takeRecords = useCallback((next) => { recordsAt.current = Date.now(); setRecords(next); }, []);
    const load = useCallback(async () => {
        if (!username || Date.now() - recordsAt.current < 25000 || AppState.currentState !== 'active') return;
        try {
            const [v, t] = await Promise.all([
                api.get('/violations/', { params: { student_id: username } }),
                api.get('/etickets/', { params: { student_id: username, t: Date.now() } }),
            ]);
            takeRecords({
                violations: (v.data || []).filter((x) => x.student_details?.student_id === username),
                tickets: (t.data || []).filter((x) => x.violation_details?.student_details?.student_id === username),
            });
        } catch { /* offline: keep the last lists */ }
    }, [username]);
    useEffect(() => {
        load();
        const timer = setInterval(load, dataSaver ? SAVER_REFRESH_MS : IDLE_REFRESH_MS);
        return () => clearInterval(timer);
    }, [load, dataSaver]);

    // Reschedule the 6 AM phone reminder when anything it depends on changes
    const reminderKey = records.tickets.map((t) => `${t.id}:${t.status}:${t.served_today}`).join('|');
    useEffect(() => { syncDeadlineReminder(records.tickets, reminders); }, [reminderKey, reminders]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (menuOpen) setMenuShown(true);
        // Eases out when opening (fast start, soft landing) and slightly quicker on the way back
        Animated.timing(slide, { toValue: menuOpen ? 1 : 0, duration: menuOpen ? 300 : 230, easing: menuOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
            if (!menuOpen) setMenuShown(false);
        });
    }, [menuOpen, slide]);
    useEffect(() => { setMenuOpen(false); }, [pathname]);
    useEffect(() => {
        if (!menuOpen) return undefined;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => { setMenuOpen(false); return true; });
        return () => sub.remove();
    }, [menuOpen]);

    const notifications = buildNotifications(records.violations, records.tickets, { reminders });
    const unread = notifications.filter((n) => !seen.has(n.id)).length;
    const markAllRead = useCallback(() => {
        if (notifications.every((n) => seen.has(n.id))) return;
        const next = new Set([...seen, ...notifications.map((n) => n.id)]);
        setSeen(next);
        saveSeen(username, next);
    }, [notifications, seen, username]);
    const setReminders = (on) => { setRemindersState(on); saveReminders(on); };
    const setDataSaver = (on) => { setDataSaverState(on); saveDataSaver(on); };

    const openLogout = async () => {
        setMenuOpen(false);
        let running = true; // can't check (offline): keep the warning
        try {
            const { data } = await api.get('/etickets/', { params: { student_id: username } });
            running = Array.isArray(data) && data.some((t) => t.status === 'Ongoing');
        } catch { /* keep the warning */ }
        setLogoutAsk({ timerRunning: running });
    };

    const go = (to) => {
        setMenuOpen(false);
        if (pathname !== to) router.navigate(to);
    };

    const left = remainingHours(records.tickets);
    const name = profile?.name || user?.name || 'Student';
    const styles = getStyles(colors, sc);
    const value = {
        profile, setProfile, records, setRecords: takeRecords, reload: load, notifications, unread, seen, markAllRead,
        reminders, setReminders, dataSaver, setDataSaver, openLogout, openMenu: () => setMenuOpen(true), go,
    };

    return (
        <ShellContext.Provider value={value}>
            <View style={{ flex: 1 }}>
                {children}
                {menuShown && (
                    <View style={StyleSheet.absoluteFill}>
                        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: slide }]}>
                            <Pressable style={{ flex: 1 }} onPress={() => setMenuOpen(false)} accessibilityLabel="Close menu" />
                        </Animated.View>
                        <Animated.View
                            accessibilityViewIsModal
                            style={[styles.menu, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 8, transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [-MENU_WIDTH - 20, 0] }) }] }]}
                        >
                            <View style={styles.profileRow}>
                                <View style={styles.avatar}><Text style={styles.avatarText}>{initials(name)}</Text></View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={styles.name} numberOfLines={1}>{name}</Text>
                                    <Text style={styles.studentId} numberOfLines={1}>{username}</Text>
                                </View>
                                <TouchableOpacity onPress={() => setMenuOpen(false)} style={styles.closeBtn} accessibilityLabel="Close menu">
                                    <X size={20} color={colors.textMuted} />
                                </TouchableOpacity>
                            </View>
                            {left > 0.001 && (
                                <View style={styles.chip}><Text style={styles.chipText}>{hoursLabel(left)} of service remaining</Text></View>
                            )}
                            <View style={{ paddingHorizontal: 8, marginTop: 4 }}>
                                {NAV.map(({ to, label, Icon, badge }) => {
                                    const active = pathname === to || (to === '/student/settings' && pathname === '/student/change-password');
                                    return (
                                        <TouchableOpacity key={to} onPress={() => go(to)} style={[styles.navItem, active && styles.navItemActive]} accessibilityRole="button" accessibilityState={{ selected: active }}>
                                            <Icon size={20} color={active ? sc.accent : colors.text} strokeWidth={active ? 2.3 : 2} />
                                            <Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text>
                                            {badge && unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unread}</Text></View>}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            <TouchableOpacity onPress={openLogout} style={styles.logoutRow} accessibilityRole="button">
                                <LogOut size={18} color={colors.danger} />
                                <Text style={styles.logoutText}>Log out</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                )}
            </View>

            <Modal visible={!!logoutAsk} transparent animationType="fade" onRequestClose={() => setLogoutAsk(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <AlertTriangle size={22} color={colors.danger} />
                            <Text style={styles.modalTitle}>Log out?</Text>
                        </View>
                        <Text style={styles.modalMessage}>{logoutAsk?.timerRunning ? 'Your running service timer will stop.' : 'Are you sure you want to log out of your account?'}</Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setLogoutAsk(null)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirm} onPress={() => { setLogoutAsk(null); logout(); }}><Text style={styles.modalConfirmText}>Log Out</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ShellContext.Provider>
    );
}

/** The top bar of a student screen: menu (or back), the title, and the bell with the unread count. */
/**
 * The top bar of a student screen: menu (or back), the title, and the bell with the unread count. The bell
 * opens a small panel with the latest notifications (the full list is on the Notifications screen, which
 * has no bell).
 */
export function StudentTopBar({ title, back }) {
    const { colors, isDarkMode } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const { unread, openMenu, go, notifications, seen, markAllRead } = useStudentShell();
    const [bellNew, setBellNew] = useState(null); // null = closed, else the ids that were new when it opened
    const bellAnim = useRef(new Animated.Value(0)).current;
    const styles = getStyles(colors, shellColors(isDarkMode));
    // Fades and drops in from the bell; fades back out before the panel closes
    const openBell = () => {
        setBellNew(new Set(notifications.filter((n) => !seen.has(n.id)).map((n) => n.id)));
        markAllRead();
        bellAnim.setValue(0);
        Animated.timing(bellAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    };
    const closeBell = (then) => {
        Animated.timing(bellAnim, { toValue: 0, duration: 160, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
            setBellNew(null);
            then?.();
        });
    };
    return (
        <View style={styles.topBar}>
            {back ? (
                <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : go(back))} style={styles.topBtn} accessibilityLabel="Back">
                    <ArrowLeft size={22} color={colors.text} />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity onPress={openMenu} style={styles.topBtn} accessibilityLabel="Open menu">
                    <Menu size={22} color={colors.text} />
                </TouchableOpacity>
            )}
            <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
            {pathname === '/student/notifications' ? <View style={styles.topBtn} /> : (
                <TouchableOpacity onPress={openBell} style={styles.topBtn} accessibilityLabel={`Notifications${unread ? `, ${unread} new` : ''}`}>
                    <Bell size={21} color={colors.text} />
                    {unread > 0 && (
                        <View style={styles.bellBadge}><Text style={styles.bellBadgeText}>{unread > 9 ? '9+' : unread}</Text></View>
                    )}
                </TouchableOpacity>
            )}

            <Modal visible={!!bellNew} transparent animationType="none" onRequestClose={() => closeBell()}>
                <Pressable style={StyleSheet.absoluteFill} onPress={() => closeBell()} accessibilityLabel="Close notifications" />
                <Animated.View style={[styles.bellPanel, { top: insets.top + 52, opacity: bellAnim, transform: [{ translateY: bellAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }, { scale: bellAnim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }] }]}>
                    <Text style={styles.bellPanelTitle}>Notifications</Text>
                    {notifications.length === 0 ? (
                        <View style={styles.bellEmpty}>
                            <BellOff size={26} color={colors.textMuted} />
                            <Text style={styles.bellEmptyText}>No notifications yet.</Text>
                        </View>
                    ) : (
                        <ScrollView style={{ maxHeight: 380 }}>
                            {notifications.slice(0, 5).map((n, i) => <NotificationItem key={n.id} n={n} first={i === 0} fresh={bellNew?.has(n.id)} compact />)}
                        </ScrollView>
                    )}
                    {notifications.length > 0 && (
                        <TouchableOpacity style={styles.bellSeeAll} onPress={() => closeBell(() => go('/student/notifications'))} accessibilityRole="button">
                            <Text style={styles.bellSeeAllText}>See all notifications{notifications.length > 5 ? ` (${notifications.length})` : ''}</Text>
                        </TouchableOpacity>
                    )}
                </Animated.View>
            </Modal>
        </View>
    );
}

const getStyles = (colors, sc) => StyleSheet.create({
    backdrop: { backgroundColor: 'rgba(0,0,0,0.4)' },
    menu: {
        position: 'absolute', top: 0, bottom: 0, left: 0, width: MENU_WIDTH, maxWidth: '82%',
        backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 16,
    },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: sc.accent, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    name: { color: colors.text, fontWeight: '700', fontSize: 15 },
    studentId: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    chip: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, backgroundColor: sc.warnBg, paddingHorizontal: 12, paddingVertical: 8 },
    chipText: { color: sc.warnText, fontWeight: '700', fontSize: 12 },
    navItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 12, paddingVertical: 13, borderRadius: 12, marginBottom: 2 },
    navItemActive: { backgroundColor: sc.accentSoft },
    navText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '500' },
    navTextActive: { color: sc.accent, fontWeight: '700' },
    badge: { backgroundColor: colors.danger, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    badgeText: { color: '#fff', fontWeight: '700', fontSize: 11 },
    logoutRow: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16 },
    logoutText: { color: colors.danger, fontSize: 15, fontWeight: '500' },
    topBar: {
        height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8,
        backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    topBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    topTitle: { flex: 1, textAlign: 'center', color: colors.text, fontSize: 17, fontWeight: '700' },
    bellBadge: {
        position: 'absolute', top: 5, right: 4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
        backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.card,
    },
    bellBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    bellPanel: {
        position: 'absolute', right: 8, width: 340, maxWidth: '94%', backgroundColor: colors.card, borderRadius: 16,
        borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
        shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12,
    },
    bellPanelTitle: { paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, fontWeight: '700', color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.border },
    bellEmpty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
    bellEmptyText: { fontSize: 12, color: colors.textMuted },
    bellSeeAll: { paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border },
    bellSeeAllText: { fontSize: 14, fontWeight: '600', color: sc.accent },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: colors.card, borderRadius: 20, padding: 22, width: '100%', maxWidth: 360 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
    modalMessage: { fontSize: 14, color: colors.textMuted, marginBottom: 20, lineHeight: 20 },
    modalActions: { flexDirection: 'row', gap: 10 },
    modalCancel: { flex: 1, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    modalCancelText: { fontWeight: '600', color: colors.textMuted },
    modalConfirm: { flex: 1, padding: 13, borderRadius: 12, backgroundColor: '#e11d48', alignItems: 'center' },
    modalConfirmText: { fontWeight: '700', color: '#fff' },
});
