import { useEffect, useRef } from 'react';

// Calls `load` now and every `ms` while the page is visible. A tab in the background doesn't poll (no data
// or battery spent on a page nobody sees) and loads right away when it's shown again.
export default function usePolling(load, ms, deps = []) {
    const loadRef = useRef(load);
    loadRef.current = load;
    useEffect(() => {
        let timer = null;
        const start = () => {
            if (timer) return;
            loadRef.current();
            timer = setInterval(() => loadRef.current(), ms);
        };
        const stop = () => { clearInterval(timer); timer = null; };
        const onVisibility = () => (document.visibilityState === 'visible' ? start() : stop());
        if (document.visibilityState === 'visible') start();
        document.addEventListener('visibilitychange', onVisibility);
        return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ms, ...deps]);
}
