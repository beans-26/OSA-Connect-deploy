import React, { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { EyeOff, Map as MapIcon } from 'lucide-react-native';
import { useTheme } from './ThemeContext';
import { useStudentShell } from './StudentShell';

// The dashboard map with "Show map" / "Hide map". Data saver (Settings): the map is the heaviest thing on the
// dashboard (its tiles are a few hundred KB), so it starts hidden and only loads when the student taps
// "Show map". With data saver off it starts shown. Either way the student can hide or show it.
// Mirrors frontend/src/components/MapGate.jsx.
export default function MapGate({ children }) {
    const { colors } = useTheme();
    const { dataSaver } = useStudentShell();
    const [choice, setChoice] = useState(null); // null: follow data saver; true / false: the student's choice
    const shown = choice ?? !dataSaver;
    if (shown) {
        return (
            <>
                {children}
                <TouchableOpacity
                    onPress={() => setChoice(false)}
                    accessibilityRole="button"
                    hitSlop={6}
                    style={{ alignSelf: 'center', marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 }}
                >
                    <EyeOff size={14} color={colors.textMuted} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>Hide map</Text>
                </TouchableOpacity>
            </>
        );
    }
    return (
        <TouchableOpacity
            onPress={() => setChoice(true)}
            accessibilityRole="button"
            style={{
                marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.background,
                borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12,
            }}
        >
            <MapIcon size={16} color={colors.text} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Show map</Text>
            {dataSaver && <Text style={{ fontSize: 13, color: colors.textMuted }}>· Data saver is on</Text>}
        </TouchableOpacity>
    );
}
