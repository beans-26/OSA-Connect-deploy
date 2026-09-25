// Reloads the page when a newer deploy is live.
//
// The site is a single-page app: after the first load, moving between pages never fetches
// index.html again, so a tab left open (phones keep Safari tabs alive for days) keeps running
// the old code. Each Vercel build gives the main script a new hashed name, so we compare the
// script this page is running with the one the live index.html points to.
//
// Checked when the tab comes back to the foreground (a safe moment: the user isn't mid-action)
// and every few minutes while it's visible.

const CHECK_EVERY_MS = 5 * 60 * 1000;
const SCRIPT_PATTERN = /\/assets\/index-[\w-]+\.js/;

const runningScript = () => {
    const el = [...document.querySelectorAll('script[src]')].find((s) => SCRIPT_PATTERN.test(s.src));
    return el ? el.src.match(SCRIPT_PATTERN)[0] : null;
};

const liveScript = async () => {
    const response = await fetch(`/?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const match = (await response.text()).match(SCRIPT_PATTERN);
    return match ? match[0] : null;
};

// Don't yank the page away while a camera/scanner or other dialog is open
const busy = () => !!document.querySelector('[role="dialog"], video');

export const startAutoUpdate = () => {
    const current = runningScript();
    if (!current) return; // dev server (no hashed bundle)

    let checking = false;
    const check = async () => {
        if (checking || document.visibilityState !== 'visible' || busy()) return;
        checking = true;
        try {
            const live = await liveScript();
            if (live && live !== current) window.location.reload();
        } catch {
            // Offline or the server is waking up; try again next time
        } finally {
            checking = false;
        }
    };

    document.addEventListener('visibilitychange', check);
    window.addEventListener('pageshow', check); // iOS restoring a tab from its back/forward cache
    setInterval(check, CHECK_EVERY_MS);
};
