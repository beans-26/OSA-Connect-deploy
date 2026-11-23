// The Android app download. The QR code on the landing page points at ANDROID_DOWNLOAD_URL (/android on the
// live site), which forwards to the APK, so the printed or shared QR code never has to change.
// The APK is kept on the GitHub repo's Releases page (Expo deletes its build downloads after a while).
// This link always gives the newest release's OSAConnect.apk, so it never needs changing: after a new
// EAS build, download the APK and attach it to a new GitHub release as "OSAConnect.apk".
export const ANDROID_APK_URL = 'https://github.com/beans-26/OSA-Connect-deploy/releases/latest/download/OSAConnect.apk';
export const ANDROID_APP_VERSION = '1.5.0';
// The app's package and link scheme (mobile/app.json): /open (pages/OpenApp.jsx) opens the app with them
export const ANDROID_PACKAGE = 'com.osaconnect.student';
export const ANDROID_APP_SCHEME = 'osaconnect';

export const ANDROID_DOWNLOAD_PATH = '/android';
// Always the live site: a QR code made on localhost must still work on a phone
export const ANDROID_DOWNLOAD_URL = `https://osaconnect.vercel.app${ANDROID_DOWNLOAD_PATH}`;
