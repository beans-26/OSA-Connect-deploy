// Violation reports for the admin Analytics page: which violations fall in a day, month, quarter or year,
// how they break down (status, violation type, department, gender, year level, course), and the PDF.
// Times are the admin's local time (Philippine time on campus).

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const PERIODS = [
    { id: 'daily', label: 'Daily' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'quarterly', label: 'Quarterly' },
    { id: 'annually', label: 'Annually' },
];

const hourLabel = (h) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;

/**
 * The time range and chart buckets for a period.
 * sel: { date: 'YYYY-MM-DD', month: 0-11, quarter: 1-4, year }
 */
export function periodRange(period, sel) {
    const { year } = sel;
    if (period === 'daily') {
        const [y, m, d] = sel.date.split('-').map(Number);
        const start = new Date(y, m - 1, d);
        return {
            start,
            end: new Date(y, m - 1, d + 1),
            label: start.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            trendTitle: 'Reports by hour',
            buckets: Array.from({ length: 24 }, (_, h) => ({ label: hourLabel(h), start: new Date(y, m - 1, d, h), end: new Date(y, m - 1, d, h + 1) })),
        };
    }
    if (period === 'monthly') {
        const days = new Date(year, sel.month + 1, 0).getDate();
        return {
            start: new Date(year, sel.month, 1),
            end: new Date(year, sel.month + 1, 1),
            label: `${MONTHS[sel.month]} ${year}`,
            trendTitle: 'Reports by day',
            buckets: Array.from({ length: days }, (_, i) => ({ label: String(i + 1), start: new Date(year, sel.month, i + 1), end: new Date(year, sel.month, i + 2) })),
        };
    }
    if (period === 'quarterly') {
        const first = (sel.quarter - 1) * 3;
        return {
            start: new Date(year, first, 1),
            end: new Date(year, first + 3, 1),
            label: `Q${sel.quarter} ${year} (${MONTHS[first]} – ${MONTHS[first + 2]})`,
            trendTitle: 'Reports by month',
            buckets: [0, 1, 2].map((i) => ({ label: MONTHS[first + i], start: new Date(year, first + i, 1), end: new Date(year, first + i + 1, 1) })),
        };
    }
    return {
        start: new Date(year, 0, 1),
        end: new Date(year + 1, 0, 1),
        label: `Year ${year}`,
        trendTitle: 'Reports by month',
        buckets: MONTHS.map((m, i) => ({ label: m.slice(0, 3), start: new Date(year, i, 1), end: new Date(year, i + 1, 1) })),
    };
}

// Where a violation is in the process (violation.status)
export const statusGroup = (status = '') => {
    const s = status.toLowerCase();
    if (s.includes('pending')) return 'Pending review';
    if (s === 'approved') return 'Serving hours';
    if (s === 'completed') return 'Hours completed';
    if (s === 'cleared' || s === 'finished') return 'Cleared';
    if (s === 'dismissed') return 'Dismissed';
    return status || 'Other';
};
export const STATUS_ORDER = ['Pending review', 'Serving hours', 'Hours completed', 'Cleared', 'Dismissed'];

const yearLevelLabel = (value) => {
    const v = String(value || '').trim();
    return /^\d+$/.test(v) ? `Year ${v}` : v;
};

// Breakdown keys: label and how to read each violation
export const BREAKDOWNS = [
    { id: 'violation_type', label: 'Violation Type', value: (v) => v.violation_type },
    { id: 'department', label: 'Department', value: (v) => v.student_details?.department },
    { id: 'gender', label: 'Gender', value: (v) => v.student_details?.gender },
    { id: 'year_level', label: 'Year Level', value: (v) => yearLevelLabel(v.student_details?.year_level) },
    { id: 'course', label: 'Course', value: (v) => v.student_details?.course },
];

/** [{ label, count }] most first; blanks count as "Not recorded" */
export const countBy = (list, value) => {
    const counts = new Map();
    list.forEach((v) => {
        const key = String(value(v) || '').trim() || 'Not recorded';
        counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

/** Everything the page and the PDF show for one period */
export function buildReport(violations, period, sel) {
    const range = periodRange(period, sel);
    const inPeriod = violations
        .filter((v) => {
            const t = new Date(v.created_at);
            return t >= range.start && t < range.end;
        })
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const statusCounts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0]));
    inPeriod.forEach((v) => { const g = statusGroup(v.status); statusCounts[g] = (statusCounts[g] || 0) + 1; });
    // Dismissed reports weren't violations after all: they're left out of the breakdowns
    const counted = inPeriod.filter((v) => statusGroup(v.status) !== 'Dismissed');
    return {
        period,
        range,
        violations: inPeriod,
        total: inPeriod.length,
        students: new Set(counted.map((v) => v.student_details?.student_id).filter(Boolean)).size,
        statusCounts,
        trend: range.buckets.map((b) => counted.filter((v) => { const t = new Date(v.created_at); return t >= b.start && t < b.end; }).length),
        breakdowns: Object.fromEntries(BREAKDOWNS.map((b) => [b.id, countBy(counted, b.value)])),
        countedTotal: counted.length,
    };
}

const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
});

/**
 * Downloads the report as a PDF (A4 portrait): header, summary, the trend chart (a PNG data URL from the
 * chart on the page, optional), the breakdown tables and the list of violations.
 */
export async function downloadReportPdf(report, trendImage) {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const periodName = PERIODS.find((p) => p.id === report.period)?.label || '';

    const [ustp, osa] = await Promise.all([loadImage('/ustp.png').catch(() => null), loadImage('/osa-logo.jpg').catch(() => null)]);
    if (ustp) doc.addImage(ustp, 'PNG', 12, 10, 16, 16);
    if (osa) doc.addImage(osa, 'JPEG', 30, 10, 16, 16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('UNIVERSITY OF SCIENCE AND TECHNOLOGY OF SOUTHERN PHILIPPINES', 50, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('OFFICE OF STUDENT AFFAIRS - CAGAYAN DE ORO', 50, 18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`${periodName.toUpperCase()} VIOLATION REPORT`, 50, 24.5);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(report.range.label, 12, 34);
    doc.setFontSize(7.5);
    doc.setTextColor(100);
    doc.text(`Generated ${new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })} · OSAConnect`, pageWidth - 12, 34, { align: 'right' });
    doc.setTextColor(0);

    const tableStyle = {
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.4, textColor: [15, 23, 42], lineColor: [203, 213, 225], lineWidth: 0.1 },
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
        margin: { left: 12, right: 12 },
    };
    const pct = (n, of) => (of ? `${Math.round((n / of) * 100)}%` : '0%');

    autoTable(doc, {
        ...tableStyle,
        startY: 38,
        head: [['Summary', 'Count']],
        body: [
            ['Total reports', report.total],
            ...STATUS_ORDER.map((s) => [s, report.statusCounts[s] || 0]),
            ['Students with violations', report.students],
        ],
        columnStyles: { 1: { halign: 'right', cellWidth: 30 } },
        tableWidth: 90,
    });
    let y = doc.lastAutoTable.finalY + 6;

    if (trendImage) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(report.range.trendTitle, 12, y);
        const width = pageWidth - 24;
        doc.addImage(trendImage, 'PNG', 12, y + 2, width, width * 0.32);
        y += width * 0.32 + 8;
    }

    // Breakdowns two per row
    const breakdowns = [
        ['Violation Type', 'violation_type'], ['Department', 'department'],
        ['Gender', 'gender'], ['Year Level', 'year_level'], ['Course', 'course'],
    ];
    const half = (pageWidth - 24 - 6) / 2;
    for (let i = 0; i < breakdowns.length; i += 2) {
        let rowBottom = y;
        breakdowns.slice(i, i + 2).forEach(([title, id], col) => {
            const rows = report.breakdowns[id];
            autoTable(doc, {
                ...tableStyle,
                startY: y,
                head: [[title, 'Count', '%']],
                body: rows.length ? rows.map((r) => [r.label, r.count, pct(r.count, report.countedTotal)]) : [['No data', '', '']],
                columnStyles: { 1: { halign: 'right', cellWidth: 14 }, 2: { halign: 'right', cellWidth: 13 } },
                margin: { left: 12 + col * (half + 6), right: 12 },
                tableWidth: half,
            });
            rowBottom = Math.max(rowBottom, doc.lastAutoTable.finalY);
        });
        y = rowBottom + 6;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    if (y > 270) { doc.addPage(); y = 16; }
    doc.text(`Violations (${report.total})`, 12, y);
    autoTable(doc, {
        ...tableStyle,
        startY: y + 2,
        styles: { ...tableStyle.styles, fontSize: 7 },
        head: [['Date', 'Student ID', 'Name', 'Gender', 'Dept.', 'Course / Year', 'Violation', 'Offense', 'Status']],
        body: report.violations.length ? report.violations.map((v) => {
            const s = v.student_details || {};
            const dept = (String(s.department || '').match(/\(([^)]+)\)\s*$/) || [])[1] || s.department || '—';
            return [
                new Date(v.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
                s.student_id || '—',
                s.name || '—',
                s.gender || '—',
                dept,
                [s.course, yearLevelLabel(s.year_level)].filter(Boolean).join(' · ') || '—',
                v.violation_type || '—',
                `#${v.offense_count || 1}`,
                statusGroup(v.status),
            ];
        }) : [[{ content: 'No violations were reported in this period.', colSpan: 9, styles: { halign: 'center' } }]],
    });

    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p += 1) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setTextColor(120);
        doc.text(`Page ${p} of ${pages}`, pageWidth - 12, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    }
    const stamp = report.range.start.toLocaleDateString('en-CA');
    doc.save(`OSA_${periodName}_Violation_Report_${stamp}.pdf`);
}
