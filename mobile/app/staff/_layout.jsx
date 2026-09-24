import { Stack, useRouter } from 'expo-router';
import RequireRole from '../../components/RequireRole';
import { TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../components/ThemeContext';
import { User, CircleQuestionMark } from 'lucide-react-native';

export default function StaffLayout() {
    const router = useRouter();
    const { colors } = useTheme();

    return (
        <RequireRole roles={['staff', 'guard']}>
            <Stack
                screenOptions={{
                    headerStyle: {
                        backgroundColor: colors.card,
                    },
                    headerTintColor: colors.text,
                    contentStyle: { backgroundColor: colors.background },
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    headerRight: () => (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginRight: 15 }}>
                            <TouchableOpacity onPress={() => router.push('/help')} accessibilityLabel="Help">
                                <CircleQuestionMark size={24} color={colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => router.push('/staff/settings')}>
                                <User size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                    ),
                }}
            >
                <Stack.Screen 
                    name="dashboard" 
                    options={{
                        title: 'Personnel Dashboard',
                        // The screen draws its own Guard Report header with Help / Log Out
                        headerShown: false,
                    }}
                />
                <Stack.Screen
                    name="settings"
                    options={{
                        headerShown: false,
                    }}
                />
                {/* Camera gets its own native full-screen screen; the report form stays mounted underneath */}
                <Stack.Screen
                    name="scan"
                    options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
                />
            </Stack>
        </RequireRole>
    );
}
