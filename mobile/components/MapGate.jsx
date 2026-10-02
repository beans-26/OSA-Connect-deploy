import React, { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Map as MapIcon } from 'lucide-react-native';
import { useTheme } from './ThemeContext';
import { useStudentShell } from './StudentShell';

// Data saver (Settings): the map is the heaviest thing on the dashboard (its tiles are a few hundred KB),
// so it only loads when the student taps "Show map". With data saver off it shows right away.
// Mirrors frontend/src/components/MapGate.jsx.
export default function MapGate({ children }) {
    const { colors } = useTheme();
    const { dataSaver } = useStudentShell();
    const [shown, setShown] = useState(false);
    if (!dataSaver || shown) return children;
    return (
        <TouchableOpacity
            onPress={() => setShown(true)}
            accessibilityRole="button"
            style={{
                marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.background,
                borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12,
            }}
        >
            <MapIcon size={16} color={colors.text} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Show map</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>· Data saver is on</Text>
        </TouchableOpacity>
    );
}
