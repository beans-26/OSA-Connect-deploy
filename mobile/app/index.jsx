import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../components/AuthContext';
import { Colors } from '../constants/Colors';

export default function Index() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!user) {
        return <Redirect href="/login" />;
    }

    // Route students
    if (user.role === 'student') {
        return <Redirect href="/(student)/dashboard" />;
    }

    // Route personnel
    if (user.role === 'staff' || user.role === 'guard') {
        return <Redirect href="/(staff)/dashboard" />;
    }

    // Fallback if somehow someone else logs in
    return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
});
