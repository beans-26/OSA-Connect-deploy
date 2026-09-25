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
    style, isDarkMode, targetLocation, isOutOfBounds, location, hubMarkerDotStyle, studentMarkerDotStyle,
}) {
    const [size, setSize] = useState({ width: 0, height: 0 });

    const hubLat = targetLocation ? targetLocation.lat : 8.4859;
    const hubLng = targetLocation ? targetLocation.lng : 124.6567;
    const radius = targetLocation?.radius || 50;

    const box = Math.min(size.width, size.height);
    const circlePx = box * 0.34; // service-area circle radius on screen
    const pxPerMeter = circlePx / radius;
    const cx = size.width / 2;
    const cy = size.height / 2;

    let student = null;
    if (location && box > 0) {
        const dx = (location.longitude - hubLng) * metersPerDegLng(hubLat) * pxPerMeter;
        const dy = -(location.latitude - hubLat) * METERS_PER_DEG_LAT * pxPerMeter;
        const limit = box / 2 - 14;
        const dist = Math.hypot(dx, dy);
        const k = dist > limit ? limit / dist : 1;
        student = { x: cx + dx * k, y: cy + dy * k, pinned: k < 1 };
    }

    const areaColor = isOutOfBounds ? '#dc2626' : '#059669';
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
                            borderColor: areaColor, borderWidth: 3,
                            backgroundColor: isOutOfBounds ? 'rgba(220,38,38,0.08)' : 'rgba(5,150,105,0.10)',
                        }]}
                    />
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
                        {student?.pinned ? 'You are far from the service area' : `Service area: ${Math.round(radius)} m`}
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
