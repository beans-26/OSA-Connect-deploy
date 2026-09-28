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

// Starting a session: the student must be inside the site's circle, plus 0.7 x GPS accuracy (at most
// 20 m). Same rule and wording as _outside_site_error in backend/core/views.py, which enforces it;
// checking here too shows the message right away. Mirrors frontend/src/lib/geo.js.
const START_ACCURACY_FACTOR = 0.7;
const START_ACCURACY_MAX_M = 20;

const distanceMeters = (a, b) => {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLng = toRad(b.longitude - a.longitude);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
};

/** Message when `point` ({ latitude, longitude, accuracy }) is outside `site` ({ latitude, longitude, radius }), else null. */
export const outsideSiteMessage = (point, site, placeName) => {
    const distance = distanceMeters(point, site);
    const allowed = site.radius + Math.min(Math.max(point.accuracy || 0, 0) * START_ACCURACY_FACTOR, START_ACCURACY_MAX_M);
    if (distance <= allowed) return null;
    return `You're ${Math.round(distance)} m away from ${placeName || 'your service site'}. Go inside the service area (within ${Math.round(site.radius)} m) and scan again to start your timer.`;
};
