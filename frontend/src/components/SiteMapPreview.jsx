import { useEffect, useRef } from 'react';

// Small Leaflet + OpenStreetMap preview of a service site: marker at the point and a circle
// for its radius. Leaflet is loaded globally from index.html (window.L).
const SiteMapPreview = ({ latitude, longitude, radius, className = '' }) => {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const layersRef = useRef({});

    useEffect(() => {
        const L = window.L;
        if (!L || !containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);
        mapRef.current = map;
        return () => {
            map.remove();
            mapRef.current = null;
            layersRef.current = {};
        };
    }, []);

    useEffect(() => {
        const L = window.L;
        const map = mapRef.current;
        if (!L || !map || latitude == null || longitude == null) return;
        const point = [latitude, longitude];
        const layers = layersRef.current;
        if (!layers.marker) {
            // The map needs a view before layers can be measured; fitBounds on a view-less map throws
            map.setView(point, 18);
            layers.marker = L.marker(point).addTo(map);
            layers.circle = L.circle(point, { radius, color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.15, weight: 2 }).addTo(map);
        } else {
            layers.marker.setLatLng(point);
            layers.circle.setLatLng(point).setRadius(radius);
        }
        map.fitBounds(layers.circle.getBounds(), { padding: [16, 16] });
    }, [latitude, longitude, radius]);

    if (typeof window !== 'undefined' && !window.L) {
        return (
            <div className={`flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 text-xs font-semibold text-slate-400 ${className}`}>
                Map unavailable
            </div>
        );
    }
    return <div ref={containerRef} className={`rounded-xl overflow-hidden z-0 ${className}`} />;
};

export default SiteMapPreview;
