import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';
import { showAlert } from './showAlert';

// Makes a PDF from HTML and saves it (same as the e-ticket forms, components/ServiceForms.jsx). Android: into the
// folder the user picks (the picker opens on Download; apps can only write there after that). Elsewhere: the
// share sheet. Resolves true when saved, false when the picker was closed; throws if the PDF couldn't be made.
const DOWNLOAD_FOLDER = 'content://com.android.externalstorage.documents/tree/primary%3ADownload';

export async function savePdf({ html, fileName, label, width = 595, height = 842 }) {
    const { uri } = await Print.printToFileAsync({ html, width, height });
    const pdf = new File(Paths.cache, fileName);
    if (pdf.exists) pdf.delete();
    await new File(uri).move(pdf);
    if (Platform.OS === 'android') {
        let folder;
        try {
            folder = await Directory.pickDirectoryAsync(DOWNLOAD_FOLDER);
        } catch {
            return false; // Picker closed
        }
        folder.createFile(fileName, 'application/pdf').write(await pdf.bytes());
        showAlert(`${label} downloaded`, `Saved as ${fileName} in the folder you picked (Download).`);
        return true;
    }
    await Sharing.shareAsync(pdf.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Save ${label}` });
    return true;
}
