import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MapViewComponent({
    style, targetLocation, isOutOfBounds, location
}) {
    const lat = targetLocation ? targetLocation.lat : 8.4859;
    const lng = targetLocation ? targetLocation.lng : 124.6567;
    const radius = targetLocation ? targetLocation.radius : 50;

    // Construct OpenStreetMap interactive embed URL
    const delta = 0.004;
    const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
    const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;

    return (
        <View style={[style, styles.webMapContainer]}>
            <View style={styles.headerBar}>
                <View style={[styles.statusDot, { backgroundColor: isOutOfBounds ? '#ef4444' : '#10b981' }]} />
                <Text style={styles.headerText}>
                    {isOutOfBounds ? 'OUT OF BOUNDS' : 'LIVE HUB MAP (OPENSTREETMAP)'}
                </Text>
                <Text style={styles.radiusBadge}>{radius}m radius</Text>
            </View>
            <iframe
                title="Service Hub Geofence Map"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight="0"
                marginWidth="0"
                src={mapUrl}
                style={{ width: '100%', height: '100%', border: 'none' }}
            />
            {location && (
                <View style={styles.footerBar}>
                    <Text style={styles.footerText}>
                        GPS Position: {location.latitude?.toFixed(5)}, {location.longitude?.toFixed(5)}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    webMapContainer: {
        width: '100%',
        height: 220,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#334155',
        backgroundColor: '#0f172a',
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1e293b',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    headerText: {
        color: '#f8fafc',
        fontWeight: 'bold',
        fontSize: 10,
        letterSpacing: 1,
        flex: 1,
        marginLeft: 6,
    },
    radiusBadge: {
        color: '#38bdf8',
        fontSize: 10,
        fontWeight: 'bold',
    },
    footerBar: {
        backgroundColor: '#1e293b',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    footerText: {
        color: '#94a3b8',
        fontSize: 10,
        textAlign: 'center',
    },
});
