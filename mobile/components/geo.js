import { Platform } from 'react-native';

// Direction helpers for guiding a student to their service site.
// Same wording as frontend/src/lib/geo.js (compassDirection, formatDistance, directionsUrl).

/** Compass direction from `from` to `to` ({ latitude, longitude }), e.g. "northeast". */
export const compassDirection = (from, to) => {
    const toRad = (d) => (d * Math.PI) / 180;
    const dLng = toRad(to.longitude - from.longitude);
    const y = Math.sin(dLng) * Math.cos(toRad(to.latitude));
    const x =
        Math.cos(toRad(from.latitude)) * Math.sin(toRad(to.latitude)) -
        Math.sin(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.cos(dLng);
    const bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
    return ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][Math.round(bearing / 45) % 8];
};

/** "85 m" or "1.2 km" */
export const formatDistance = (meters) =>
    meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;

/** Walking directions in the phone's maps app (Apple Maps on iPhone, Google Maps elsewhere). */
export const directionsUrl = ({ latitude, longitude }) =>
    Platform.OS === 'ios'
        ? `https://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=w`
        : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`;
