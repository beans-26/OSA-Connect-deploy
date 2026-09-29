// A clearance photo (ISO form, reflection paper) made as small as it can be while the handwriting stays
// readable: at most MAX_SIDE px on the long side, WebP where the browser can make it (JPEG otherwise), and
// the quality lowered step by step until the file is under TARGET_BYTES (usually 50-90 KB instead of the
// 2-5 MB a phone camera takes). Used by the admin dashboard and the phone capture page. The server refuses
// anything over ~200 KB (MAX_CLEARANCE_PHOTO_CHARS in backend core/views.py).
const MAX_SIDE = 1280;
const TARGET_BYTES = 90 * 1024;
const QUALITIES = [0.7, 0.6, 0.5, 0.42, 0.35, 0.28];

// Bytes in a base64 data URL
const sizeOf = (dataUrl) => Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4);

const loadImage = (file) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file isn\'t a photo.')); };
    img.src = url;
});

const draw = (img, maxSide) => {
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; // transparent PNGs get a white page, not black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
};

export const photoToDataUrl = async (file) => {
    const img = await loadImage(file);
    // Safari makes PNG when asked for WebP: then JPEG is the smaller choice
    const type = draw(img, 8).toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
    let smallest = null;
    for (const maxSide of [MAX_SIDE, 1024, 800]) {
        const canvas = draw(img, maxSide);
        for (const quality of QUALITIES) {
            const dataUrl = canvas.toDataURL(type, quality);
            if (!smallest || sizeOf(dataUrl) < sizeOf(smallest)) smallest = dataUrl;
            if (sizeOf(dataUrl) <= TARGET_BYTES) return dataUrl;
        }
    }
    return smallest; // a very detailed photo: the smallest try
};
