import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';

// Applies published EAS updates right away instead of on the second launch after downloading.
// Checks when the app opens and whenever it comes back to the foreground; if a newer update
// exists it's downloaded and the app restarts into it. Same idea as the website's lib/autoUpdate.js.
export const useAutoUpdate = () => {
    const checking = useRef(false);

    useEffect(() => {
        // Only in real builds: dev servers (npx expo start) and Expo Go reload on their own
        if (__DEV__ || !Updates.isEnabled) return;

        const check = async () => {
            if (checking.current) return;
            checking.current = true;
            try {
                const { isAvailable } = await Updates.checkForUpdateAsync();
                if (isAvailable) {
                    await Updates.fetchUpdateAsync();
                    await Updates.reloadAsync();
                }
            } catch {
                // Offline or Expo is unreachable; try again next time the app is opened
            } finally {
                checking.current = false;
            }
        };

        check();
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') check();
        });
        return () => sub.remove();
    }, []);
};
