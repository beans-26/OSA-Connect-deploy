import { isoFormHtml } from '../../../shared/iso-form';

// The blank FM-USTP-OSA-013 form as an A4 landscape PDF. The form's HTML is drawn in a hidden frame
// at A4 landscape size (96 dpi), captured with html2canvas and placed on one jsPDF page.
// The PDF libraries load only when a student downloads the form.
const WIDTH = 1123;
const HEIGHT = 794;

export async function isoFormPdf() {
    const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = `position:fixed;left:-${WIDTH * 2}px;top:0;width:${WIDTH}px;height:${HEIGHT}px;border:0`;
    document.body.appendChild(frame);
    try {
        const doc = frame.contentDocument;
        doc.open();
        doc.write(isoFormHtml());
        doc.close();
        // The form's @page margin only applies when printing: pad the page instead
        Object.assign(doc.body.style, { width: `${WIDTH}px`, height: `${HEIGHT}px`, padding: '7mm', background: '#ffffff' });
        await doc.fonts?.ready;
        const capture = (foreignObjectRendering) => html2canvas(doc.body, {
            scale: 3, backgroundColor: '#ffffff', width: WIDTH, height: HEIGHT, windowWidth: WIDTH, windowHeight: HEIGHT, foreignObjectRendering,
        }).then((canvas) => canvas.toDataURL('image/jpeg', 0.9));
        // The browser draws the page itself (html2canvas's own drawing puts table text on the lines);
        // Safari may refuse to export that, so fall back to html2canvas's drawing there
        const image = await capture(true).catch(() => capture(false));
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        pdf.addImage(image, 'JPEG', 0, 0, 297, 210);
        return pdf;
    } finally {
        frame.remove();
    }
}
