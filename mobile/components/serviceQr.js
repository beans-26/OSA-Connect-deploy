// Reads the service QR codes a student scans to start or stop their timer.
// Same rules as processCode / processStopCode in frontend/src/pages/StudentDashboard.jsx; keep the two in sync.
//
// Returns { action: 'in' | 'out', lat, lng, radius } or null for anything else (random QRs, student IDs, ...).
// lat/lng/radius are the service hub for location codes, null for the plain OSA action codes.

const BUILDINGS = [
    { codes: ['XKMBPQLVJZWFRCYTNDHSGEUIA', 'CITC-DEPT'], lat: 8.503306, lng: 124.660861 },
    { codes: ['CSM-DEPT'], lat: 8.485421, lng: 124.656812 },
    { codes: ['CEA-DEPT'], lat: 8.485721, lng: 124.657112 },
];
const HUB_RADIUS = 15;

const START_CODES = ['OSA-START', 'OSA-RESUME'];
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

    return null;
};

export const NOT_A_START_QR = "This isn't a valid OSA start code. Scan the QR code posted at your service area.";
export const NOT_A_STOP_QR = "This isn't the OSA stop code. Scan the stop QR code to end your session.";
