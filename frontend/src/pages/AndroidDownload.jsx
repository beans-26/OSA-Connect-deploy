import { useEffect } from 'react';
import { Download } from 'lucide-react';
import logo from '../assets/osaconnect-logo.png';
import { ANDROID_APK_URL, ANDROID_APP_VERSION } from '../lib/androidApp';

// /android: where the landing page's QR code leads. Starts the APK download right away, with a button in case
// the browser doesn't, and the steps to install it.
const AndroidDownload = () => {
    useEffect(() => {
        window.location.replace(ANDROID_APK_URL);
    }, []);

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <img src={logo} alt="OSAConnect" className="mx-auto h-14 w-auto" draggable="false" />
                <h1 className="mt-5 text-lg font-bold text-slate-900">OSAConnect for Android</h1>
                <p className="mt-1 text-sm text-slate-500">Version {ANDROID_APP_VERSION}. Your download should start by itself.</p>
                <a href={ANDROID_APK_URL} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#101A4B] py-3 text-sm font-bold text-white hover:opacity-90">
                    <Download size={16} /> Download the app
                </a>
                <ol className="mt-5 list-decimal space-y-1 pl-5 text-left text-xs leading-relaxed text-slate-500">
                    <li>Open the downloaded file (OSAConnect .apk).</li>
                    <li>If Android asks, allow installing apps from your browser.</li>
                    <li>Tap Install, then open OSAConnect and log in.</li>
                </ol>
            </div>
        </div>
    );
};

export default AndroidDownload;
