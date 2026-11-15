import { useEffect, useRef } from 'react';

// Calls `load` now and every `ms` while the page is visible. A tab in the background doesn't poll (no data
// or battery spent on a page nobody sees) and loads right away when it's shown again.
// Slow or no connection (since 2026-11): a refresh never starts while the last one is still loading (on a slow
// network they used to pile up), there's no polling while the browser is offline, and it loads right away when
// the connection comes back. `load` may return a promise; when it rejects, the next tries wait longer (2x, 4x,
// at most 4x the interval) until one works.
export default function usePolling(load, ms, deps = []) {
    const loadRef = useRef(load);
    loadRef.current = load;
    useEffect(() => {
        let timer = null;
        let busy = false;
        let failures = 0;
        let skips = 0;
        const run = () => {
            if (busy || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
            // After failures, skip some ticks (back off) instead of hammering a slow connection
            if (skips > 0) { skips -= 1; return; }
            busy = true;
            Promise.resolve()
                .then(() => loadRef.current())
                .then(() => { failures = 0; }, () => { failures = Math.min(failures + 1, 2); skips = 2 ** failures - 1; })
                .finally(() => { busy = false; });
        };
        const start = () => {
            if (timer) return;
            run();
            timer = setInterval(run, ms);
        };
        const stop = () => { clearInterval(timer); timer = null; };
        const onVisibility = () => (document.visibilityState === 'visible' ? start() : stop());
        const onOnline = () => { failures = 0; skips = 0; if (document.visibilityState === 'visible') run(); };
        if (document.visibilityState === 'visible') start();
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('online', onOnline);
        return () => {
            stop();
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('online', onOnline);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ms, ...deps]);
}
