import { Stack } from 'expo-router';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Home, ScanLine, User } from 'lucide-react-native';
import { useAuth } from '../../components/AuthContext';

function CustomTabBar({ state, descriptors, navigation }) {
    const { logout } = useAuth();

    const icons = {
        dashboard: (focused) => (
            <View style={[styles.tabItem, focused && styles.tabItemActive]}>
                <Home size={22} color={focused ? '#fff' : '#94a3b8'} />
            </View>
        ),
        scan: (focused) => (
            <View style={styles.tabItemScan}>
                <ScanLine size={22} color={focused ? '#FF6B35' : '#94a3b8'} />
            </View>
        ),
        settings: (focused) => (
            <View style={styles.tabItemProfile}>
                <User size={22} color={focused ? '#FF6B35' : '#94a3b8'} />
            </View>
        ),
    };

    return (
        <View style={styles.tabBarWrapper}>
            <View style={styles.tabBar}>
                {state.routes.map((route, index) => {
                    const focused = state.index === index;
                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });
                        if (!focused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    return (
                        <TouchableOpacity
                            key={route.key}
                            onPress={onPress}
                            style={styles.tabButton}
                            activeOpacity={0.8}
                        >
                            {icons[route.name]?.(focused)}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

export default function StudentLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="scan" />
            <Stack.Screen name="settings" />
        </Stack>
    );
}

const styles = StyleSheet.create({
    tabBarWrapper: {
        position: 'absolute',
        bottom: 24,
        left: 24,
        right: 24,
        alignItems: 'center',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderRadius: 40,
        paddingVertical: 10,
        paddingHorizontal: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabItemActive: {
        backgroundColor: '#FF6B35',
        borderRadius: 50,
        padding: 12,
    },
    tabItem: {
        padding: 12,
        borderRadius: 50,
    },
    tabItemScan: {
        padding: 12,
    },
    tabItemProfile: {
        padding: 12,
    },
});
