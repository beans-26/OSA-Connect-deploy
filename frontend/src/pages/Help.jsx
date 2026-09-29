import React, { useEffect, useState } from 'react';
import { ChevronDown, Mail, Phone, MapPin, Clock, Scale, LifeBuoy, ShieldCheck, ClipboardList } from 'lucide-react';
import Sidebar from '../components/Sidebar';
// Shared with the mobile app (mobile/app/help.jsx); see the _about note in the file
import help from '../../../shared/help-content.json';
import StudentHelp from './student/Help';

// Paragraphs starting with "- " are grouped into bullet lists
const Paragraphs = ({ items }) => {
    const blocks = [];
    items.forEach((text) => {
        if (text.startsWith('- ')) {
            const last = blocks[blocks.length - 1];
            if (Array.isArray(last)) last.push(text.slice(2));
            else blocks.push([text.slice(2)]);
        } else {
            blocks.push(text);
        }
    });
    return (
        <div className="space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {blocks.map((block, i) => Array.isArray(block) ? (
                <ul key={i} className="list-disc space-y-1 pl-5">
                    {block.map((li) => <li key={li}>{li}</li>)}
                </ul>
            ) : (
                <p key={i}>{block}</p>
            ))}
        </div>
    );
};

const answerFor = (item) => item.web || item.a || [];

const Collapsible = ({ title, children, defaultOpen = false }) => (
    <details open={defaultOpen} className="group border-b border-slate-100 last:border-b-0 dark:border-slate-700">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-bold text-slate-800 dark:text-slate-100 [&::-webkit-details-marker]:hidden">
            <span>{title}</span>
            <ChevronDown size={18} className="shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="pb-5">{children}</div>
    </details>
);

const Section = ({ id, icon: Icon, title, intro, children }) => (
    <section id={id} className="card-premium scroll-mt-24 p-5 md:p-8">
        <div className="mb-2 flex items-center gap-3">
            <Icon size={20} className="shrink-0 text-ustp-blue" />
            <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">{title}</h2>
        </div>
        {intro && <p className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">{intro}</p>}
        {children}
    </section>
);

// Rendered from GET /api/violations/punishments/ so it always matches PUNISHMENT_SYSTEM
const PenaltiesTable = () => {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        fetch('/api/violations/punishments/')
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then(setData)
            .catch(() => setFailed(true));
    }, []);

    if (failed) return <p className="text-sm font-medium text-red-500">{"The penalties table couldn't be loaded. Check your connection and reload the page."}</p>;
    if (!data) return <p className="text-sm text-slate-400">Loading penalties…</p>;

    const ordinals = ['1st', '2nd', '3rd'];
    return (
        <div className="space-y-3">
            {data.rules.map((rule) => {
                const notes = [...new Set(rule.offenses.map((o) => o.punishment))];
                return (
                    <div key={rule.violation_type} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-700">
                        <p className="font-bold text-slate-900 dark:text-white">{rule.violation_type}</p>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                            {ordinals.map((label, i) => {
                                const offense = rule.offenses[i];
                                const repeated = !offense && data.repeat_last_offense;
                                const shown = offense || (repeated ? rule.offenses[rule.offenses.length - 1] : null);
                                return (
                                    <div key={label} className="rounded-xl bg-slate-50 px-2 py-2 dark:bg-slate-900/60">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                                        <p className={`text-base font-black ${repeated ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                            {shown ? `${shown.hours} h` : '—'}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                        <ul className="mt-3 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {notes.map((n) => <li key={n}>{n}</li>)}
                        </ul>
                    </div>
                );
            })}
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm dark:border-slate-600">
                <p className="font-bold text-slate-900 dark:text-white">Any other violation type</p>
                <p className="mt-1 text-slate-500 dark:text-slate-400">
                    {data.default.punishment}, {data.default.hours} hours
                </p>
            </div>
            <p className="text-xs text-slate-400">Gray values repeat the last listed penalty for later offenses.</p>
        </div>
    );
};

const Help = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = user.role;
    if (role === 'student') return <StudentHelp />;
    const isAdmin = role === 'admin';
    const { contact, report_problem: problem } = help;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(problem.email)}&su=${encodeURIComponent(problem.subject)}&body=${encodeURIComponent(problem.body)}`;

    const sections = [
        isAdmin && { id: 'admin', label: 'Admin' },
        { id: 'reporting', label: 'Filing reports' },
        { id: 'penalties', label: 'Penalties' },
        { id: 'contact', label: 'Contact OSA' },
    ].filter(Boolean);

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
            <Sidebar role={role} />
            <main className="page-enter w-full min-w-0 flex-1 p-4 pt-[76px] md:p-10 md:pt-[88px] lg:pt-10">
                <div className="mx-auto max-w-3xl space-y-6">
                    <header>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-4xl">Help</h1>
                        <p className="mt-1 text-sm font-medium italic text-slate-500 dark:text-slate-400">Guides for OSAConnect personnel</p>
                        <nav className="mt-4 flex flex-wrap gap-2" aria-label="On this page">
                            {sections.map((s) => (
                                <a key={s.id} href={`#${s.id}`} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm hover:text-ustp-blue dark:bg-slate-800 dark:text-slate-300">
                                    {s.label}
                                </a>
                            ))}
                        </nav>
                    </header>

                    {isAdmin && (
                        <Section id="admin" icon={ShieldCheck} title="Admin" intro={help.admin.intro}>
                            {help.admin.sections.map((s, i) => (
                                <Collapsible key={s.title} title={s.title} defaultOpen={i === 0}>
                                    <Paragraphs items={answerFor(s)} />
                                </Collapsible>
                            ))}
                        </Section>
                    )}

                    <Section id="reporting" icon={ClipboardList} title="Filing reports" intro={help.staff.intro}>
                        {help.staff.sections.map((s, i) => (
                            <Collapsible key={s.title} title={s.title} defaultOpen={!isAdmin && i === 0}>
                                <Paragraphs items={answerFor(s)} />
                            </Collapsible>
                        ))}
                    </Section>

                    <Section id="penalties" icon={Scale} title="Violations and penalties" intro="Suggested community service hours by offense number.">
                        <div className="mt-3">
                            <PenaltiesTable />
                        </div>
                    </Section>

                    <Section id="contact" icon={LifeBuoy} title="Contact OSA">
                        <ul className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                            <li className="flex items-start gap-3"><MapPin size={18} className="mt-0.5 shrink-0 text-slate-400" /> {contact.office}</li>
                            <li className="flex items-start gap-3"><Clock size={18} className="mt-0.5 shrink-0 text-slate-400" /> {contact.hours}</li>
                            <li className="flex items-start gap-3"><Mail size={18} className="mt-0.5 shrink-0 text-slate-400" /> <span className="break-all">{contact.email}</span></li>
                            <li className="flex items-start gap-3"><Phone size={18} className="mt-0.5 shrink-0 text-slate-400" /> {contact.phone}</li>
                        </ul>
                        <a href={gmailUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ustp-blue px-5 py-3 text-sm font-bold text-white hover:opacity-90 sm:w-auto">
                            <Mail size={16} /> Report a problem
                        </a>
                    </Section>
                </div>
            </main>
        </div>
    );
};

export default Help;
