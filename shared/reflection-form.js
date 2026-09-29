// FM-USTP-OSA-14 "Student Reflection Form": the blank paper form (A4 portrait), filled in by hand after the
// community service and brought to OSA with the signed ISO form. Same header as shared/iso-form.js.
// Students download it as a PDF: the website with html2canvas + jsPDF, the app with expo-print.

import { OSACONNECT_LOGO } from './osaconnect-logo';

const LINES = 10; // writing lines under each question

const STYLE = `
  @page { size: A4 portrait; margin: 12mm 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 10pt; line-height: 1.3; }
  .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 4mm; }
  .brand { display: flex; align-items: center; gap: 3mm; }
  .logo { height: 11mm; width: auto; display: block; }
  .century { font-size: 8pt; font-weight: 700; color: #1a2d6d; letter-spacing: .5px; line-height: 1.25; border-left: 1px solid #1a2d6d; padding-left: 3mm; }
  .doc { border-collapse: separate; border-spacing: 0; border-top: 1px solid #1a2d6d; border-left: 1px solid #1a2d6d; font-size: 7.5pt; text-align: center; }
  .doc td { border-right: 1px solid #1a2d6d; border-bottom: 1px solid #1a2d6d; padding: .5mm 2mm; line-height: 1.4; vertical-align: middle; }
  .doc .title { background: #1a2d6d; color: #fff; font-size: 7pt; }
  .doc .code { font-size: 12pt; font-weight: 900; color: #1a2d6d; }
  .doc .label { background: #1a2d6d; color: #fff; font-size: 6.5pt; }
  .uni { margin-top: 3mm; text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 14pt; font-variant: small-caps; color: #1a2d6d; }
  .campuses { text-align: center; font-size: 7pt; color: #444; }
  .office { margin-top: 1.5mm; text-align: center; font-weight: 700; font-size: 10pt; }
  .form-title { margin-top: 5mm; text-align: center; font-family: 'Times New Roman', Times, serif; font-weight: 700; font-size: 16pt; letter-spacing: .5px; }
  .fields { margin-top: 6mm; display: grid; grid-template-columns: 1fr 1fr; column-gap: 8mm; row-gap: 3.5mm; font-family: 'Times New Roman', Times, serif; font-size: 11pt; }
  .field { display: flex; align-items: flex-end; gap: 2mm; }
  .field.wide { grid-column: 1 / -1; }
  .field span { white-space: nowrap; }
  .field i { flex: 1; border-bottom: 1px solid #111; height: 5mm; }
  .question { margin-top: 6mm; font-family: 'Times New Roman', Times, serif; font-weight: 700; font-size: 11.5pt; }
  .line { border-bottom: 1px solid #111; height: 7.2mm; }
  .foot { margin-top: 8mm; font-size: 7.5pt; color: #333; text-align: center; line-height: 1.4; }
  .foot-row { margin-top: 6mm; display: flex; align-items: flex-end; justify-content: space-between; gap: 4mm; }
  .foot-row .foot { flex: 1; margin-top: 0; }
  .cert { display: flex; align-items: center; gap: 1.5mm; border: 1px solid #1a2d6d; padding: 1mm 1.5mm; }
  .cert-mark { width: 7mm; height: 7mm; border-radius: 50%; border: 1.5px solid #1a2d6d; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #1a2d6d; font-size: 11pt; }
  .cert-text { line-height: 1.15; color: #1a2d6d; font-size: 6.5pt; }
  .cert-text b { display: block; font-size: 7.5pt; letter-spacing: .3px; }
`;

const lines = () => '<div class="line"></div>'.repeat(LINES);

const PAGE = `
  <div class="head">
    <div class="brand">
      <img class="logo" src="${OSACONNECT_LOGO}" alt="OSAConnect">
      <div class="century">ONE CENTURY<br>ONE VISION<br>ONE USTP</div>
    </div>
    <table class="doc">
      <tr><td colspan="3" class="title">Document Code No.</td></tr>
      <tr><td colspan="3" class="code">FM-USTP-OSA-14</td></tr>
      <tr><td class="label">Rev. No.</td><td class="label">Effective Date</td><td class="label">Page No.</td></tr>
      <tr><td>00</td><td>03.16.2026</td><td>1 of 1</td></tr>
    </table>
  </div>
  <div class="uni">University of Science and Technology of Southern Philippines</div>
  <div class="campuses">Alubijid | Balubal | Cagayan de Oro | Claveria | Jasaan | Oroquieta | Panaon | Villanueva</div>
  <div class="office">OFFICE OF STUDENT AFFAIRS</div>

  <div class="form-title">STUDENT REFLECTION FORM</div>

  <div class="fields">
    <div class="field wide"><span>Name:</span><i></i></div>
    <div class="field"><span>Student ID Number:</span><i></i></div>
    <div class="field"><span>Course &amp; Year:</span><i></i></div>
    <div class="field"><span>Contact Number:</span><i></i></div>
    <div class="field"><span>Violation:</span><i></i></div>
    <div class="field"><span>Office Endorsed:</span><i></i></div>
    <div class="field"><span>Rendered Hours:</span><i></i></div>
  </div>

  <div class="question">What did you learn from serving your Community Service?</div>
  ${lines()}

  <div class="question">How will this affect your future actions?</div>
  ${lines()}

  <div class="foot-row">
    <div class="foot">
      C.M. Recto Avenue, Lapasan, Cagayan de Oro City 9000 Philippines<br>
      Tel Nos. +63 (88) 856 1738; Telefax +63 (88) 856 4696 | http://www.ustp.edu.ph
    </div>
    <div class="cert"><div class="cert-mark">S</div><div class="cert-text">ISO 9001<b>SOCOTEC</b></div></div>
  </div>
`;

export function reflectionFormHtml() {
    return `<!doctype html><html><head><meta charset="utf-8"><title>FM-USTP-OSA-14</title>
<style>${STYLE}</style></head><body>${PAGE}</body></html>`;
}
