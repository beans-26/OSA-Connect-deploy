import { Stack } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { TouchableOpacity, Text } from 'react-native';
import { useAuth } from '../../components/AuthContext';
import { LogOut } from 'lucide-react-native';

export default function StaffLayout() {
    const { logout } = useAuth();

    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#fff',
                },
                headerTintColor: Colors.text,
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
                headerRight: () => (
                    <TouchableOpacity 
                        onPress={logout}
                        style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}
                    >
                        <LogOut size={18} color={Colors.danger} style={{ marginRight: 4 }} />
                        <Text style={{ color: Colors.danger, fontWeight: 'bold' }}>Logout</Text>
                    </TouchableOpacity>
                ),
            }}
        >
            <Stack.Screen 
                name="dashboard" 
                options={{ 
                    title: 'Personnel Dashboard',
                }} 
            />
        </Stack>
    );
}
