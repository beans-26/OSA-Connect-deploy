import { Stack, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { TouchableOpacity, Text } from 'react-native';
import { useAuth } from '../../components/AuthContext';
import { User } from 'lucide-react-native';

export default function StaffLayout() {
    const router = useRouter();

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
                    <TouchableOpacity onPress={() => router.push('/settings')} style={{ marginRight: 15 }}>
                        <User size={24} color={Colors.text} />
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
            <Stack.Screen 
                name="settings" 
                options={{ 
                    headerShown: false,
                }} 
            />
        </Stack>
    );
}
