// GPS helpers shared by Admin > Service Sites (registering a site) and, later, the student
// check-in that keeps a timer running only inside a site's radius.
//
// Geolocation only works in a secure context: HTTPS, or http://localhost while developing.

export class GeoError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code; // 'insecure' | 'unsupported' | 'permission' | 'unavailable' | 'not-enough' | 'cancelled'
    }
}

export const GEO_MESSAGES = {
    insecure: 'Location only works on a secure (https://) page. Open the site through its https:// address.',
    unsupported: "This browser can't read your location. Try Chrome or Safari on your phone.",
    permission:
        'Location access is blocked. Allow it in your browser: tap the lock/info icon next to the address bar, ' +
        'set Location to "Allow", then try again. On iPhone also check Settings > Privacy & Security > Location Services > Safari.',
    unavailable: "Your phone couldn't get a GPS fix. Turn on Location/GPS and try again outdoors or near a window.",
    'not-enough': 'Not enough accurate readings. Try again outdoors or near a window.',
    cancelled: 'Location capture was cancelled.',
};

const geoError = (code) => new GeoError(code, GEO_MESSAGES[code]);

/** Throws a GeoError if this page can't use geolocation at all. */
export const assertGeolocationAvailable = () => {
    if (typeof window !== 'undefined' && window.isSecureContext === false) throw geoError('insecure');
    if (typeof navigator === 'undefined' || !navigator.geolocation) throw geoError('unsupported');
};

/** 'granted' | 'denied' | 'prompt' | 'unknown' (Safari may not support the Permissions API). */
export const getLocationPermission = async () => {
    try {
        const result = await navigator.permissions?.query({ name: 'geolocation' });
        return result?.state || 'unknown';
    } catch {
        return 'unknown';
    }
};

/**
 * Collects GPS readings for `durationMs` and averages the accurate ones.
 *
 * Readings with accuracy worse than `maxAccuracyM` are discarded. Resolves with
 * { latitude, longitude, accuracy, samples }; rejects with a GeoError ('not-enough' when fewer
 * than `minSamples` good readings arrived). `onProgress` gets
 * { secondsLeft, goodCount, totalCount, lastAccuracy } about once a second and on every reading.
 * Pass an AbortSignal to cancel.
 */
export const captureLocation = ({
    durationMs = 30000,
    maxAccuracyM = 25,
    minSamples = 5,
    onProgress,
    signal,
} = {}) =>
    new Promise((resolve, reject) => {
        try {
            assertGeolocationAvailable();
        } catch (e) {
            reject(e);
            return;
        }

        const good = [];
        let totalCount = 0;
        let lastAccuracy = null;
        let finished = false;
        const endsAt = Date.now() + durationMs;

        const report = () =>
            onProgress?.({
                secondsLeft: Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)),
                goodCount: good.length,
                totalCount,
                lastAccuracy,
            });

        const finish = (error, result) => {
            if (finished) return;
            finished = true;
            navigator.geolocation.clearWatch(watchId);
            clearInterval(ticker);
            clearTimeout(timer);
            signal?.removeEventListener('abort', onAbort);
            if (error) reject(error);
            else resolve(result);
        };

        const onAbort = () => finish(geoError('cancelled'));

        const watchId = navigator.geolocation.watchPosition(
            ({ coords }) => {
                totalCount += 1;
                lastAccuracy = coords.accuracy;
                if (coords.accuracy <= maxAccuracyM) {
                    good.push({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy });
                }
                report();
            },
            (err) => {
                // Timeouts and brief signal loss are retried by the watch itself; these two are final
                if (err.code === err.PERMISSION_DENIED) finish(geoError('permission'));
                else if (err.code === err.POSITION_UNAVAILABLE && totalCount === 0) finish(geoError('unavailable'));
            },
            { enableHighAccuracy: true, maximumAge: 0 }
        );

        const ticker = setInterval(report, 1000);
        const timer = setTimeout(() => {
            if (good.length < minSamples) {
                finish(geoError('not-enough'));
                return;
            }
            const avg = (key) => good.reduce((sum, r) => sum + r[key], 0) / good.length;
            finish(null, {
                latitude: avg('latitude'),
                longitude: avg('longitude'),
                accuracy: avg('accuracy'),
                samples: good.length,
            });
        }, durationMs);

        if (signal?.aborted) onAbort();
        else signal?.addEventListener('abort', onAbort);
        report();
    });

/** Great-circle distance in meters between two { latitude, longitude } points. */
export const distanceMeters = (a, b) => {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLng = toRad(b.longitude - a.longitude);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
};

/** True when `point` is inside the circle around `site` ({ latitude, longitude, radius_m }). */
export const isWithinSite = (point, site) => distanceMeters(point, site) <= site.radius_m;

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

/** Walking directions to a point in the phone's maps app (Apple Maps on iPhone, Google Maps elsewhere). */
export const directionsUrl = ({ latitude, longitude }) => {
    const isApple = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
    return isApple
        ? `https://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=w`
        : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`;
};

// Starting a session: the student must be inside the site's circle, plus 0.7 x GPS accuracy (at most
// 20 m). Same rule and wording as _outside_site_error in backend/core/views.py, which enforces it;
// checking here too shows the message right away instead of after a server round trip.
const START_ACCURACY_FACTOR = 0.7;
const START_ACCURACY_MAX_M = 20;

/** Message when `point` ({ latitude, longitude, accuracy }) is outside `site` ({ latitude, longitude, radius }), else null. */
export const outsideSiteMessage = (point, site, placeName) => {
    const distance = distanceMeters(point, site);
    const allowed = site.radius + Math.min(Math.max(point.accuracy || 0, 0) * START_ACCURACY_FACTOR, START_ACCURACY_MAX_M);
    if (distance <= allowed) return null;
    return `You're ${Math.round(distance)} m away from ${placeName || 'your service site'}. Go inside the service area (within ${Math.round(site.radius)} m) and scan again to start your timer.`;
};
