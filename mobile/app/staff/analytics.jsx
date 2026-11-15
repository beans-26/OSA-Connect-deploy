import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Building2, Download, GraduationCap, Layers, Users } from 'lucide-react-native';
import { savePdf } from '../../components/savePdf';
import { showAlert } from '../../components/showAlert';
import api from '../../services/api';
import { useAuth } from '../../components/AuthContext';
import { useTheme } from '../../components/ThemeContext';
import { HomeHeader } from '../../components/StudentLook';

// The Analytics tab of the guard and faculty & staff screens (same as the website's pages/guard/GuardAnalytics.jsx):
// counts of the violations this account reported for a period, by department, violation type, gender, year level and
// course. Counts only (GET /violations/summary/), no student names; dismissed reports aren't counted.
const PERIODS = [
    { id: 'day', label: 'Today' },
    { id: 'month', label: 'This Month' },
    { id: 'quarter', label: 'This Quarter' },
    { id: 'year', label: 'This Year' },
    { id: 'all', label: 'All Time' },
];
// half: short lists that sit two to a row (gender, year level)
const BREAKDOWNS = [
    { id: 'department', label: 'Department', Icon: Building2, color: '#1e3a8a' },
    { id: 'violation_type', label: 'Violation Type', color: '#ef4444' },
    { id: 'gender', label: 'Gender', half: true, Icon: Users, color: '#8b5cf6' },
    { id: 'year_level', label: 'Year Level', half: true, Icon: Layers, color: '#f59e0b' },
    { id: 'course', label: 'Course', Icon: GraduationCap, color: '#10b981' },
];
// "College of Information Technology and Computing (CITC)" -> "CITC"
const short = (label) => (String(label).match(/\(([^)]+)\)\s*$/) || [])[1] || label;

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// The whole page for the chosen period as a PDF, the same as the website's Download PDF (lib/analyticsPdf.js):
// a navy title band, who and when, the total, then one table per breakdown with counts and shares
const analyticsHtml = ({ data, periodLabel, preparedBy }) => {
    const stamp = new Date().toLocaleString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    const pct = (n) => (data.total ? `${Math.round((n / data.total) * 1000) / 10}%` : '0%');
    const tables = BREAKDOWNS.map((b) => {
        const rows = data[b.id] || [];
        const body = rows.length
            ? rows.map((r, i) => `<tr class="${i % 2 ? 'alt' : ''}"><td>${esc(r.label)}</td><td class="n">${r.count}</td><td class="n">${pct(r.count)}</td></tr>`).join('')
            : '<tr><td>No reports</td><td class="n">0</td><td class="n">0%</td></tr>';
        return `<table><thead><tr><th>By ${esc(b.label)}</th><th class="n">Count</th><th class="n">Share</th></tr></thead><tbody>${body}</tbody></table>`;
    }).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><style>
        @page { margin: 0; }
        body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: #1e293b; }
        .band { background: #101a4b; color: #fff; padding: 26px 40px 20px; }
        .band h1 { margin: 0; font-size: 22px; }
        .band p { margin: 6px 0 0; font-size: 12px; }
        .wrap { padding: 16px 40px 30px; }
        .meta { font-size: 11px; color: #475569; margin: 0 0 3px; }
        .total { display: flex; justify-content: space-between; align-items: center; margin: 14px 0 18px; padding: 12px 14px;
            border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px; color: #b91c1c; font-weight: bold; }
        .total span { font-size: 12px; letter-spacing: 1px; }
        .total b { font-size: 26px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11.5px; page-break-inside: avoid; }
        th { background: #101a4b; color: #fff; text-align: left; padding: 6px 7px; }
        td { padding: 5px 7px; border: 1px solid #e2e8f0; }
        tr.alt td { background: #f8fafc; }
        .n { text-align: right; width: 64px; }
    </style></head><body>
        <div class="band"><h1>OSAConnect · Violation Analytics</h1><p>${esc(periodLabel)} · Counts of the violations you reported</p></div>
        <div class="wrap">
            <p class="meta">Generated ${esc(stamp)}${preparedBy ? ` · by ${esc(preparedBy)}` : ''}</p>
            <p class="meta">Counts only (no student names). Dismissed reports are not counted.</p>
            <div class="total"><span>VIOLATIONS REPORTED</span><b>${data.total ?? 0}</b></div>
            ${tables}
        </div>
    </body></html>`;
};

function Bars({ rows, total, color, styles, colors }) {
    if (!rows.length) return <Text style={styles.noData}>NO DATA</Text>;
    const top = rows.slice(0, 8);
    return (
        <View style={{ gap: 7 }}>
            {top.map((r) => {
                const pct = total ? (r.count / total) * 100 : 0;
                return (
                    <View key={r.label}>
                        <View style={styles.barHead}>
                            <Text style={styles.barLabel} numberOfLines={1}>{short(r.label)}</Text>
                            <Text style={styles.barCount}>{r.count} <Text style={{ color: colors.textMuted, fontWeight: '600' }}>{Math.round(pct)}%</Text></Text>
                        </View>
                        <View style={styles.barTrack}><View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} /></View>
                    </View>
                );
            })}
            {rows.length > top.length && <Text style={styles.more}>+{rows.length - top.length} more</Text>}
        </View>
    );
}

export default function ReporterAnalytics() {
    const { user } = useAuth();
    const { colors, isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const [period, setPeriod] = useState('month');
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const styles = getStyles(colors, isDarkMode);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const load = () => api.get('/violations/summary/', { params: { period } })
            .then(({ data: json }) => { if (!cancelled) { setData(json); setError(''); } })
            .catch((e) => { if (!cancelled) setError(e.response ? "Couldn't load the analytics." : "Can't reach the server. Check your connection."); });
        load();
        // Fresh counts every 30 s while the app is open
        const poll = setInterval(() => AppState.currentState === 'active' && load(), 30000);
        return () => { cancelled = true; clearInterval(poll); };
    }, [period]);

    const name = user?.full_name || user?.name || user?.username || '';
    const periodLabel = PERIODS.find((p) => p.id === period)?.label;
    const download = async () => {
        if (!data || downloading) return;
        setDownloading(true);
        try {
            const day = new Date().toISOString().slice(0, 10);
            await savePdf({ html: analyticsHtml({ data, periodLabel, preparedBy: name }), fileName: `OSAConnect Analytics - ${periodLabel} - ${day}.pdf`, label: 'Analytics PDF' });
        } catch {
            showAlert('Download failed', "Couldn't make the PDF. Try again.");
        } finally {
            setDownloading(false);
        }
    };
    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ paddingTop: insets.top }}>
                <HomeHeader isDarkMode={isDarkMode} greeting="Analytics" name={`${name} · ${user?.role === 'guard' ? 'Guard' : 'Faculty'}`} />
            </View>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.topRow}>
                    <Text style={[styles.intro, { flex: 1, marginBottom: 0 }]}>Counts of the violations you reported.</Text>
                    <TouchableOpacity onPress={download} disabled={!data || downloading} style={[styles.download, (!data || downloading) && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel="Download PDF">
                        {downloading ? <ActivityIndicator size="small" color="#ffffff" /> : <Download size={14} color="#ffffff" />}
                        <Text style={styles.downloadText}>Download PDF</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 2 }} style={{ flexGrow: 0, marginBottom: 12 }}>
                    {PERIODS.map((p) => (
                        <TouchableOpacity key={p.id} onPress={() => { if (p.id !== period) { setData(null); setPeriod(p.id); } }} style={[styles.chip, period === p.id && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: period === p.id }}>
                            <Text style={[styles.chipText, period === p.id && styles.chipTextOn]}>{p.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {error ? (
                    <Text style={styles.error}>{error}</Text>
                ) : !data ? (
                    <ActivityIndicator style={{ marginTop: 48 }} color={colors.textMuted} />
                ) : (
                    <View style={{ gap: 10 }}>
                        <View style={styles.total}>
                            <Text style={styles.totalLabel}>VIOLATIONS REPORTED <Text style={styles.totalPeriod}>· {periodLabel}</Text></Text>
                            <Text style={styles.totalCount}>{data.total}</Text>
                        </View>
                        <View style={styles.grid}>
                            {BREAKDOWNS.map((b) => (
                                <View key={b.id} style={[styles.card, b.half ? styles.half : styles.full]}>
                                    <View style={styles.cardHead}>
                                        {b.Icon ? <b.Icon size={13} color={colors.textMuted} /> : null}
                                        <Text style={styles.cardTitle}>BY {b.label.toUpperCase()}</Text>
                                    </View>
                                    <Bars rows={data[b.id] || []} total={data.total} color={b.color} styles={styles} colors={colors} />
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    content: { padding: 16, paddingBottom: 28 },
    intro: { fontSize: 12, fontWeight: '500', color: colors.textMuted, marginBottom: 10 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    download: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: '#1e3a8a', paddingHorizontal: 13, paddingVertical: 8 },
    downloadText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
    chipOn: { backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' },
    chipText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
    chipTextOn: { color: '#ffffff' },
    error: { borderRadius: 16, padding: 16, fontSize: 14, fontWeight: '700', color: colors.danger, backgroundColor: isDarkMode ? 'rgba(239,68,68,0.12)' : '#fef2f2' },
    total: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 14, borderWidth: 1,
        borderColor: isDarkMode ? 'rgba(239,68,68,0.25)' : '#fee2e2', backgroundColor: isDarkMode ? 'rgba(239,68,68,0.1)' : '#fef2f2',
        paddingHorizontal: 14, paddingVertical: 10,
    },
    totalLabel: { flex: 1, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: isDarkMode ? '#f87171' : '#dc2626' },
    totalPeriod: { letterSpacing: 0, color: isDarkMode ? 'rgba(252,165,165,0.7)' : 'rgba(239,68,68,0.8)' },
    totalCount: { fontSize: 26, fontWeight: '700', color: isDarkMode ? '#fca5a5' : '#b91c1c' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    card: {
        borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 10,
        shadowColor: '#101a4b', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },
    full: { width: '100%' },
    half: { flexGrow: 1, flexBasis: '45%', minWidth: 0 },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
    cardTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: colors.textMuted },
    noData: { textAlign: 'center', paddingVertical: 10, fontSize: 11, fontWeight: '700', letterSpacing: 1, color: colors.textMuted },
    barHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
    barLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.text },
    barCount: { fontSize: 12, fontWeight: '800', color: colors.text },
    barTrack: { marginTop: 3, height: 6, borderRadius: 3, backgroundColor: isDarkMode ? 'rgba(51,65,85,0.6)' : '#f1f5f9' },
    barFill: { height: 6, borderRadius: 3 },
    more: { fontSize: 10, fontWeight: '600', color: colors.textMuted },
});
