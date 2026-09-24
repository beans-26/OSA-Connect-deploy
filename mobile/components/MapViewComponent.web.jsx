import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';

// Web version of the session map (phones use MapViewComponent.native.jsx with react-native-maps).
// A live Leaflet map: service hub, allowed radius, and the student's GPS position, recolored when
// out of bounds. Replaces an OpenStreetMap embed page that could only show a fixed pin.
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

const ensureLeafletCss = () => {
    if (document.getElementById('leaflet-css')) return;
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS;
    document.head.appendChild(link);
};

export default function MapViewComponent({ style, targetLocation, isOutOfBounds, location }) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const layersRef = useRef({});
    const LRef = useRef(null);

    const hubLat = targetLocation ? targetLocation.lat : 8.4859;
    const hubLng = targetLocation ? targetLocation.lng : 124.6567;
    const radius = targetLocation ? targetLocation.radius : 50;
    const color = isOutOfBounds ? '#ef4444' : '#10b981';
    // The map is created asynchronously, so drawing must read the latest props, not the ones
    // from the render that started it (otherwise the "you" marker never appears if GPS is steady)
    const latestRef = useRef({ hubLat, hubLng, radius, color, location });
    // Layout effects run before the redraw effect below, so it always sees these values
    useLayoutEffect(() => {
        latestRef.current = { hubLat, hubLng, radius, color, location };
    });

    const drawLayers = () => {
        const L = LRef.current;
        const map = mapRef.current;
        if (!L || !map) return;
        const { hubLat, hubLng, radius, color, location } = latestRef.current;
        const { circle, hub } = layersRef.current;
        circle?.setLatLng([hubLat, hubLng]).setRadius(radius).setStyle({ color, fillColor: color });
        hub?.setLatLng([hubLat, hubLng]);

        if (location?.latitude != null && location?.longitude != null) {
            const you = [location.latitude, location.longitude];
            if (layersRef.current.you) {
                layersRef.current.you.setLatLng(you).setStyle({ fillColor: color });
            } else {
                layersRef.current.you = L.circleMarker(you, { radius: 7, color: '#ffffff', weight: 2, fillColor: color, fillOpacity: 1 }).addTo(map);
            }
            // Keep both the hub and the student in view
            map.fitBounds(L.latLngBounds([[hubLat, hubLng], you]).pad(0.4), { maxZoom: 18, animate: false });
        } else {
            map.setView([hubLat, hubLng], map.getZoom() || 18, { animate: false });
        }
    };

    // Create the map once. Leaflet is imported here because it needs `window`, which isn't
    // available while `expo export` pre-renders the page.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            ensureLeafletCss();
            const L = (await import('leaflet')).default;
            if (cancelled || !containerRef.current || mapRef.current) return;
            LRef.current = L;
            const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView([hubLat, hubLng], 18);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap',
            }).addTo(map);
            layersRef.current.circle = L.circle([hubLat, hubLng], { radius, color, fillColor: color, fillOpacity: 0.12, weight: 2 }).addTo(map);
            layersRef.current.hub = L.circleMarker([hubLat, hubLng], { radius: 8, color: '#ffffff', weight: 3, fillColor: '#1d4ed8', fillOpacity: 1 }).addTo(map);
            mapRef.current = map;
            // The container can report 0x0 on the first frame; recompute once it's laid out
            setTimeout(() => map.invalidateSize(), 250);
            drawLayers();
        })();
        return () => {
            cancelled = true;
            mapRef.current?.remove();
            mapRef.current = null;
            layersRef.current = {};
        };
    }, []);

    // Redraw when the hub, radius, position, or bounds state changes
    useEffect(() => {
        drawLayers();
    }, [hubLat, hubLng, radius, location?.latitude, location?.longitude, isOutOfBounds]);

    return (
        <View style={[style, styles.wrapper]}>
            {/* Leaflet panes use z-index 400+; this stacking context keeps the dashboard's badges on top */}
            <View ref={containerRef} style={styles.map} />
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'relative',
        zIndex: 0,
        overflow: 'hidden',
    },
    map: {
        width: '100%',
        height: '100%',
    },
});
