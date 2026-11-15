// The guard / faculty Analytics as a PDF (pages/guard/GuardAnalytics.jsx): the whole page for the chosen period,
// the total and every breakdown (department, violation type, gender, year level, course) with counts and shares.
// Counts only, no student names, same as the page (GET /api/violations/summary/).
const NAVY = [16, 26, 75];

export async function downloadAnalyticsPdf({ data, periodLabel, breakdowns, preparedBy }) {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    const now = new Date();
    const stamp = now.toLocaleString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

    // Navy band with the title
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageWidth, 86, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('OSAConnect · Violation Analytics', margin, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.text(`${periodLabel} · Counts of the violations you reported`, margin, 60);

    // Who and when
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9.5);
    doc.text(`Generated ${stamp}${preparedBy ? ` · by ${preparedBy}` : ''}`, margin, 110);
    doc.text('Counts only (no student names). Dismissed reports are not counted.', margin, 124);

    // The total
    doc.setDrawColor(254, 202, 202);
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin, 138, pageWidth - margin * 2, 46, 8, 8, 'FD');
    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('VIOLATIONS REPORTED', margin + 14, 166);
    doc.setFontSize(22);
    doc.text(String(data.total ?? 0), pageWidth - margin - 14, 169, { align: 'right' });

    // One table per breakdown
    let y = 210;
    const pct = (n) => (data.total ? `${Math.round((n / data.total) * 1000) / 10}%` : '0%');
    for (const b of breakdowns) {
        const rows = (data[b.id] || []).map((r) => [r.label, String(r.count), pct(r.count)]);
        autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [[`By ${b.label}`, 'Count', 'Share']],
            body: rows.length ? rows : [['No reports', '0', '0%']],
            theme: 'grid',
            styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 5, textColor: [30, 41, 59], lineColor: [226, 232, 240] },
            headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
            columnStyles: { 1: { halign: 'right', cellWidth: 60 }, 2: { halign: 'right', cellWidth: 60 } },
            alternateRowStyles: { fillColor: [248, 250, 252] },
        });
        y = doc.lastAutoTable.finalY + 18;
    }

    // Page numbers
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i += 1) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} of ${pages}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
    }

    const day = now.toISOString().slice(0, 10);
    doc.save(`OSAConnect Analytics - ${periodLabel} - ${day}.pdf`);
}
