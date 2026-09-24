import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from './AuthContext';
import { lightColors } from '../constants/Colors';

// Guards the student and staff screens. Opening one without a saved session (a bookmarked or
// Home Screen link, a new browser, or an iPhone Home Screen web app, which has its own storage)
// goes to the login page instead of rendering with no user. The wrong role goes back to "/",
// which routes each role to its own dashboard.
export default function RequireRole({ roles, children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: lightColors.background }}>
                <ActivityIndicator size="large" color={lightColors.primary} />
            </View>
        );
    }
    if (!user) return <Redirect href="/login" />;
    if (!roles.includes(user.role)) return <Redirect href="/" />;
    return children;
}
