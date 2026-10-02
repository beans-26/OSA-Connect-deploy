import React from 'react';
import { View } from 'react-native';
import MapView, { Circle, Marker, Polyline } from 'react-native-maps';

export default function MapViewComponent({
    style, region, isDarkMode, darkMapStyle, targetLocation, isOutOfBounds, location, hubMarkerDotStyle, studentMarkerDotStyle, approach = false
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
                // Faded until the timer starts (approach); then green inside / red outside
                fillColor={approach ? 'rgba(100,116,139,0.06)' : isOutOfBounds ? 'rgba(220,38,38,0.06)' : 'rgba(5,150,105,0.08)'}
                strokeColor={approach ? '#64748b' : isOutOfBounds ? '#dc2626' : '#059669'}
                strokeWidth={approach ? 2 : 3}
                lineDashPattern={approach ? [6, 6] : undefined}
            />
            {approach && location && (
                <Polyline
                    coordinates={[{ latitude: location.latitude, longitude: location.longitude }, { latitude: lat, longitude: lng }]}
                    strokeColor="#0ea5e9"
                    strokeWidth={3}
                    lineDashPattern={[2, 8]}
                />
            )}
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
