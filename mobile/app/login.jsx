import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { User, Lock, Eye, EyeOff, ChevronRight, ArrowLeft, Check } from 'lucide-react-native';
import { useAuth } from '../components/AuthContext';
import AuthScreen, { authColors as C, authStyles as A } from '../components/AuthScreen';
import api, { API_URL } from '../services/api';

// The website, for the faculty pages the app doesn't have (sign up, forgot password)
const SITE = /^https:/.test(API_URL) ? API_URL.replace(/\/api\/?$/, '') : 'https://osaconnect.vercel.app';
const ROLE_SIDE = { student: 'student', staff: 'faculty', guard: 'faculty' };
// "Remember me": the student ID or faculty email (never the password) kept on this phone and filled in next time
const REMEMBER_KEYS = { student: 'remembered-student-id', faculty: 'remembered-faculty-login' };

// Guards can only log in on campus (backend login_view): the phone's location goes with the login. Resolves
// { lat, lng, accuracy }, or rejects with a message to show. Quick by default: the phone's last position from the
// last 2 minutes, else a Wi-Fi / cell fix (enough for the 400 m campus circle). precise: wait for GPS (slow indoors).
const currentLocation = async (precise = false) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
        throw new Error('Location access is off. Guards can only log in on campus: allow location for OSAConnect, then log in again.');
    }
    const asPoint = ({ coords }) => ({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy });
    try {
        if (!precise) {
            const last = await Location.getLastKnownPositionAsync({ maxAge: 120000, requiredAccuracy: 100 }).catch(() => null);
            if (last) return asPoint(last);
        }
        return asPoint(await Location.getCurrentPositionAsync({ accuracy: precise ? Location.Accuracy.High : Location.Accuracy.Balanced }));
    } catch {
        throw new Error("Couldn't get your location. Turn on location (GPS) and try again.");
    }
};

// The guard usernames that logged in on this phone: their location is found before the first login request
// (one request, no second round trip). Lowercase.
const GUARDS_KEY = 'guard-logins';
const readGuards = () => AsyncStorage.getItem(GUARDS_KEY).then((v) => JSON.parse(v || '[]')).catch(() => []);
const addGuard = async (name) => {
    const list = await readGuards();
    if (!list.includes(name)) await AsyncStorage.setItem(GUARDS_KEY, JSON.stringify([...list, name].slice(-10))).catch(() => {});
};

// The /login screen (register and forgot password link here): the student login, or ?as=faculty. The start
// screen (welcome.jsx) shows the same form in place, under its own logo, so the logo doesn't load again.
export default function Login() {
    const { as } = useLocalSearchParams();
    const router = useRouter();
    return (
        <AuthScreen maxWidth={384}>
            <LoginForm faculty={as === 'faculty'} onChange={() => router.replace('/welcome')} />
        </AuthScreen>
    );
}

// Student or faculty login (faculty: guards too). Each side only lets its own accounts in. onChange: back to
// the Student / Faculty choice.
export function LoginForm({ faculty, onChange }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [focused, setFocused] = useState('');
    const [remember, setRemember] = useState(false);
    const { login } = useAuth();
    const rememberKey = REMEMBER_KEYS[faculty ? 'faculty' : 'student'];
    // A known guard's location, started as soon as their username is in the box (ready by the time they tap Login)
    const [guards, setGuards] = useState([]);
    useEffect(() => { if (faculty) readGuards().then(setGuards); }, [faculty]);
    const early = useRef({ name: null, pending: null });
    const knownGuard = faculty && guards.includes(username.trim().toLowerCase());
    useEffect(() => {
        const name = username.trim().toLowerCase();
        if (!knownGuard || early.current.name === name) return;
        const pending = currentLocation();
        pending.catch(() => {}); // asked for again on Login if this one failed
        early.current = { name, pending };
    }, [knownGuard, username]);
    // Fill in what was remembered on this phone (and tick the box)
    useEffect(() => {
        let alive = true;
        AsyncStorage.getItem(rememberKey).then((saved) => {
            if (alive && saved) {
                setUsername((typed) => typed || saved);
                setRemember(true);
            }
        }).catch(() => {});
        return () => { alive = false; };
    }, [rememberKey]);

    const handleLogin = async () => {
        // Enter can fire this while a request is still running
        if (loading) return;
        if (!username || !password) {
            setError('Please enter both ID and password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            let response;
            const name = username.trim().toLowerCase();
            // A guard who logged in here before: their location goes with the first request
            let location = knownGuard && early.current.name === name ? await early.current.pending.catch(() => undefined) : undefined;
            try {
                response = await api.post('/login/', { username, password, location });
            } catch (first) {
                // A guard: log in again with where they are (only on campus). A rough fix that came out
                // "outside": try once more with GPS before giving up
                const data = first.response?.status === 403 ? first.response.data : null;
                if (!(data?.needs_location || (data?.outside_area && location && location.accuracy > 50))) throw first;
                try {
                    location = await currentLocation(Boolean(location));
                } catch (geoError) {
                    setError(geoError.message);
                    return;
                }
                response = await api.post('/login/', { username, password, location });
            }
            if (response.data.role === 'guard') addGuard(name);

            if (response.data.role === 'admin') {
                setError('Admin login is not supported on mobile');
                setLoading(false);
                return;
            }
            const side = ROLE_SIDE[response.data.role];
            if (side && side !== (faculty ? 'faculty' : 'student')) {
                setError(side === 'student'
                    ? 'This is a student account. Go back and choose Student.'
                    : 'This is a faculty account. Go back and choose Faculty.');
                setLoading(false);
                return;
            }

            const userData = {
                // Sent with every API request (services/api.js)
                token: response.data.token,
                username: response.data.username,
                role: response.data.role,
                student_id: response.data.student_id,
                name: response.data.name,
                // Staff/guard display name, used as the reporter on violation reports
                full_name: response.data.full_name
            };

            try {
                if (remember) await AsyncStorage.setItem(rememberKey, username.trim());
                else await AsyncStorage.removeItem(rememberKey);
            } catch { /* not kept: typed again next time */ }
            await login(userData);
        } catch (error) {
            const errData = error.response?.data?.error;
            let errMsg = 'System connection failure';
            if (typeof errData === 'string') {
                errMsg = errData;
            } else if (errData && typeof errData === 'object' && errData.message) {
                errMsg = errData.message;
            }
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Back to the Student / Faculty choice */}
            <TouchableOpacity onPress={onChange} style={styles.back} accessibilityRole="button" accessibilityLabel="Back to choose Student or Faculty" hitSlop={8}>
                <ArrowLeft size={16} color={C.link} />
                <Text style={styles.backText}>{faculty ? 'Not faculty? Change' : 'Not a student? Change'}</Text>
            </TouchableOpacity>
            <Text style={[A.title, styles.title]}>{faculty ? 'Faculty Login' : 'Student Login'}</Text>

            {error ? (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}

            <View style={[styles.field, focused === 'id' && A.inputFocused]}>
                <User size={16} color={C.textMuted} style={styles.icon} />
                <TextInput
                    style={styles.input}
                    placeholder={faculty ? 'Email or username' : 'Student ID'}
                    placeholderTextColor={C.placeholder}
                    accessibilityLabel={faculty ? 'Email or username' : 'Student ID'}
                    keyboardType={faculty ? 'email-address' : 'default'}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoComplete="username"
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                    onFocus={() => setFocused('id')}
                    onBlur={() => setFocused('')}
                />
            </View>

            <View style={[styles.field, focused === 'password' && A.inputFocused]}>
                <Lock size={16} color={C.textMuted} style={styles.icon} />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={C.placeholder}
                    accessibilityLabel="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="current-password"
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused('')}
                />
                <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eye}
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                    {showPassword ? <EyeOff size={16} color={C.textMuted} /> : <Eye size={16} color={C.textMuted} />}
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.remember} onPress={() => setRemember((r) => !r)} accessibilityRole="checkbox" accessibilityState={{ checked: remember }} hitSlop={6}>
                <View style={[styles.box, remember && styles.boxOn]}>
                    {remember ? <Check size={12} color="#ffffff" strokeWidth={3} /> : null}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>

            {/* Forgot password on the left, Login on the right (same as the website) */}
            <View style={styles.actions}>
                {faculty ? (
                    <TouchableOpacity onPress={() => Linking.openURL(`${SITE}/faculty/forgot-password`)}>
                        <Text style={styles.forgot}>Forgot password?</Text>
                    </TouchableOpacity>
                ) : (
                    <Link href="/forgot-password" asChild>
                        <TouchableOpacity>
                            <Text style={styles.forgot}>Forgot password?</Text>
                        </TouchableOpacity>
                    </Link>
                )}
                <TouchableOpacity style={[A.primaryButton, loading && A.disabled]} onPress={handleLogin} disabled={loading}>
                    {loading ? <ActivityIndicator color="#ffffff" /> : (
                        <>
                            <Text style={A.primaryButtonText}>Login</Text>
                            <ChevronRight size={16} color="#ffffff" />
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Dashed line: Android only draws dashes reliably on a full border, so it's a thin box */}
            <View style={styles.dashed} />
            {faculty ? (
                <View>
                    <Text style={styles.newTitle}>No faculty account yet?</Text>
                    <Text style={styles.newText}>
                        <Text style={styles.registerLink} onPress={() => Linking.openURL(`${SITE}/faculty/signup`)}>Sign up on the website</Text>
                        {' '}with your USTP email. OSA confirms the account, then you can log in here.
                    </Text>
                </View>
            ) : (
                <View>
                    <Text style={styles.newTitle}>New student?</Text>
                    <Text style={styles.newText}>
                        If you don&apos;t have an account yet,{' '}
                        <Link href="/register" style={styles.registerLink}>register here</Link>
                        {' '}to get your QR ID and follow your service hours.
                    </Text>
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    title: { marginBottom: 14, fontSize: 19 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: 10 },
    backText: { fontSize: 12, fontWeight: '700', color: C.link },
    errorBox: {
        backgroundColor: '#fef2f2',
        borderColor: '#fee2e2',
        borderWidth: 1,
        borderRadius: 6,
        padding: 10,
        marginBottom: 12,
    },
    errorText: { color: C.danger, fontWeight: '700', fontSize: 12 },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.field,
        borderWidth: 1,
        borderColor: C.fieldBorder,
        borderRadius: 6,
        height: 42,
        marginBottom: 10,
    },
    icon: { marginLeft: 12, marginRight: 8 },
    input: {
        flex: 1,
        // Without minWidth the web <input> keeps its default size and pushes the eye icon out
        minWidth: 0,
        height: '100%',
        color: C.text,
        fontWeight: '600',
        fontSize: 14,
    },
    eye: { paddingHorizontal: 12, height: '100%', justifyContent: 'center' },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    remember: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: 2, marginBottom: 4 },
    box: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: C.fieldBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
    boxOn: { backgroundColor: C.navy, borderColor: C.navy },
    rememberText: { fontSize: 13, fontWeight: '600', color: C.textSoft },
    forgot: { fontSize: 12, fontWeight: '700', color: C.link },
    dashed: {
        height: 1,
        marginTop: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderRadius: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(100,116,139,0.6)',
    },
    newTitle: { fontSize: 14, fontWeight: '700', color: C.text },
    newText: { fontSize: 12, color: '#1e293b', lineHeight: 18, marginTop: 4 },
    registerLink: { fontWeight: '700', color: C.link, textDecorationLine: 'underline' },
});
