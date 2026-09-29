// FM-USTP-OSA-013 "Community Service Time Log and Summary": the blank paper form, filled in by hand.
// Printed like the original: two copies side by side on a landscape sheet, to be cut in half.
// Students download it as a PDF: the website with html2canvas + jsPDF, the app with expo-print.

import { OSACONNECT_LOGO } from './osaconnect-logo';

const ROWS = 8;

const STYLE = `
  @page { size: A4 landscape; margin: 7mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 8.5pt; line-height: 1.3; }
  .sheet { display: flex; gap: 10mm; page-break-after: always; break-after: page; }
  .sheet:last-child { page-break-after: auto; break-after: auto; }
  .copy { flex: 1; min-width: 0; }
  .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 3mm; }
  .brand { display: flex; align-items: center; gap: 2.5mm; }
  .logo { height: 8mm; width: auto; display: block; }
  .century { font-size: 6.5pt; font-weight: 700; color: #1a2d6d; letter-spacing: .5px; line-height: 1.25; border-left: 1px solid #1a2d6d; padding-left: 2.5mm; }
  .doc { border-collapse: separate; border-spacing: 0; border-top: 1px solid #1a2d6d; border-left: 1px solid #1a2d6d; font-size: 6.5pt; text-align: center; }
  .doc td { border-right: 1px solid #1a2d6d; border-bottom: 1px solid #1a2d6d; padding: .4mm 1.5mm; line-height: 1.4; vertical-align: middle; }
  .doc .title { background: #1a2d6d; color: #fff; font-size: 6pt; }
  .doc .code { font-size: 10pt; font-weight: 900; color: #1a2d6d; }
  .doc .label { background: #1a2d6d; color: #fff; font-size: 5.5pt; }
  .uni { margin-top: 2mm; font-family: 'Times New Roman', Times, serif; font-size: 11pt; font-variant: small-caps; color: #1a2d6d; }
  .campuses { font-size: 6pt; color: #444; }
  .office { margin-top: 2.5mm; text-align: center; font-weight: 700; font-size: 9pt; }
  .form-title { text-align: center; font-weight: 700; font-size: 8.5pt; margin-top: 1mm; }
  .important { display: flex; gap: 2mm; margin-top: 2.5mm; font-size: 7.3pt; line-height: 1.3; }
  .important .item { display: flex; gap: 1.5mm; }
  .log { width: 100%; border-collapse: separate; border-spacing: 0; border-top: 1px solid #111; border-left: 1px solid #111; margin-top: 2mm; }
  .log th, .log td { border-right: 1px solid #111; border-bottom: 1px solid #111; padding: 0 1.5mm; height: 6.2mm; font-size: 7.5pt; }
  .log th { font-weight: 400; height: 6mm; line-height: 6mm; }
  .label-line { margin-top: 2.5mm; margin-bottom: 1mm; font-weight: 700; text-decoration: underline; }
  .sign { width: 100%; border-collapse: separate; border-spacing: 0; border-top: 1px solid #111; border-left: 1px solid #111; margin-top: 0; font-size: 7.3pt; }
  .sign td { border-right: 1px solid #111; border-bottom: 1px solid #111; padding: 1.2mm 1.5mm; vertical-align: top; width: 50%; }
  .sign .ack { font-style: italic; line-height: 1.3; height: 14mm; }
  .sign .name { height: 8mm; vertical-align: bottom; text-align: center; font-weight: 700; }
  .sign .caption { text-align: center; padding: .8mm 1.5mm; line-height: 1.4; }
  .foot { margin-top: 3mm; font-size: 6pt; color: #333; text-align: center; line-height: 1.35; }
  .foot-row { margin-top: 3mm; display: flex; align-items: flex-end; justify-content: space-between; gap: 4mm; }
  .foot-row .foot { flex: 1; margin-top: 0; }
  .cert { display: flex; align-items: center; gap: 1.5mm; border: 1px solid #1a2d6d; padding: 1mm 1.5mm; }
  .cert-mark { width: 5mm; height: 5mm; border-radius: 50%; border: 1.5px solid #1a2d6d; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #1a2d6d; font-size: 8pt; }
  .cert-text { line-height: 1.15; color: #1a2d6d; font-size: 5pt; }
  .cert-text b { display: block; font-size: 5.5pt; letter-spacing: .3px; }
`;

const COPY = `<div class="copy">
  <div class="head">
    <div class="brand">
      <img class="logo" src="${OSACONNECT_LOGO}" alt="OSAConnect">
      <div class="century">ONE CENTURY<br>ONE VISION<br>ONE USTP</div>
    </div>
    <table class="doc">
      <tr><td colspan="3" class="title">Document Code No.</td></tr>
      <tr><td colspan="3" class="code">FM-USTP-OSA-013</td></tr>
      <tr><td class="label">Rev. No.</td><td class="label">Effective Date</td><td class="label">Page No.</td></tr>
      <tr><td>00</td><td>03.16.2026</td><td>1 of 1</td></tr>
    </table>
  </div>
  <div class="uni">University of Science and Technology of Southern Philippines</div>
  <div class="campuses">Alubijid | Balubal | Cagayan de Oro | Claveria | Jasaan | Oroquieta | Panaon | Villanueva</div>
  <div class="office">OFFICE OF STUDENT AFFAIRS</div>
  <div class="form-title">COMMUNITY SERVICE TIME LOG AND SUMMARY</div>

  <div class="important">
    <b>IMPORTANT:</b>
    <div>
      <div class="item"><span>1.</span><span>This form should be accomplished under the office head's supervision.</span></div>
      <div class="item"><span>2.</span><span><b>TO THE HEAD OF THE OFFICE:</b> In the assignment of the student, always put premium to the safety of the student. Assigning students to tasks that would expose them to hazardous substances, dangerous materials, and potentially risky labor is strictly prohibited. Possible services that can be rendered by the student are assisting, clerical, labor, cleaning, logistics, messengerial, and other services analogous to these.</span></div>
      <div class="item"><span>3.</span><span><b>TO THE STUDENT:</b> This slip is your temporary gate pass, so do not lose and crumple this.</span></div>
    </div>
  </div>

  <table class="log">
    <thead><tr><th style="width:26%">In</th><th style="width:26%">Out</th><th style="width:16%">Total Hours</th><th>Office Head's Signature</th></tr></thead>
    <tbody>${'<tr><td></td><td></td><td></td><td></td></tr>'.repeat(ROWS)}</tbody>
  </table>

  <div class="label-line">WORK DESCRIPTION:</div>

  <table class="sign">
    <tr>
      <td class="ack">I hereby acknowledge that I have served my community service hours completely and that the above information are true and correct to the best of my knowledge.</td>
      <td>Certified by:</td>
    </tr>
    <tr><td class="name"></td><td class="name"></td></tr>
    <tr><td class="caption">Name and Signature of Student</td><td class="caption">Name and Signature of Office Head</td></tr>
    <tr><td></td><td>Office Endorsed:</td></tr>
  </table>

  <div class="foot-row">
    <div class="foot">
      C.M. Recto Avenue, Lapasan, Cagayan de Oro City 9000 Philippines<br>
      Tel Nos. +63 (88) 856 1738; Telefax +63 (88) 856 4696 | http://www.ustp.edu.ph
    </div>
    <div class="cert"><div class="cert-mark">S</div><div class="cert-text">ISO 9001<b>SOCOTEC</b></div></div>
  </div>
</div>`;

export function isoFormHtml() {
    return `<!doctype html><html><head><meta charset="utf-8"><title>FM-USTP-OSA-013</title>
<style>${STYLE}</style></head><body><div class="sheet">${COPY}${COPY}</div></body></html>`;
}
