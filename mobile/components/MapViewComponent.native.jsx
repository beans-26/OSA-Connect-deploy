import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

export default function MapViewComponent({
    style, region, isDarkMode, darkMapStyle, targetLocation, isOutOfBounds, location, hubMarkerDotStyle, studentMarkerDotStyle
}) {
    const lat = targetLocation ? targetLocation.lat : 8.4859;
    const lng = targetLocation ? targetLocation.lng : 124.6567;
    const radius = targetLocation ? targetLocation.radius : 50;

    return (
        <MapView
            style={style}
            region={region || {
                latitude: lat,
                longitude: lng,
                latitudeDelta: 0.0015,
                longitudeDelta: 0.0015,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
            showsUserLocation={false}
            customMapStyle={isDarkMode ? darkMapStyle : []}
        >
            <Circle
                center={{
                    latitude: lat,
                    longitude: lng,
                }}
                radius={radius}
                fillColor={isOutOfBounds ? 'rgba(220,38,38,0.06)' : 'rgba(5,150,105,0.08)'}
                strokeColor={isOutOfBounds ? '#dc2626' : '#059669'}
                strokeWidth={3}
            />
            <Marker
                coordinate={{
                    latitude: lat,
                    longitude: lng,
                }}
                title="Service Hub"
            >
                <View style={hubMarkerDotStyle} />
            </Marker>
            {location && (
                <Marker
                    coordinate={{ latitude: location.latitude, longitude: location.longitude }}
                    title="You are here"
                >
                    <View style={studentMarkerDotStyle} />
                </Marker>
            )}
        </MapView>
    );
}
