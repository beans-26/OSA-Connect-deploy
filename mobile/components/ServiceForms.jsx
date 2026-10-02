import React, { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Download } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';
import { isoFormHtml } from '../../shared/iso-form';
import { reflectionFormHtml } from '../../shared/reflection-form';
import { showAlert } from './showAlert';
import { useTheme } from './ThemeContext';

// The blank forms (PDF), filled in by hand and brought to OSA: FM-USTP-OSA-013 time log (A4 landscape) and
// FM-USTP-OSA-14 reflection form (A4 portrait). Any number of downloads. Shown in the e-ticket receipt
// (TicketDetails) while the ticket isn't cleared. Same as the website.
const FORMS = {
    iso: { label: 'ISO Form', file: 'FM-USTP-OSA-013 ISO Form.pdf', html: isoFormHtml, width: 842, height: 595 },
    reflection: { label: 'Reflection Form', file: 'FM-USTP-OSA-14 Reflection Form.pdf', html: reflectionFormHtml, width: 595, height: 842 },
};
const DOWNLOAD_FOLDER = 'content://com.android.externalstorage.documents/tree/primary%3ADownload';

export default function ServiceForms() {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const [formBusy, setFormBusy] = useState(null);

    const downloadForm = async (kind) => {
        if (formBusy) return;
        const form = FORMS[kind];
        setFormBusy(kind);
        try {
            // A4 in points
            const { uri } = await Print.printToFileAsync({ html: form.html(), width: form.width, height: form.height });
            const pdf = new File(Paths.cache, form.file);
            if (pdf.exists) pdf.delete();
            await new File(uri).move(pdf);

            // Android: saved in the phone's Download folder. Apps can only write there after the student
            // picks it, so the folder picker opens on Download. Elsewhere: the share sheet.
            if (Platform.OS === 'android') {
                let folder;
                try {
                    folder = await Directory.pickDirectoryAsync(DOWNLOAD_FOLDER);
                } catch {
                    return; // Picker closed
                }
                folder.createFile(form.file, 'application/pdf').write(await pdf.bytes());
                showAlert(`${form.label} downloaded`, `Saved as ${form.file} in the folder you picked (Download).`);
            } else {
                await Sharing.shareAsync(pdf.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Save ${form.label}` });
            }
        } catch {
            showAlert('Download failed', `Couldn't make the ${form.label.toLowerCase()}. Try again.`);
        } finally {
            setFormBusy(null);
        }
    };

    return (
        <View style={{ marginTop: 8, marginBottom: 16 }}>
            <Text style={styles.heading}>FORMS TO BRING TO OSA</Text>
            <View style={styles.row}>
                {Object.entries(FORMS).map(([kind, form]) => (
                    <TouchableOpacity key={kind} style={styles.button} onPress={() => downloadForm(kind)} disabled={!!formBusy} accessibilityRole="button">
                        {formBusy === kind ? <ActivityIndicator size="small" color={colors.text} /> : <Download size={15} color={colors.text} />}
                        <Text style={styles.buttonText}>{form.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const getStyles = (colors) => StyleSheet.create({
    heading: { fontSize: 10, fontWeight: '900', letterSpacing: 2, color: colors.textMuted, marginBottom: 8 },
    row: { flexDirection: 'row', gap: 8 },
    button: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1,
        borderColor: colors.border, backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    },
    buttonText: { fontSize: 12, fontWeight: '700', color: colors.text },
});
