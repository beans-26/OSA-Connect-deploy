// Reads the service QR codes a student scans to start or stop their timer.
// Same rules as processCode / processStopCode in frontend/src/pages/StudentDashboard.jsx; keep the two in sync.
//
// Returns { action: 'in' | 'out' | 'site', lat, lng, radius, siteCode } or null for anything else
// (random QRs, student IDs, ...). lat/lng/radius are the service hub for location codes, null otherwise.
// action 'site' is a registered service site (Admin > Settings > Service Sites): it starts a session,
// or ends the one that was started there; the server looks up its location from siteCode.

const BUILDINGS = [
    { codes: ['XKMBPQLVJZWFRCYTNDHSGEUIA', 'CITC-DEPT'], lat: 8.503306, lng: 124.660861 },
    { codes: ['CSM-DEPT'], lat: 8.485421, lng: 124.656812 },
    { codes: ['CEA-DEPT'], lat: 8.485721, lng: 124.657112 },
];
const HUB_RADIUS = 15;

const START_CODES = ['OSA-START', 'OSA-RESUME'];
// Site QRs hold only the site code, e.g. "LIB-01" (same rule as backend/core/site_views.py)
const SITE_CODE_PATTERN = /^[A-Z0-9]{2,10}-[A-Z0-9]{1,6}$/;
const STOP_CODES = ['OSA-PAUSE', 'OSA-STOP', 'OSA-OUT', 'VNZMXBCALSKDJFHGQPWIEURYT'];

export const parseServiceQr = (raw) => {
    const code = String(raw || '').trim().toUpperCase();
    if (!code) return null;

    // Dynamic location code: LAT:8.485121,LNG:124.656512
    const lat = code.match(/LAT:(-?\d+\.\d+)/);
    const lng = code.match(/LNG:(-?\d+\.\d+)/);
    if (lat && lng) {
        return { action: 'in', lat: parseFloat(lat[1]), lng: parseFloat(lng[1]), radius: HUB_RADIUS };
    }

    const building = BUILDINGS.find((b) => b.codes.some((c) => code.includes(c)));
    if (building) return { action: 'in', lat: building.lat, lng: building.lng, radius: HUB_RADIUS };

    if (START_CODES.some((c) => code.includes(c))) return { action: 'in', lat: null, lng: null, radius: null };
    if (STOP_CODES.some((c) => code.includes(c))) return { action: 'out', lat: null, lng: null, radius: null };

    // Checked last: the OSA action/building codes above look similar ("OSA-START", "CITC-DEPT")
    if (SITE_CODE_PATTERN.test(code)) return { action: 'site', lat: null, lng: null, radius: null, siteCode: code };

    return null;
};

export const NOT_A_START_QR = "This isn't a valid OSA start code. Scan the QR code posted at your service area.";
export const NOT_A_STOP_QR = "This isn't a stop code. Scan your service site's QR code or the OSA stop code.";

/** 'in' or 'out' for this code given whether a session is running, or null if it can't be used now. */
export const serviceQrAction = (code, timerActive) => {
    if (!code) return null;
    if (code.action === 'site') return timerActive ? 'out' : 'in';
    if (code.action === (timerActive ? 'out' : 'in')) return code.action;
    return null;
};
