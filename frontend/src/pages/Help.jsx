import { useState } from 'react';
import { ChevronDown, Mail, ShieldCheck, ClipboardList } from 'lucide-react';
import Sidebar from '../components/Sidebar';
// Shared with the mobile app (mobile/app/help.jsx); see the _about note in the file
import help from '../../../shared/help-content.json';
import { Navigate } from 'react-router-dom';

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

// A plain button, not <details>/<summary>: Safari doesn't lay out a <summary> as a flex row
const Collapsible = ({ title, children, defaultOpen = false }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-slate-100 last:border-b-0 dark:border-slate-700">
            <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 py-4 text-left font-bold text-slate-800 dark:text-slate-100">
                <span>{title}</span>
                <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && <div className="pb-5">{children}</div>}
        </div>
    );
};

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

// `embedded`: inside the faculty & staff layout (components/ReporterShell.jsx), which has the menu and title
const Help = ({ embedded = false }) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = user.role;
    // Students have their own Help & Support inside the student layout; faculty & staff have theirs inside
    // their layout; guards have no Help page
    if (role === 'student') return <Navigate to="/student/help" replace />;
    if (!embedded && role === 'staff') return <Navigate to="/faculty/help" replace />;
    if (role === 'guard') return <Navigate to="/guard/home" replace />;
    const isAdmin = role === 'admin';
    const { report_problem: problem } = help;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(problem.email)}&su=${encodeURIComponent(problem.subject)}&body=${encodeURIComponent(problem.body)}`;

    // Admins: only the admin guide. Faculty: filing reports
    const sections = isAdmin ? [{ id: 'admin', label: 'Admin' }] : [{ id: 'reporting', label: 'Filing reports' }];

    return (
        <div className={embedded ? '' : 'isolate flex min-h-screen bg-slate-50 dark:bg-slate-900'}>
            {!embedded && <Sidebar role={role} />}
            <main className={embedded ? 'w-full px-3 py-4 md:px-6 md:py-6' : 'page-enter w-full min-w-0 flex-1 p-4 pt-[76px] md:p-10 md:pt-[88px] lg:pt-10'}>
                <div className="mx-auto max-w-3xl space-y-6">
                    <header>
                        {!embedded && <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-4xl">Help</h1>}
                        <p className={`${embedded ? '' : 'mt-1 '}text-sm font-medium italic text-slate-500 dark:text-slate-400`}>Guides for OSAConnect personnel</p>
                        {sections.length > 1 && <nav className="mt-4 flex flex-wrap gap-2" aria-label="On this page">
                            {sections.map((s) => (
                                <a key={s.id} href={`#${s.id}`} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm hover:text-ustp-blue dark:bg-slate-800 dark:text-slate-300">
                                    {s.label}
                                </a>
                            ))}
                        </nav>}
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

                    {!isAdmin && (
                        <>
                            <Section id="reporting" icon={ClipboardList} title="Filing reports" intro={help.staff.intro}>
                                {help.staff.sections.map((s, i) => (
                                    <Collapsible key={s.title} title={s.title} defaultOpen={i === 0}>
                                        <Paragraphs items={answerFor(s)} />
                                    </Collapsible>
                                ))}
                            </Section>

                            {/* No penalties table or OSA contact for faculty (2026-11): just a way to report a problem */}
                            <a href={gmailUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ustp-blue px-5 py-3 text-sm font-bold text-white hover:opacity-90 sm:w-auto">
                                <Mail size={16} /> Report a problem
                            </a>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Help;
