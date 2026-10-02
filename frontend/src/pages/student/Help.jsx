import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ListOrdered, MessageCircleQuestion, Wrench, ShieldCheck, Mail } from 'lucide-react';
import { useStudentTheme } from '../../components/useStudentTheme';
// Shared with the mobile app (mobile/app/help.jsx); see the _about note in the file
import help from '../../../../shared/help-content.json';

// Student Help page, laid out like the mobile app's Help screen (mobile/app/help.jsx)

const answerFor = (item) => item.web || item.a || [];

// Paragraphs starting with "- " render as bullets
const Paragraphs = ({ items }) => (
    <div className="space-y-2">
        {items.map((text, i) => text.startsWith('- ') ? (
            <div key={i} className="flex gap-2">
                <span className="text-sm leading-[21px] text-[var(--s-muted)]">•</span>
                <p className="flex-1 text-sm leading-[21px] text-[var(--s-text)]">{text.slice(2)}</p>
            </div>
        ) : (
            <p key={i} className="text-sm leading-[21px] text-[var(--s-text)]">{text}</p>
        ))}
    </div>
);

const CardTitle = ({ icon: Icon, title }) => (
    <div className="flex items-center">
        <Icon size={18} className="shrink-0 text-[var(--s-primary)]" />
        <h2 className="ml-3 text-xs font-black uppercase tracking-[2px] text-[var(--s-primary)]">{title}</h2>
    </div>
);

// A card that opens and closes; `fixed` cards (How it works) are always open
const Card = ({ icon, title, children, defaultOpen, fixed }) => (fixed ? (
    <section className="mb-4 rounded-2xl border-2 border-[var(--s-border)] bg-[var(--s-card)] p-5">
        <CardTitle icon={icon} title={title} />
        <div className="mt-4">{children}</div>
    </section>
) : (
    <details className="group/card mb-4 rounded-2xl border-2 border-[var(--s-border)] bg-[var(--s-card)] p-5" open={defaultOpen}>
        <summary className="flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
            <CardTitle icon={icon} title={title} />
            <ChevronDown size={18} className="shrink-0 text-[var(--s-muted)] transition-transform group-open/card:rotate-180" />
        </summary>
        <div className="mt-3">{children}</div>
    </details>
));

const Collapsible = ({ title, children }) => (
    <details className="group border-b border-[var(--s-border)] last:border-b-0">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 [&::-webkit-details-marker]:hidden">
            <span className="flex-1 text-[15px] font-bold leading-[21px] text-[var(--s-text)]">{title}</span>
            <ChevronDown size={18} className="shrink-0 text-[var(--s-muted)] transition-transform group-open:rotate-180" />
        </summary>
        <div className="pb-4">{children}</div>
    </details>
);

const StudentHelp = () => {
    const navigate = useNavigate();
    const { isDarkMode } = useStudentTheme();
    const { report_problem: problem } = help;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(problem.email)}&su=${encodeURIComponent(problem.subject)}&body=${encodeURIComponent(problem.body)}`;
    const flow = help.student.flow;

    return (
        <div className="student-ui" data-theme={isDarkMode ? 'dark' : 'light'}>
            <div className="mx-auto w-full max-w-xl">
                <header className="flex items-center justify-between px-5 py-4">
                    <button onClick={() => navigate('/student/dashboard')} aria-label="Back" className="p-1 text-[var(--s-text)]">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-lg font-bold text-[var(--s-text)]">Help</h1>
                    <span className="w-8" />
                </header>

                <main className="px-4 pb-12">
                    <p className="mb-4 px-1 text-sm font-medium leading-5 text-[var(--s-muted)]">{help.student.intro}</p>

                    <Card icon={ListOrdered} title="How it works" fixed>
                        {flow.map((step, i) => (
                            <div key={step.title} className="flex">
                                <div className="flex w-8 flex-col items-center">
                                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-black text-white ${i === flow.length - 1 ? 'bg-[var(--s-success)]' : 'bg-[var(--s-primary)]'}`}>
                                        {i + 1}
                                    </span>
                                    {i < flow.length - 1 && <span className="my-1 w-0.5 flex-1 bg-[var(--s-border)]" />}
                                </div>
                                <div className="flex-1 pb-[18px] pl-3">
                                    <p className="text-[15px] font-bold leading-6 text-[var(--s-text)]">{step.title}</p>
                                    {step.text && <p className="text-sm leading-[21px] text-[var(--s-text)]">{step.text}</p>}
                                </div>
                            </div>
                        ))}
                    </Card>

                    {help.student.faq.map((group) => (
                        <Card key={group.group} icon={MessageCircleQuestion} title={group.group}>
                            {group.items.map((item) => (
                                <Collapsible key={item.q} title={item.q}>
                                    <Paragraphs items={answerFor(item)} />
                                </Collapsible>
                            ))}
                        </Card>
                    ))}

                    <Card icon={Wrench} title="Troubleshooting">
                        {help.student.troubleshooting.map((item) => (
                            <Collapsible key={item.title} title={item.title}>
                                <Paragraphs items={answerFor(item)} />
                            </Collapsible>
                        ))}
                    </Card>

                    <Card icon={ShieldCheck} title="Privacy and safety">
                        <Paragraphs items={help.student.privacy} />
                        <div className="mt-4 border-t border-[var(--s-border)] pt-4">
                            <p className="mb-2 text-[15px] font-bold text-[var(--s-text)]">{help.student.safety[0]}</p>
                            <Paragraphs items={help.student.safety.slice(1)} />
                        </div>
                    </Card>

                    <a
                        href={gmailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 flex w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--s-primary)] p-4 text-sm font-bold uppercase tracking-[1px] text-white"
                    >
                        <Mail size={18} /> Report a problem
                    </a>
                </main>
            </div>
        </div>
    );
};

export default StudentHelp;
