import { isoFormHtml } from '../../../shared/iso-form';
import { reflectionFormHtml } from '../../../shared/reflection-form';

// The blank OSA forms as one-page A4 PDFs. The form's HTML is drawn in a hidden frame at A4 size (96 dpi),
// captured with html2canvas and placed on one jsPDF page. The PDF libraries load only when a student
// downloads a form.
const A4 = { landscape: [1123, 794], portrait: [794, 1123] };

async function formPdf(html, orientation, padding) {
    const [WIDTH, HEIGHT] = A4[orientation];
    const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = `position:fixed;left:-${WIDTH * 2}px;top:0;width:${WIDTH}px;height:${HEIGHT}px;border:0`;
    document.body.appendChild(frame);
    try {
        const doc = frame.contentDocument;
        doc.open();
        doc.write(html);
        doc.close();
        // The form's @page margin only applies when printing: pad the page instead
        Object.assign(doc.body.style, { width: `${WIDTH}px`, height: `${HEIGHT}px`, padding, background: '#ffffff', position: 'relative' });
        await doc.fonts?.ready;
        const capture = (foreignObjectRendering) => html2canvas(doc.body, {
            scale: 3, backgroundColor: '#ffffff', width: WIDTH, height: HEIGHT, windowWidth: WIDTH, windowHeight: HEIGHT, foreignObjectRendering,
        }).then((canvas) => canvas.toDataURL('image/jpeg', 0.9));
        // The browser draws the page itself (html2canvas's own drawing puts table text on the lines);
        // Safari may refuse to export that, so fall back to html2canvas's drawing there
        const image = await capture(true).catch(() => capture(false));
        const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
        const [w, h] = orientation === 'landscape' ? [297, 210] : [210, 297];
        pdf.addImage(image, 'JPEG', 0, 0, w, h);
        return pdf;
    } finally {
        frame.remove();
    }
}

// FM-USTP-OSA-013, two copies side by side (landscape)
export const isoFormPdf = () => formPdf(isoFormHtml(), 'landscape', '7mm');

// FM-USTP-OSA-14 student reflection form (portrait)
export const reflectionFormPdf = () => formPdf(reflectionFormHtml(), 'portrait', '12mm 14mm');
