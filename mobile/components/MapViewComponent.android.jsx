import React, { useRef, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

// Android map drawn from OpenStreetMap tiles with plain Views, so it looks like the website's
// Leaflet map without react-native-maps (Google Maps on Android needs an API key baked into the APK;
// without one the app crashed as soon as the map appeared). Expo picks this file over
// MapViewComponent.native.jsx on Android; iPhone keeps the real map.
//
// Session: centered on the site, the geofence circle green inside / red outside.
// approach (before the timer): framed on both the student and the site, with the circle faded
// and a dashed line showing which way to walk.

const TILE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 18;
const TILE_URL = (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
// OpenStreetMap asks apps to identify themselves
const TILE_HEADERS = { 'User-Agent': 'OSAConnect/1.0 (USTP Office of Student Affairs)' };

// Web Mercator: position in world pixels at a zoom level
const project = (lat, lng, zoom) => {
    const scale = TILE * 2 ** zoom;
    const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
    return {
        x: ((lng + 180) / 360) * scale,
        y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale,
    };
};
const metersPerPixel = (lat, zoom) => (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;

// Highest zoom where every point, plus padding, fits in the box
const fitZoom = (points, width, height, pad) => {
    for (let z = MAX_ZOOM; z > MIN_ZOOM; z--) {
        const px = points.map((p) => project(p.lat, p.lng, z));
        const w = Math.max(...px.map((p) => p.x)) - Math.min(...px.map((p) => p.x));
        const h = Math.max(...px.map((p) => p.y)) - Math.min(...px.map((p) => p.y));
        if (w <= width - pad.x * 2 && h <= height - pad.top - pad.bottom) return z;
    }
    return MIN_ZOOM;
};

export default function MapViewComponent({
    style, isDarkMode, targetLocation, isOutOfBounds, location, hubMarkerDotStyle, studentMarkerDotStyle, approach = false,
}) {
    const [size, setSize] = useState({ width: 0, height: 0 });
    const viewRef = useRef(null); // { zoom, center, key } kept steady so tiles don't reload on every GPS tick

    const hub = {
        lat: targetLocation ? targetLocation.lat : 8.4859,
        lng: targetLocation ? targetLocation.lng : 124.6567,
    };
    const radius = targetLocation?.radius || 50;
    const you = location ? { lat: location.latitude, lng: location.longitude } : null;
    const { width, height } = size;

    let view = null;
    if (width > 0 && height > 0) {
        const pad = { x: 28, top: 40, bottom: 34 };
        // Circle edges (north/south/east/west of the site) so the whole geofence stays in view
        const dLat = radius / 111320;
        const dLng = radius / (111320 * Math.cos((hub.lat * Math.PI) / 180));
        const circlePts = [
            { lat: hub.lat + dLat, lng: hub.lng }, { lat: hub.lat - dLat, lng: hub.lng },
            { lat: hub.lat, lng: hub.lng + dLng }, { lat: hub.lat, lng: hub.lng - dLng },
        ];
        const key = `${approach}:${hub.lat}:${hub.lng}:${radius}:${width}x${height}`;
        const prev = viewRef.current;
        // Re-frame when the site/mode changes, or (approach) when the student walks out of view
        let reframe = !prev || prev.key !== key || (approach && you && !prev.hadYou);
        if (!reframe && approach && you) {
            const c = project(prev.center.lat, prev.center.lng, prev.zoom);
            const p = project(you.lat, you.lng, prev.zoom);
            reframe = Math.abs(p.x - c.x) > width / 2 - 16 || Math.abs(p.y - c.y) > height / 2 - 16;
        }
        if (reframe) {
            const points = approach && you ? [...circlePts, you] : circlePts;
            const zoom = fitZoom(points, width, height, pad);
            const lats = points.map((p) => p.lat);
            const lngs = points.map((p) => p.lng);
            const center = approach && you
                ? { lat: (Math.max(...lats) + Math.min(...lats)) / 2, lng: (Math.max(...lngs) + Math.min(...lngs)) / 2 }
                : hub;
            viewRef.current = { key, zoom, center, hadYou: !!you };
        }
        view = viewRef.current;
    }

    const tiles = [];
    let toScreen = null;
    let circlePx = 0;
    if (view) {
        const c = project(view.center.lat, view.center.lng, view.zoom);
        const left = c.x - width / 2;
        const top = c.y - height / 2;
        toScreen = (p) => {
            const w = project(p.lat, p.lng, view.zoom);
            return { x: w.x - left, y: w.y - top };
        };
        const n = 2 ** view.zoom;
        for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + width) / TILE); tx++) {
            for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + height) / TILE); ty++) {
                if (ty < 0 || ty >= n) continue;
                const wrapped = ((tx % n) + n) % n;
                tiles.push({ key: `${view.zoom}/${tx}/${ty}`, uri: TILE_URL(view.zoom, wrapped, ty), x: tx * TILE - left, y: ty * TILE - top });
            }
        }
        circlePx = radius / metersPerPixel(hub.lat, view.zoom);
    }

    const hubPt = toScreen ? toScreen(hub) : null;
    const youPt = toScreen && you ? toScreen(you) : null;
    const areaColor = approach ? '#64748b' : isOutOfBounds ? '#dc2626' : '#059669';

    return (
        <View
            style={[style, styles.base, { backgroundColor: isDarkMode ? '#1e293b' : '#e5e7eb' }]}
            onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        >
            {tiles.map((t) => (
                <Image
                    key={t.key}
                    source={{ uri: t.uri, headers: TILE_HEADERS }}
                    style={[styles.tile, { left: t.x, top: t.y }]}
                    fadeDuration={0}
                />
            ))}
            {/* Dim the tiles a little in dark mode, like the website's map filter */}
            {isDarkMode && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.28)' }]} pointerEvents="none" />}

            {hubPt && (
                <View
                    pointerEvents="none"
                    style={[styles.abs, {
                        width: circlePx * 2, height: circlePx * 2, borderRadius: circlePx,
                        left: hubPt.x - circlePx, top: hubPt.y - circlePx,
                        borderColor: areaColor, borderWidth: approach ? 2 : 3, borderStyle: approach ? 'dashed' : 'solid',
                        backgroundColor: approach ? 'rgba(100,116,139,0.08)' : isOutOfBounds ? 'rgba(220,38,38,0.12)' : 'rgba(5,150,105,0.15)',
                    }]}
                />
            )}

            {/* Route line from the student to the site (approach only) */}
            {approach && hubPt && youPt && (() => {
                const len = Math.hypot(youPt.x - hubPt.x, youPt.y - hubPt.y);
                if (len < 4) return null;
                const angle = Math.atan2(hubPt.y - youPt.y, hubPt.x - youPt.x);
                return (
                    <View
                        pointerEvents="none"
                        style={[styles.abs, {
                            width: len,
                            left: (youPt.x + hubPt.x) / 2 - len / 2,
                            top: (youPt.y + hubPt.y) / 2 - 1.5,
                            borderTopWidth: 3,
                            borderColor: '#0ea5e9',
                            borderStyle: 'dashed',
                            transform: [{ rotate: `${angle}rad` }],
                        }]}
                    />
                );
            })()}

            {hubPt && (
                <View pointerEvents="none" style={[styles.dot, { left: hubPt.x - 9, top: hubPt.y - 9 }]}>
                    <View style={hubMarkerDotStyle} />
                </View>
            )}
            {youPt && (
                <View pointerEvents="none" style={[styles.dot, { left: youPt.x - 9, top: youPt.y - 9 }]}>
                    <View style={studentMarkerDotStyle} />
                </View>
            )}

            <Text style={styles.attribution}>© OpenStreetMap</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        overflow: 'hidden',
    },
    tile: {
        position: 'absolute',
        width: TILE,
        height: TILE,
    },
    abs: {
        position: 'absolute',
    },
    dot: {
        position: 'absolute',
        width: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    attribution: {
        position: 'absolute',
        bottom: 2,
        right: 4,
        fontSize: 8,
        color: '#475569',
        backgroundColor: 'rgba(255,255,255,0.7)',
        paddingHorizontal: 3,
        borderRadius: 3,
    },
});
