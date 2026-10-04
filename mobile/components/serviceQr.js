// Reads the service QR codes a student scans to start or stop their timer.
// Same rules as processCode / processStopCode in frontend/src/pages/StudentDashboard.jsx; keep the two in sync.
//
// Only registered service sites (Admin > Settings > Service Sites) are accepted: their QR holds just the site
// code, e.g. "LIB-01". The same QR starts a session and ends the one that was started there; the server looks
// up the site's location from the code. The old OSA action and building codes were retired.
// Returns { action: 'site', siteCode } or null for anything else (random QRs, student IDs, ...).

// Same rule as backend/core/site_views.py
const SITE_CODE_PATTERN = /^[A-Z0-9]{2,10}-[A-Z0-9]{1,6}$/;

export const parseServiceQr = (raw) => {
    const code = String(raw || '').trim().toUpperCase();
    return SITE_CODE_PATTERN.test(code) ? { action: 'site', siteCode: code } : null;
};

export const NOT_A_START_QR = "This isn't a service site QR code. Scan the QR code posted at your service site.";
export const NOT_A_STOP_QR = "This isn't a service site QR code. Scan your service site's QR code to end your session.";

/** 'in' or 'out' for this code given whether a session is running, or null if it can't be used. */
export const serviceQrAction = (code, timerActive) => {
    if (code?.action !== 'site') return null;
    return timerActive ? 'out' : 'in';
};
