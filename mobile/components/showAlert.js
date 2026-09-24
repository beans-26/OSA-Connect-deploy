import { Alert, Platform } from 'react-native';

// React Native's Alert.alert does nothing on web (react-native-web), so in the browser version
// errors like "Missing Fields" or a failed request were silent. Use this instead of Alert.alert.
export const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
        window.alert(message ? `${title}\n\n${message}` : title);
        return;
    }
    Alert.alert(title, message);
};
