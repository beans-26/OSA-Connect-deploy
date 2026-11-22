import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ANDROID_PACKAGE, ANDROID_APP_SCHEME } from '../lib/androidApp';
import { STUDENT_LOGIN } from '../lib/portals';

// /open: where the emails' "Click here to log in" button goes (backend core/emails.py).
// - Android: opens the OSAConnect app (an intent:// link with the app's osaconnect:// scheme and package, which
//   Chrome, Gmail's in-app browser and Samsung Internet understand). The app's start screen takes the student to
//   their dashboard, or its login. Without the app installed, the browser goes to the website's student login
//   instead (browser_fallback_url).
// - iPhone and computers: the website's student login.
const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

const OpenApp = () => {
    const navigate = useNavigate();
    const fallback = `${window.location.origin}${STUDENT_LOGIN}`;
    const intentUrl = `intent://#Intent;scheme=${ANDROID_APP_SCHEME};package=${ANDROID_PACKAGE};`
        + `S.browser_fallback_url=${encodeURIComponent(fallback)};end`;

    useEffect(() => {
        if (isAndroid) window.location.replace(intentUrl);
        else navigate(STUDENT_LOGIN, { replace: true });
    }, [intentUrl, navigate]);

    if (!isAndroid) return null;
    // Shown on Android while the app opens, and if the browser didn't open it by itself (a tap counts as a
    // gesture, which some in-app browsers need)
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-900">
            <div className="w-full max-w-sm text-center">
                <Loader2 className="mx-auto animate-spin text-blue-900 dark:text-blue-300" size={28} />
                <h1 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Opening the OSAConnect app…</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">If it doesn&apos;t open, tap the button below.</p>
                <a href={intentUrl} className="mt-5 flex h-11 w-full items-center justify-center rounded-md bg-blue-900 text-sm font-bold text-white hover:bg-blue-800">
                    Open the app
                </a>
                <Link to={STUDENT_LOGIN} replace className="mt-3 inline-block text-sm font-bold text-blue-800 underline underline-offset-2 dark:text-blue-300">
                    Continue on the website
                </Link>
            </div>
        </div>
    );
};

export default OpenApp;
