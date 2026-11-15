import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, Bell, BookOpen, CircleQuestionMark, House, Settings as SettingsIcon, Ticket, User } from 'lucide-react-native';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import api from '../services/api';
import { HomeHeader } from './StudentLook';
import { timeGreeting } from './greeting';
import { buildNotifications, readReminders, readSeen, saveReminders, saveSeen, syncDeadlineReminder, readDataSaver, saveDataSaver, IDLE_REFRESH_MS, SAVER_REFRESH_MS } from './studentNotifications';

// The frame of the student screens (mirrors frontend/src/components/StudentShell.jsx): StudentTopBar (title, a
// back arrow on sub-screens, the notification bell on Home and the Settings button on Profile) and the floating tab
// bar at the bottom (E-Tickets, Home in the middle, Profile; Log out is in Settings).
// The provider sits in app/student/_layout.jsx, so the profile, tickets and notifications are shared.
const ShellContext = createContext(null);
export const useStudentShell = () => useContext(ShellContext);

// Side menu colours (same as the website's --s-accent / --s-warn tokens)
export const shellColors = (isDarkMode) => (isDarkMode
    ? { accent: '#3b82f6', accentSoft: 'rgba(59,130,246,0.16)', warnBg: 'rgba(245,158,11,0.16)', warnText: '#fcd34d', barBg: 'rgba(30,41,59,0.72)', barEdge: 'rgba(255,255,255,0.06)' }
    : { accent: '#1e3a8a', accentSoft: '#e8ecf8', warnBg: '#fef3c7', warnText: '#92400e', barBg: 'rgba(255,255,255,0.7)', barEdge: 'rgba(16,26,75,0.08)' });

// The bottom tab bar: icons only, Home in the middle. A blue circle sits behind the open tab and slides to the next one.
// `also`: the screens under a tab (it stays lit there)
const NAV = [
    { to: '/student/etickets', label: 'E-Tickets', Icon: Ticket },
    { to: '/student/dashboard', label: 'Home', Icon: House, also: ['/student/notifications'] },
    { to: '/student/personal-info', label: 'Profile', Icon: User, also: ['/student/settings', '/student/change-password'] },
];
const TAB_BAR_HEIGHT = 64; // the bar itself, 12 px above the bottom inset; screens leave room for it
const TAB_BAR_SPACE = TAB_BAR_HEIGHT + 20;
// Screens without the tab bar (the scanner takes the whole screen)
const NO_TAB_BAR = ['/student/scan'];
const TAB_CIRCLE = 50;
const HOME = '/student/dashboard';

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
    const [logoutAsk, setLogoutAsk] = useState(null); // null | { timerRunning }
    const [guideAsk, setGuideAsk] = useState(0);
    // "How OSAConnect works" again, from Home's header button (the Home screen opens it). Same as the website.
    const [walkthroughAsk, setWalkthroughAsk] = useState(0);
    // The tab bar's sliding circle: which slot it's on (animated), and how wide a slot is
    const tabPos = useRef(new Animated.Value(0)).current;
    const [slotWidth, setSlotWidth] = useState(0);

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
    const [recordsLoaded, setRecordsLoaded] = useState(false); // false until the first lists arrive
    const takeRecords = useCallback((next) => { recordsAt.current = Date.now(); setRecords(next); setRecordsLoaded(true); }, []);
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
        let running = true; // can't check (offline): keep the warning
        try {
            const { data } = await api.get('/etickets/', { params: { student_id: username } });
            running = Array.isArray(data) && data.some((t) => t.status === 'Ongoing');
        } catch { /* keep the warning */ }
        setLogoutAsk({ timerRunning: running });
    };

    // Tabs and links between student screens. Home stays mounted at the bottom of the stack: going Home goes back
    // to it (instant, nothing reloads) instead of stacking a fresh copy, and the other screens open on top of it,
    // so switching tabs never piles up screens. (In this expo-router, navigate() adds a new screen every time.)
    // Screens that aren't tabs (Settings from Profile, Notifications from the bell) just open on top, so their back
    // arrow returns to where the student was.
    const go = (to) => {
        if (pathname === to) return;
        if (to === HOME) { router.dismissTo(HOME); return; }
        const isTab = NAV.some((t) => t.to === to);
        if (isTab && pathname !== HOME && router.canDismiss()) router.dismissTo(HOME);
        router.push(to);
    };

    const styles = getStyles(colors, sc);
    const tabBar = !NO_TAB_BAR.includes(pathname);
    const tabIndex = NAV.findIndex(({ to, also = [] }) => pathname === to || also.includes(pathname));
    // Slides to the newly opened tab; the first time it just starts there
    const tabPlaced = useRef(false);
    useEffect(() => {
        if (tabIndex < 0) return;
        if (!tabPlaced.current) { tabPlaced.current = true; tabPos.setValue(tabIndex); return; }
        Animated.timing(tabPos, { toValue: tabIndex, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, [tabIndex, tabPos]);
    const value = {
        guideAsk, askGuide: () => setGuideAsk((n) => n + 1),
        walkthroughAsk, askWalkthrough: () => setWalkthroughAsk((n) => n + 1),
        profile, setProfile, records, recordsLoaded, setRecords: takeRecords, reload: load, notifications, unread, seen, markAllRead,
        reminders, setReminders, dataSaver, setDataSaver, openLogout, go,
    };

    return (
        <ShellContext.Provider value={value}>
            {/* The screens end above the tab bar (same background, so the bar still floats) */}
            <View style={{ flex: 1, backgroundColor: colors.background, paddingBottom: tabBar ? TAB_BAR_SPACE + insets.bottom : 0 }}>
                {children}
            </View>
            {tabBar && (
                <View style={[styles.tabBarWrap, { bottom: 12 + insets.bottom }]} pointerEvents="box-none">
                    <View style={styles.tabBar} accessibilityRole="tablist">
                        <View style={styles.tabRow} onLayout={(e) => setSlotWidth(e.nativeEvent.layout.width / NAV.length)}>
                            {/* The sliding circle, centred on the open tab's slot */}
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
                                        {/* The open tab's icon is a little bigger */}
                                        <Icon size={active ? 26 : 22} color={active ? '#ffffff' : colors.textMuted} strokeWidth={active ? 2.4 : 2} />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            )}

            <Modal visible={!!logoutAsk} transparent animationType="none" onRequestClose={() => setLogoutAsk(null)}>
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

/**
 * The top bar of a student screen: a back arrow on sub-screens and the title; on Home the bell with the unread
 * count (it opens the Notifications screen), on Profile the Settings button.
 */
export function StudentTopBar({ title, back }) {
    const { colors, isDarkMode } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const { unread, go, profile, records, askGuide, askWalkthrough } = useStudentShell();
    // "How to serve your hours" is only on the E-Tickets screen (its book icon, top right), not on Home. Same as the website.
    const { user } = useAuth();
    const styles = getStyles(colors, shellColors(isDarkMode));
    // The three tabs (Home, E-Tickets, Profile): a blue gradient header instead of the top bar. Home: "Good evening,
    // Maria!" and the bell; Profile: the Settings button. Same as the website.
    const firstName = profile?.first_name || (profile?.name || user?.name || '').split(' ')[0];
    const hasService = records.tickets.some((t) => t.status === 'Active' || t.status === 'Ongoing');
    const tabHeader = {
        [HOME]: { title: `${timeGreeting()}${firstName ? `, ${firstName}` : ''}!`, line: hasService ? "Let's get those hours done." : "You're all caught up.", action: 'bell' },
        '/student/etickets': { title: 'E-Tickets', line: 'Tap a ticket to see its service log and forms', action: 'guide' },
        '/student/personal-info': { title: 'Profile', line: user?.username ? `Student ID ${user.username}` : '', action: 'settings' },
        // The screens under the tabs: the same header, with a back arrow. Same as the website.
        '/student/notifications': { title: 'Notifications', line: 'Updates on your violations and service hours', back: HOME },
        '/student/settings': { title: 'Settings', line: 'Appearance, reminders and your account', back: '/student/personal-info' },
        '/student/change-password': { title: 'Change password', line: 'Keep your account secure', back: '/student/settings' },
    }[pathname];
    if (tabHeader) {
        return (
            <>
            <HomeHeader isDarkMode={isDarkMode} greeting={tabHeader.title} name={tabHeader.line} left={tabHeader.back ? (
                <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : go(tabHeader.back))} style={{ marginLeft: -8, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Back">
                    <ArrowLeft size={22} color="#ffffff" />
                </TouchableOpacity>
            ) : null} right={tabHeader.action === 'guide' ? (
                <TouchableOpacity onPress={askGuide} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="How to serve your hours">
                    <BookOpen size={21} color="#ffffff" />
                </TouchableOpacity>
            ) : tabHeader.action === 'settings' ? (
                <TouchableOpacity onPress={() => go('/student/settings')} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Settings">
                    <SettingsIcon size={21} color="#ffffff" />
                </TouchableOpacity>
            ) : tabHeader.action === 'bell' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={askWalkthrough} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="How OSAConnect works">
                    <CircleQuestionMark size={21} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => go('/student/notifications')} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`Notifications${unread ? `, ${unread} new` : ''}`}>
                    <Bell size={21} color="#ffffff" />
                    {unread > 0 && (
                        <View style={[styles.bellBadge, { top: 5, right: 4, borderColor: '#162a6e', backgroundColor: '#ef4444' }]}><Text style={styles.bellBadgeText}>{unread > 9 ? '9+' : unread}</Text></View>
                    )}
                </TouchableOpacity>
                </View>
            ) : null} />
            </>
        );
    }
    return (
        <View style={styles.topBar}>
            {back ? (
                <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : go(back))} style={styles.topBtn} accessibilityLabel="Back">
                    <ArrowLeft size={22} color={colors.text} />
                </TouchableOpacity>
            ) : (
                // The OSAConnect mark where the back arrow would be (the admin pages' header has the logo too)
                <View style={styles.topBtn}>
                    <Image source={isDarkMode ? require('../assets/images/osaconnect-icon-dark.png') : require('../assets/images/osaconnect-icon.png')} style={{ width: 32, height: 32 }} fadeDuration={0} accessibilityLabel="OSAConnect" />
                </View>
            )}
            <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
            {/* (Home's bell and Profile's Settings button are in their gradient headers) */}
            <View style={styles.topBtn} />
        </View>
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
    topBar: {
        height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8,
        // See-through, so the screen's soft glows show behind it (the website's frosted bar)
        backgroundColor: sc.barBg, borderBottomWidth: 1, borderBottomColor: sc.barEdge,
    },
    topBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    topTitle: { flex: 1, textAlign: 'center', color: colors.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
    bellBadge: {
        position: 'absolute', top: 5, right: 4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
        backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.card,
    },
    bellBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
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
