import { Tabs, router } from 'expo-router';
import { LayoutDashboard, Settings, LogOut } from 'lucide-react-native';
import { TouchableOpacity, Alert } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../components/AuthContext';

export default function StudentLayout() {
    const { logout } = useAuth();

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to exit your session?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout }
        ]);
    };

    return (
        <Tabs
            screenOptions={{
                headerStyle: {
                    backgroundColor: Colors.card,
                },
                headerTintColor: Colors.text,
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textMuted,
                tabBarStyle: {
                    backgroundColor: Colors.card,
                    borderTopColor: Colors.border,
                },
                headerRight: () => (
                    <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
                        <LogOut size={24} color={Colors.danger} />
                    </TouchableOpacity>
                ),
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Service Hub',
                    tabBarIcon: ({ color, size }) => (
                        <LayoutDashboard size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Account Settings',
                    tabBarIcon: ({ color, size }) => (
                        <Settings size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
