import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
    ArrowLeft, ChevronDown, ChevronUp, ListOrdered, MessageCircleQuestionMark, Scale, Wrench,
    LifeBuoy, ShieldCheck, ClipboardList, Mail, Phone, MapPin, Clock,
} from 'lucide-react-native';
import { useAuth } from '../components/AuthContext';
import { useTheme } from '../components/ThemeContext';
import api from '../services/api';
// Shared with the website (frontend/src/pages/Help.jsx); see the _about note in the file
import help from '../../shared/help-content.json';

const answerFor = (item) => item.mobile || item.a || [];

// Paragraphs starting with "- " render as bullets
function Paragraphs({ items, styles }) {
    return (
        <View style={{ gap: 8 }}>
            {items.map((text, i) => text.startsWith('- ') ? (
                <View key={i} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={[styles.body, { flex: 1 }]}>{text.slice(2)}</Text>
                </View>
            ) : (
                <Text key={i} style={styles.body}>{text}</Text>
            ))}
        </View>
    );
}

function Collapsible({ title, children, styles, colors, initiallyOpen = false, last = false }) {
    const [open, setOpen] = useState(initiallyOpen);
    return (
        <View style={[styles.collapsible, last && { borderBottomWidth: 0 }]}>
            <TouchableOpacity
                style={styles.collapsibleHeader}
                onPress={() => setOpen((o) => !o)}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
            >
                <Text style={styles.question}>{title}</Text>
                {open ? <ChevronUp size={18} color={colors.textMuted} /> : <ChevronDown size={18} color={colors.textMuted} />}
            </TouchableOpacity>
            {open && <View style={{ paddingBottom: 16 }}>{children}</View>}
        </View>
    );
}

function Card({ icon: Icon, title, children, styles, colors }) {
    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Icon size={18} color={colors.primary} />
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
            {children}
        </View>
    );
}

// Rendered from GET /api/violations/punishments/ so it always matches PUNISHMENT_SYSTEM
function PenaltiesTable({ styles, colors }) {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        api.get('/violations/punishments/')
            .then((res) => setData(res.data))
            .catch(() => setFailed(true));
    }, []);

    if (failed) return <Text style={[styles.body, { color: colors.danger }]}>{"The penalties table couldn't be loaded. Check your connection and try again."}</Text>;
    if (!data) return <ActivityIndicator color={colors.primary} />;

    const ordinals = ['1st', '2nd', '3rd'];
    return (
        <View style={{ gap: 12 }}>
            {data.rules.map((rule) => {
                const notes = [...new Set(rule.offenses.map((o) => o.punishment))];
                return (
                    <View key={rule.violation_type} style={styles.penaltyBox}>
                        <Text style={styles.penaltyName}>{rule.violation_type}</Text>
                        <View style={styles.penaltyRow}>
                            {ordinals.map((label, i) => {
                                const offense = rule.offenses[i];
                                const repeated = !offense && data.repeat_last_offense;
                                const shown = offense || (repeated ? rule.offenses[rule.offenses.length - 1] : null);
                                return (
                                    <View key={label} style={styles.penaltyCell}>
                                        <Text style={styles.penaltyLabel}>{label}</Text>
                                        <Text style={[styles.penaltyHours, repeated && { color: colors.textMuted }]}>
                                            {/* A penalty without hours is a sanction (no entry into the campus) */}
                                            {shown ? (shown.hours > 0 ? `${shown.hours} h` : 'No entry') : '—'}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                        {notes.map((n) => <Text key={n} style={styles.penaltyNote}>{n}</Text>)}
                    </View>
                );
            })}
            <View style={[styles.penaltyBox, { borderStyle: 'dashed' }]}>
                <Text style={styles.penaltyName}>Any other violation type</Text>
                <Text style={styles.penaltyNote}>{data.default.punishment}, {data.default.hours} hours</Text>
            </View>
            <Text style={styles.penaltyNote}>Gray values repeat the last listed penalty for later offenses.</Text>
        </View>
    );
}

export default function Help() {
    const router = useRouter();
    const { user } = useAuth();
    const { isDarkMode, colors } = useTheme();
    const styles = getStyles(colors);
    const isStudent = !user || user.role === 'student';
    const { contact, report_problem: problem } = help;

    const reportProblem = () => {
        const url = `mailto:${problem.email}?subject=${encodeURIComponent(problem.subject)}&body=${encodeURIComponent(problem.body)}`;
        Linking.openURL(url).catch(() => {});
    };

    const cardProps = { styles, colors };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ padding: 4 }} accessibilityLabel="Back">
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.intro}>{isStudent ? help.student.intro : help.staff.intro}</Text>

                {isStudent ? (
                    <>
                        <Card icon={ListOrdered} title="How it works" {...cardProps}>
                            {help.student.flow.map((step, i) => (
                                <View key={step.title} style={styles.stepRow}>
                                    <View style={styles.stepRail}>
                                        <View style={[styles.stepDot, i === help.student.flow.length - 1 && { backgroundColor: colors.success }]}>
                                            <Text style={styles.stepNumber}>{i + 1}</Text>
                                        </View>
                                        {i < help.student.flow.length - 1 && <View style={styles.stepLine} />}
                                    </View>
                                    <View style={styles.stepText}>
                                        <Text style={styles.stepTitle}>{step.title}</Text>
                                        {!!step.text && <Text style={styles.body}>{step.text}</Text>}
                                    </View>
                                </View>
                            ))}
                        </Card>

                        {help.student.faq.map((group) => (
                            <Card key={group.group} icon={MessageCircleQuestionMark} title={group.group} {...cardProps}>
                                {group.items.map((item, i) => (
                                    <Collapsible key={item.q} title={item.q} last={i === group.items.length - 1} {...cardProps}>
                                        <Paragraphs items={answerFor(item)} styles={styles} />
                                    </Collapsible>
                                ))}
                            </Card>
                        ))}

                        <Card icon={Wrench} title="Troubleshooting" {...cardProps}>
                            {help.student.troubleshooting.map((item, i) => (
                                <Collapsible key={item.title} title={item.title} last={i === help.student.troubleshooting.length - 1} {...cardProps}>
                                    <Paragraphs items={answerFor(item)} styles={styles} />
                                </Collapsible>
                            ))}
                        </Card>
                    </>
                ) : (
                    <>
                        <Card icon={ClipboardList} title="Filing reports" {...cardProps}>
                            {help.staff.sections.map((s, i) => (
                                <Collapsible key={s.title} title={s.title} initiallyOpen={i === 0} last={i === help.staff.sections.length - 1} {...cardProps}>
                                    <Paragraphs items={answerFor(s)} styles={styles} />
                                </Collapsible>
                            ))}
                        </Card>
                        <Card icon={Scale} title="Violations and penalties" {...cardProps}>
                            <PenaltiesTable {...cardProps} />
                        </Card>
                    </>
                )}

                {!isStudent && (
                <Card icon={LifeBuoy} title="Contact OSA" {...cardProps}>
                    {[[MapPin, contact.office], [Clock, contact.hours], [Mail, contact.email], [Phone, contact.phone]].map(([Icon, value]) => (
                        <View key={value} style={styles.contactRow}>
                            <Icon size={16} color={colors.textMuted} />
                            <Text style={[styles.body, { flex: 1 }]}>{value}</Text>
                        </View>
                    ))}
                </Card>
                )}

                {isStudent && (
                    <Card icon={ShieldCheck} title="Privacy and safety" {...cardProps}>
                        <Paragraphs items={help.student.privacy} styles={styles} />
                        <View style={styles.safetyBlock}>
                            <Text style={[styles.stepTitle, { marginBottom: 8 }]}>{help.student.safety[0]}</Text>
                            <Paragraphs items={help.student.safety.slice(1)} styles={styles} />
                        </View>
                    </Card>
                )}

                <TouchableOpacity style={styles.reportButton} onPress={reportProblem}>
                    <Mail size={18} color="#fff" />
                    <Text style={styles.reportButtonText}>Report a problem</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    // Same header as Profile Settings; centered 576px column on wide screens
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        width: '100%',
        maxWidth: 576,
        alignSelf: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 48,
        width: '100%',
        maxWidth: 576,
        alignSelf: 'center',
    },
    intro: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
        color: colors.textMuted,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginLeft: 12,
        flexShrink: 1,
    },
    body: {
        fontSize: 14,
        lineHeight: 21,
        color: colors.text,
    },
    bulletRow: {
        flexDirection: 'row',
        gap: 8,
    },
    bulletDot: {
        fontSize: 14,
        lineHeight: 21,
        color: colors.textMuted,
    },
    collapsible: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    collapsibleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: 14,
    },
    question: {
        flex: 1,
        fontSize: 15,
        lineHeight: 21,
        fontWeight: '700',
        color: colors.text,
    },
    stepRow: {
        flexDirection: 'row',
    },
    stepRail: {
        width: 32,
        alignItems: 'center',
    },
    stepDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepNumber: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 13,
    },
    stepLine: {
        flex: 1,
        width: 2,
        backgroundColor: colors.border,
        marginVertical: 4,
    },
    stepText: {
        flex: 1,
        paddingLeft: 12,
        paddingBottom: 18,
    },
    safetyBlock: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
    stepTitle: {
        fontSize: 15,
        lineHeight: 24,
        fontWeight: '700',
        color: colors.text,
    },
    penaltyBox: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        padding: 14,
    },
    penaltyName: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    penaltyRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
        marginBottom: 8,
    },
    penaltyCell: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 10,
        paddingVertical: 8,
    },
    penaltyLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: colors.textMuted,
    },
    penaltyHours: {
        fontSize: 16,
        fontWeight: '900',
        color: colors.text,
    },
    penaltyNote: {
        fontSize: 12,
        lineHeight: 17,
        color: colors.textMuted,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingVertical: 6,
    },
    reportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.primary,
        borderRadius: 14,
        padding: 16,
        marginTop: 4,
    },
    reportButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
});
