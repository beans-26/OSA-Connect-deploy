import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Android geofence view drawn with plain Views instead of react-native-maps.
// Google Maps on Android needs an API key baked into the APK; without one the app crashed
// as soon as the map appeared (i.e. right after a timer started). Expo picks this file over
// MapViewComponent.native.jsx on Android; iPhone keeps the real map.
//
// The service area fills the middle of the box; the student's dot is placed by their
// real offset from the hub and pinned to the edge when they are far outside.

const METERS_PER_DEG_LAT = 110540;
const metersPerDegLng = (lat) => 111320 * Math.cos((lat * Math.PI) / 180);

export default function MapViewComponent({
    style, isDarkMode, targetLocation, isOutOfBounds, location, hubMarkerDotStyle, studentMarkerDotStyle, approach = false,
}) {
    const [size, setSize] = useState({ width: 0, height: 0 });

    const hubLat = targetLocation ? targetLocation.lat : 8.4859;
    const hubLng = targetLocation ? targetLocation.lng : 124.6567;
    const radius = targetLocation?.radius || 50;

    const box = Math.min(size.width, size.height);
    const cx = size.width / 2;
    const cy = size.height / 2;

    // Student's offset from the site in meters (east, north)
    const offset = location
        ? {
            east: (location.longitude - hubLng) * metersPerDegLng(hubLat),
            north: (location.latitude - hubLat) * METERS_PER_DEG_LAT,
        }
        : null;

    // Session: the service area fills the middle. Approach (before the timer): zoom out until the
    // student fits too, so the dashed line shows which way to walk.
    let pxPerMeter = (box * 0.34) / radius;
    if (approach && offset) {
        const meters = Math.hypot(offset.east, offset.north);
        if (meters > 0) pxPerMeter = Math.min(pxPerMeter, (box / 2 - 20) / meters);
    }
    const circlePx = Math.max(6, radius * pxPerMeter); // service-area circle radius on screen

    let student = null;
    if (offset && box > 0) {
        const dx = offset.east * pxPerMeter;
        const dy = -offset.north * pxPerMeter;
        const limit = box / 2 - 14;
        const dist = Math.hypot(dx, dy);
        const k = dist > limit ? limit / dist : 1;
        student = { x: cx + dx * k, y: cy + dy * k, pinned: k < 1 };
    }

    // Faded until the timer starts; then green inside / red outside
    const areaColor = approach ? '#64748b' : isOutOfBounds ? '#dc2626' : '#059669';
    const ring = isDarkMode ? 'rgba(148,163,184,0.18)' : 'rgba(100,116,139,0.15)';

    return (
        <View
            style={[style, styles.base, { backgroundColor: isDarkMode ? '#0f172a' : '#eef2f7' }]}
            onLayout={(e) => setSize(e.nativeEvent.layout)}
        >
            {box > 0 && (
                <>
                    {/* Distance rings for scale */}
                    {[0.7, 1.4].map((f) => (
                        <View
                            key={f}
                            style={[styles.circle, {
                                width: circlePx * 2 * f, height: circlePx * 2 * f, borderRadius: circlePx * f,
                                left: cx - circlePx * f, top: cy - circlePx * f,
                                borderColor: ring, borderStyle: 'dashed', borderWidth: 1,
                            }]}
                        />
                    ))}
                    {/* Service area */}
                    <View
                        style={[styles.circle, {
                            width: circlePx * 2, height: circlePx * 2, borderRadius: circlePx,
                            left: cx - circlePx, top: cy - circlePx,
                            borderColor: areaColor, borderWidth: approach ? 2 : 3, borderStyle: approach ? 'dashed' : 'solid',
                            backgroundColor: approach ? 'rgba(100,116,139,0.06)' : isOutOfBounds ? 'rgba(220,38,38,0.08)' : 'rgba(5,150,105,0.10)',
                        }]}
                    />
                    {/* Route line from the student to the site (approach only) */}
                    {approach && student && (() => {
                        const len = Math.hypot(student.x - cx, student.y - cy);
                        const angle = Math.atan2(cy - student.y, cx - student.x);
                        return (
                            <View
                                style={{
                                    position: 'absolute',
                                    width: len,
                                    left: (student.x + cx) / 2 - len / 2,
                                    top: (student.y + cy) / 2 - 1.5,
                                    borderTopWidth: 3,
                                    borderColor: '#0ea5e9',
                                    borderStyle: 'dashed',
                                    transform: [{ rotate: `${angle}rad` }],
                                }}
                            />
                        );
                    })()}
                    {/* Hub */}
                    <View style={[styles.dot, { left: cx - 8, top: cy - 8 }]}>
                        <View style={hubMarkerDotStyle} />
                    </View>
                    {/* Student */}
                    {student && (
                        <View style={[styles.dot, { left: student.x - 8, top: student.y - 8 }]}>
                            <View style={studentMarkerDotStyle} />
                        </View>
                    )}
                    <Text style={[styles.scale, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
                        {approach ? 'Starts when you scan' : student?.pinned ? 'You are far from the service area' : `Service area: ${Math.round(radius)} m`}
                    </Text>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        overflow: 'hidden',
    },
    circle: {
        position: 'absolute',
    },
    dot: {
        position: 'absolute',
        width: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scale: {
        position: 'absolute',
        bottom: 8,
        right: 10,
        fontSize: 10,
        fontWeight: '700',
    },
});
