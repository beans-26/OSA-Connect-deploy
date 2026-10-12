import { BookOpen, FileDown } from 'lucide-react';
// Same steps as the Help page (shared with the mobile app)
import help from '../../../shared/help-content.json';

// "What to do now" for a student with an e-ticket: the Help page's steps, with the forms step (easy to miss)
// highlighted and a button that opens the e-ticket, where the ISO Form and Reflection Form are downloaded.
// Shown once per new ticket (StudentDashboard), and again from "How to serve your hours".
const StudentGuide = ({ ticket, onOpenTicket, onClose }) => {
    if (!ticket) return null;
    const steps = help.student.flow.map((s) => s.title);
    const site = ticket.assigned_site?.name || ticket.assigned_location;
    const hours = ticket.total_hours_required;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="guide-title">
            <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-[var(--s-card)] shadow-2xl">
                <div className="px-6 pt-6">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--s-primary)]/10">
                        <BookOpen size={24} className="text-[var(--s-primary)]" />
                    </div>
                    <h2 id="guide-title" className="text-lg font-black text-[var(--s-text)]">What to do now</h2>
                    <p className="mt-1 text-sm font-medium leading-5 text-[var(--s-muted)]">
                        You have {hours ? <span className="font-bold text-[var(--s-text)]">{hours} hours</span> : 'hours'} of community service
                        {site ? <> at <span className="font-bold text-[var(--s-text)]">{site}</span></> : ''} for {ticket.violation_details?.violation_type || 'your violation'}. Follow these steps:
                    </p>
                </div>

                <ol className="mt-4 flex-1 space-y-2 overflow-y-auto px-6 pb-2">
                    {steps.map((text, i) => {
                        const forms = i === 0; // download the ISO Form and Reflection Form
                        return (
                            <li key={text} className={`flex gap-3 rounded-2xl p-3 ${forms ? 'border-2 border-[#f59e0b] bg-[#fffbeb] dark:bg-amber-500/10' : 'bg-[var(--s-bg)]'}`}>
                                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${forms ? 'bg-[#f59e0b] text-white' : 'bg-[var(--s-primary)] text-white'}`}>{i + 1}</span>
                                <div className="min-w-0 pt-0.5">
                                    <p className="text-sm font-semibold leading-5 text-[var(--s-text)]">{text}</p>
                                    {forms && (
                                        <p className="mt-1 text-xs font-medium leading-4 text-[#b45309] dark:text-amber-300">
                                            Don't skip this: you need both forms to be cleared. They're inside your e-ticket.
                                        </p>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ol>

                <div className="space-y-2 p-6 pt-4">
                    <button onClick={() => onOpenTicket(ticket)} className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#f59e0b] p-3.5 text-sm font-bold text-white hover:brightness-105">
                        <FileDown size={18} /> Open my e-ticket and get the forms
                    </button>
                    <button onClick={onClose} className="w-full rounded-[14px] border border-[var(--s-border)] p-3 text-sm font-bold text-[var(--s-text)]">
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudentGuide;
