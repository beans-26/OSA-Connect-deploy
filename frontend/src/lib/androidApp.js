// The Android app download. The QR code on the landing page points at ANDROID_DOWNLOAD_URL (/android on the
// live site), which forwards to the APK, so the printed or shared QR code never has to change.
// After a new EAS build (`eas build -p android --profile preview` in mobile/), paste its APK link here:
// `npx eas-cli build:list --platform android --limit 1` shows it under "Application Archive URL".
export const ANDROID_APK_URL = 'https://expo.dev/artifacts/eas/EfsiOxIgwwCSqkOIQyClqBw0xiy5kghM8m9XvV8lmUQ.apk';
export const ANDROID_APP_VERSION = '1.2.0';

export const ANDROID_DOWNLOAD_PATH = '/android';
// Always the live site: a QR code made on localhost must still work on a phone
export const ANDROID_DOWNLOAD_URL = `https://osaconnect.vercel.app${ANDROID_DOWNLOAD_PATH}`;
