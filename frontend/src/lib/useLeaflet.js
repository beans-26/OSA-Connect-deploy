import { useEffect, useState } from 'react';

// Leaflet (the map library, ~46 KB) is loaded only when a map is actually shown (the student's service map,
// the admin's service sites), not on every page: index.html used to load it for everyone, which cost data on
// slow connections. Loaded once; later maps reuse it.
const VERSION = '1.9.4';
let loading = null;

const loadLeaflet = () => {
    if (window.L) return Promise.resolve(window.L);
    if (!loading) {
        loading = new Promise((resolve, reject) => {
            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = `https://unpkg.com/leaflet@${VERSION}/dist/leaflet.css`;
            document.head.appendChild(css);
            const script = document.createElement('script');
            script.src = `https://unpkg.com/leaflet@${VERSION}/dist/leaflet.js`;
            script.onload = () => resolve(window.L);
            script.onerror = () => { loading = null; reject(new Error('Map library failed to load')); };
            document.head.appendChild(script);
        });
    }
    return loading;
};

/** window.L once the map library has loaded (null until then, or if it couldn't load). */
export default function useLeaflet() {
    const [L, setL] = useState(() => window.L || null);
    useEffect(() => {
        if (L) return undefined;
        let alive = true;
        loadLeaflet().then((lib) => alive && setL(() => lib)).catch(() => {});
        return () => { alive = false; };
    }, [L]);
    return L;
}
