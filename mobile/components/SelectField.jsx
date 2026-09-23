import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, TextInput, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, Check, X, Search } from 'lucide-react-native';
import { useTheme } from './ThemeContext';

// Dropdown that behaves the same on iOS, Android, and web. @react-native-picker/picker renders an
// inline ~200px wheel on iOS, which is clipped to a blank, untappable box inside a normal-height field.
//
// options: array of strings or { label, value }. A value that isn't in the list (e.g. an older
// course name on a student record) is still displayed as-is.
export default function SelectField({ value, options, placeholder, onChange, title, style, textStyle, iconColor, searchable = false }) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const styles = getStyles(colors);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const items = useMemo(
        () => options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o)),
        [options]
    );
    const selectedLabel = items.find((i) => i.value === value)?.label || value;
    const visible = query
        ? items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
        : items;

    const close = () => {
        setOpen(false);
        setQuery('');
    };

    return (
        <>
            <TouchableOpacity
                style={[styles.field, style]}
                onPress={() => setOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={title || placeholder}
            >
                <Text
                    style={[styles.fieldText, !selectedLabel && { color: colors.textMuted }, textStyle]}
                    numberOfLines={1}
                >
                    {selectedLabel || placeholder}
                </Text>
                <ChevronDown size={18} color={iconColor || colors.textMuted} />
            </TouchableOpacity>

            <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
                <Pressable style={styles.backdrop} onPress={close} />
                <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>{title || placeholder}</Text>
                        <TouchableOpacity onPress={close} style={styles.closeButton} accessibilityLabel="Close">
                            <X size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                    {searchable && (
                        <View style={styles.searchBox}>
                            <Search size={16} color={colors.textMuted} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search"
                                placeholderTextColor={colors.textMuted}
                                value={query}
                                onChangeText={setQuery}
                                autoCorrect={false}
                            />
                        </View>
                    )}
                    <FlatList
                        data={visible}
                        keyExtractor={(item) => item.value}
                        keyboardShouldPersistTaps="handled"
                        ListEmptyComponent={<Text style={styles.empty}>No matches</Text>}
                        renderItem={({ item }) => {
                            const selected = item.value === value;
                            return (
                                <TouchableOpacity
                                    style={[styles.option, selected && styles.optionSelected]}
                                    onPress={() => {
                                        onChange(item.value);
                                        close();
                                    }}
                                >
                                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{item.label}</Text>
                                    {selected && <Check size={18} color={colors.primary} />}
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
            </Modal>
        </>
    );
}

const getStyles = (colors) => StyleSheet.create({
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    fieldText: {
        flex: 1,
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text,
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
    },
    sheet: {
        maxHeight: '70%',
        backgroundColor: colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 8,
        width: '100%',
        maxWidth: 576,
        alignSelf: 'center',
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: colors.text,
    },
    closeButton: {
        padding: 6,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 20,
        marginBottom: 8,
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
    },
    searchInput: {
        flex: 1,
        minWidth: 0,
        height: '100%',
        fontSize: 14,
        color: colors.text,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    optionSelected: {
        backgroundColor: colors.background,
    },
    optionText: {
        flex: 1,
        fontSize: 15,
        color: colors.text,
    },
    optionTextSelected: {
        fontWeight: 'bold',
        color: colors.primary,
    },
    empty: {
        padding: 20,
        textAlign: 'center',
        color: colors.textMuted,
    },
});
