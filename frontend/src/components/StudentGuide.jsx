import { FileDown } from 'lucide-react';
import StudentWalkthrough from './StudentWalkthrough';
// Same steps and pictures as the first-login walkthrough ("How OSAConnect works")
import help from '../../../shared/help-content.json';

// The walkthrough's serving steps, from downloading the forms to bringing them to OSA
const SERVE_STEPS = help.student.walkthrough.steps.slice(help.student.walkthrough.steps.findIndex((s) => s.scene === 'forms'));

// "How to serve your hours" for a student with an e-ticket: the serving steps one at a time, in the same
// step-by-step style as the first-login walkthrough, with this ticket's hours and site up front and a button on
// the forms step that opens the e-ticket, where the ISO Form and Reflection Form are downloaded.
// Shown once per new ticket (StudentDashboard), and again from "How to serve your hours".
const StudentGuide = ({ ticket, onOpenTicket, onClose }) => {
    if (!ticket) return null;
    const site = ticket.assigned_site?.name || ticket.assigned_location;
    const hours = ticket.total_hours_required;
    const intro = `You have ${hours ? `${hours} hours` : 'hours'} of community service${site ? ` at ${site}` : ''} for ${ticket.violation_details?.violation_type || 'your violation'}. Here's how to serve them.`;

    return (
        <StudentWalkthrough
            open
            title="How to serve your hours"
            intro={intro}
            steps={SERVE_STEPS}
            finishLabel="Got it"
            onClose={onClose}
            onFinish={onClose}
            stepAction={{ scene: 'forms', label: 'Open my e-ticket', icon: FileDown, onClick: () => onOpenTicket(ticket) }}
        />
    );
};

export default StudentGuide;
