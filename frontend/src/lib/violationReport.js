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
        sel,
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

// The period just before the report's (for "+12% vs Aug"): the day, month, quarter or year before
function previousRange(period, sel) {
    if (period === 'daily') {
        const [y, m, d] = sel.date.split('-').map(Number);
        return { range: periodRange('daily', { ...sel, date: new Date(y, m - 1, d - 1).toLocaleDateString('en-CA') }), label: 'the day before' };
    }
    if (period === 'monthly') {
        const month = sel.month === 0 ? 11 : sel.month - 1;
        const year = sel.month === 0 ? sel.year - 1 : sel.year;
        return { range: periodRange('monthly', { ...sel, month, year }), label: MONTHS[month].slice(0, 3) };
    }
    if (period === 'quarterly') {
        const quarter = sel.quarter === 1 ? 4 : sel.quarter - 1;
        const year = sel.quarter === 1 ? sel.year - 1 : sel.year;
        return { range: periodRange('quarterly', { ...sel, quarter, year }), label: `Q${quarter}` };
    }
    return { range: periodRange('annually', { ...sel, year: sel.year - 1 }), label: String(sel.year - 1) };
}

// The trend line's points: weeks of a month (W1 = days 1-7 ...), 4-hour blocks of a day, else the months
function trendPoints(report) {
    const counted = report.violations.filter((v) => statusGroup(v.status) !== 'Dismissed');
    if (report.period === 'monthly') {
        const days = new Date(report.range.end - 1).getDate();
        const weeks = Array.from({ length: Math.ceil(days / 7) }, (_, i) => ({ label: `W${i + 1}`, count: 0 }));
        counted.forEach((v) => { weeks[Math.floor((new Date(v.created_at).getDate() - 1) / 7)].count += 1; });
        return { title: 'Weekly trend', points: weeks };
    }
    if (report.period === 'daily') {
        const blocks = Array.from({ length: 6 }, (_, i) => ({ label: hourLabel(i * 4).replace(' ', ''), count: 0 }));
        counted.forEach((v) => { blocks[Math.floor(new Date(v.created_at).getHours() / 4)].count += 1; });
        return { title: 'Through the day (4-hour blocks)', points: blocks };
    }
    return { title: 'Monthly trend', points: report.range.buckets.map((b, i) => ({ label: b.label.slice(0, 3), count: report.trend[i] })) };
}

/**
 * Downloads the report as a PDF laid out like OSA's monthly report (A4 portrait, print-friendly):
 * letterhead, 1) summary tiles, 2) charts (by violation type, trend), 3) breakdowns (college, repeat
 * violators), 4) the case list (the rest in an appendix), signature lines, and "Page x of y".
 * Hours, completion, repeat violators and the case list come from /api/violations/monthly_report/
 * for the same period.
 */
export async function downloadReportPdf(report) {
    const prev = previousRange(report.period, report.sel);
    const query = new URLSearchParams({
        start: report.range.start.toISOString(),
        end: report.range.end.toISOString(),
        prev_start: prev.range.start.toISOString(),
    });
    const response = await fetch(`/api/violations/monthly_report/?${query}`);
    if (!response.ok) throw new Error('report');
    const data = await response.json();

    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();   // 210
    const H = doc.internal.pageSize.getHeight();  // 297
    const M = 12;                                 // page margin
    const CW = W - M * 2;                          // content width
    const periodName = PERIODS.find((p) => p.id === report.period)?.label || '';
    const INK = [15, 23, 42], MUTED = [100, 116, 139], LINE = [226, 232, 240], TILE = [248, 250, 252];
    const BLUE = [37, 99, 235], RED = [220, 38, 38], GREEN = [5, 150, 105];
    const s = data.summary;

    const text = (str, x, y, { size = 8, bold = false, color = INK, align = 'left' } = {}) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(size);
        doc.setTextColor(...color);
        doc.text(String(str), x, y, { align });
    };
    const fit = (str, width, size) => {
        doc.setFontSize(size);
        let out = String(str);
        while (out.length > 3 && doc.getTextWidth(out) > width) out = `${out.slice(0, -2)}…`;
        return out;
    };
    const heading = (str, y) => text(str, M, y, { size: 9, bold: true });

    // Letterhead: USTP logo, title block, OSA logo
    const [ustp, osa] = await Promise.all([loadImage('/ustp.png').catch(() => null), loadImage('/osa-logo.jpg').catch(() => null)]);
    if (ustp) doc.addImage(ustp, 'PNG', M, 9, 17, 17);
    if (osa) doc.addImage(osa, 'JPEG', W - M - 17, 9, 17, 17);
    const generated = new Date(data.generated_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    text('Office of Student Affairs', W / 2, 13.5, { size: 8, color: MUTED, align: 'center' });
    text(`${periodName} violation and community service report`, W / 2, 20, { size: 13, bold: true, align: 'center' });
    text(`${report.range.label} · Generated ${generated} by ${data.generated_by}`, W / 2, 25.5, { size: 8, color: MUTED, align: 'center' });
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(M, 30, W - M, 30);

    // 1. Summary: four tiles
    let y = 37;
    heading('1. Summary', y);
    const change = s.previous_month ? Math.round(((s.violations - s.previous_month) / s.previous_month) * 100) : null;
    const completion = s.approved ? Math.round((s.completed / s.approved) * 100) : null;
    const num = (n) => (Number.isInteger(n) ? String(n) : Number(n).toFixed(1));
    const tiles = [
        ['Violations', s.violations, change === null ? `none in ${prev.label}` : `${change > 0 ? '+' : ''}${change}% vs ${prev.label}`, change > 0 ? RED : change < 0 ? GREEN : MUTED],
        ['Approved', s.approved, `${s.dismissed} dismissed · ${s.pending} pending`, MUTED],
        ['Hours rendered', num(s.hours_rendered), `of ${num(s.hours_assigned)} assigned`, MUTED],
        ['Completed', s.completed, completion === null ? 'no approved cases' : `${completion}% completion`, completion === null ? MUTED : GREEN],
    ];
    const tileW = (CW - 3 * 3) / 4;
    tiles.forEach(([label, value, note, noteColor], i) => {
        const x = M + i * (tileW + 3);
        doc.setFillColor(...TILE);
        doc.setDrawColor(...LINE);
        doc.roundedRect(x, y + 3, tileW, 21, 1.5, 1.5, 'FD');
        text(label, x + 3, y + 8.5, { size: 7.5, color: MUTED });
        text(value, x + 3, y + 16.5, { size: 16, bold: true });
        text(fit(note, tileW - 6, 7), x + 3, y + 21.5, { size: 7, color: noteColor });
    });

    // 2. Charts: by violation type (bars) and the trend (line), one series each in the same blue
    y += 31;
    heading('2. Charts', y);
    const boxW = (CW - 4) / 2, boxH = 56, boxY = y + 3;
    [M, M + boxW + 4].forEach((x) => { doc.setDrawColor(...LINE); doc.roundedRect(x, boxY, boxW, boxH, 1.5, 1.5, 'S'); });
    text('By violation type', M + 4, boxY + 7, { size: 8.5, bold: true });
    const types = data.by_type.slice(0, 6);
    const maxType = Math.max(1, ...types.map((t) => t.count));
    if (!types.length) text('No violations', M + boxW / 2, boxY + 30, { size: 8, color: MUTED, align: 'center' });
    types.forEach((t, i) => {
        const rowY = boxY + 15 + i * 7;
        text(fit(t.label, 33, 7.5), M + 4, rowY, { size: 7.5 });
        const barX = M + 39, barMax = boxW - 39 - 12;
        doc.setFillColor(241, 245, 249);
        doc.rect(barX, rowY - 2.6, barMax, 3.2, 'F');
        doc.setFillColor(...BLUE);
        doc.rect(barX, rowY - 2.6, Math.max(0.6, (t.count / maxType) * barMax), 3.2, 'F');
        text(t.count, M + boxW - 4, rowY, { size: 7.5, bold: true, align: 'right' });
    });
    const trend = trendPoints(report);
    const tx = M + boxW + 4;
    text(trend.title, tx + 4, boxY + 7, { size: 8.5, bold: true });
    const plotL = tx + 9, plotR = tx + boxW - 9, plotT = boxY + 15, plotB = boxY + boxH - 11;
    const maxPt = Math.max(1, ...trend.points.map((p) => p.count));
    const px = (i) => (trend.points.length === 1 ? (plotL + plotR) / 2 : plotL + (i * (plotR - plotL)) / (trend.points.length - 1));
    const py = (c) => plotB - (c / maxPt) * (plotB - plotT);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.25);
    doc.line(plotL - 3, plotB, plotR + 3, plotB);
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.6);
    trend.points.forEach((p, i) => { if (i) doc.line(px(i - 1), py(trend.points[i - 1].count), px(i), py(p.count)); });
    const labelEvery = Math.ceil(trend.points.length / 12); // a year's 12 months all fit
    trend.points.forEach((p, i) => {
        doc.setFillColor(...BLUE);
        doc.circle(px(i), py(p.count), 0.9, 'F');
        if (i % labelEvery === 0) text(p.label, px(i), plotB + 5, { size: 7, color: MUTED, align: 'center' });
        text(p.count, px(i), py(p.count) - 2, { size: 6.5, bold: true, color: INK, align: 'center' });
    });

    // 3. Breakdowns: colleges and repeat violators, side by side
    y = boxY + boxH + 8;
    heading('3. Breakdowns', y);
    const plainTable = {
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: { top: 1.3, bottom: 1.3, left: 0, right: 1 }, textColor: INK, lineColor: LINE, lineWidth: { bottom: 0.2 } },
        headStyles: { fontStyle: 'bold', textColor: INK, lineWidth: { bottom: 0.35 }, lineColor: [203, 213, 225] },
    };
    const colW = (CW - 8) / 2;
    const deptShort = (d) => (String(d || '').match(/\(([^)]+)\)\s*$/) || [])[1] || d;
    autoTable(doc, {
        ...plainTable,
        startY: y + 3,
        margin: { left: M },
        tableWidth: colW,
        head: [['College', { content: 'Count', styles: { halign: 'right' } }]],
        body: data.by_college.length ? data.by_college.map((r) => [deptShort(r.label), { content: r.count, styles: { halign: 'right' } }]) : [['No violations', '']],
    });
    const leftEnd = doc.lastAutoTable.finalY;
    autoTable(doc, {
        ...plainTable,
        startY: y + 3,
        margin: { left: M + colW + 8 },
        tableWidth: colW,
        head: [['Repeat violators', { content: 'Cases', styles: { halign: 'right' } }]],
        body: data.repeat_violators?.length
            ? data.repeat_violators.map((r) => [r.student_id, { content: r.cases, styles: { halign: 'right' } }])
            : [['None in this period', '']],
    });
    y = Math.max(leftEnd, doc.lastAutoTable.finalY) + 8;

    // 4. Case list: the first rows here, the rest in the appendix
    const cases = data.cases || [];
    const caseRow = (c) => [c.date, c.student_id, c.violation, c.status, { content: num(c.hours), styles: { halign: 'right' } }];
    const caseHead = [['Date', 'Student ID', 'Violation', 'Status', { content: 'Hrs', styles: { halign: 'right' } }]];
    const statusColor = { Completed: GREEN, Cleared: MUTED, Active: BLUE, Pending: [180, 83, 9], Dismissed: RED };
    const colorStatus = (hook) => {
        if (hook.section === 'body' && hook.column.index === 3) hook.cell.styles.textColor = statusColor[hook.cell.raw] || INK;
        if (hook.section === 'body' && hook.column.index === 3) hook.cell.styles.fontStyle = 'bold';
    };
    const SIGN_SPACE = 34; // signatures + footer at the bottom of the first page
    const rowsFit = Math.max(3, Math.floor((H - y - 10 - SIGN_SPACE - 12) / 6.2));
    const firstRows = cases.length > rowsFit ? cases.slice(0, rowsFit - 1) : cases;
    heading(cases.length > firstRows.length ? '4. Case list (continues in appendix)' : '4. Case list', y);
    autoTable(doc, {
        ...plainTable,
        startY: y + 3,
        margin: { left: M, right: M },
        head: caseHead,
        body: firstRows.length ? firstRows.map(caseRow) : [[{ content: 'No cases in this period.', colSpan: 5, styles: { textColor: MUTED } }]],
        didParseCell: colorStatus,
    });
    y = doc.lastAutoTable.finalY;
    if (cases.length > firstRows.length) {
        text(`…${cases.length - firstRows.length} more rows (see appendix)`, M, y + 5, { size: 7.5, color: MUTED });
        y += 5;
    }

    // Signature lines, kept together near the bottom of the page
    let signY = Math.max(y + 18, H - SIGN_SPACE);
    if (signY + 14 > H - 12) { doc.addPage(); signY = 40; }
    const sigW = 70;
    [[M + 8, 'Prepared by', 'OSA staff'], [W - M - 8 - sigW, 'Noted by', 'OSA director']].forEach(([x, role, who]) => {
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.3);
        doc.line(x, signY, x + sigW, signY);
        text(role, x + sigW / 2, signY + 4.5, { size: 8, bold: true, align: 'center' });
        text(who, x + sigW / 2, signY + 8.5, { size: 7.5, color: MUTED, align: 'center' });
    });

    // Appendix: every case
    if (cases.length > firstRows.length) {
        doc.addPage();
        heading(`Appendix: full case list (${cases.length})`, 18);
        autoTable(doc, {
            ...plainTable,
            startY: 21,
            margin: { left: M, right: M, bottom: 16 },
            head: caseHead,
            body: cases.map(caseRow),
            didParseCell: colorStatus,
        });
    }

    // Footer on every page
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p += 1) {
        doc.setPage(p);
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.3);
        doc.line(M, H - 11, W - M, H - 11);
        text('Generated by OSAConnect', M, H - 7, { size: 7, color: MUTED });
        text(`Page ${p} of ${pages}`, W - M, H - 7, { size: 7, color: MUTED, align: 'right' });
    }
    const stamp = report.range.start.toLocaleDateString('en-CA');
    doc.save(`OSA_${periodName}_Report_${stamp}.pdf`);
}
