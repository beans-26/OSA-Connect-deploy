import React from 'react';
import { FileDown } from 'lucide-react-native';
import StudentWalkthrough from './StudentWalkthrough';
// Same steps and pictures as the first-login walkthrough ("How OSAConnect works")
import help from '../../shared/help-content.json';

// The walkthrough's serving steps, from downloading the forms to bringing them to OSA
const ALL_STEPS = help.student.walkthrough.steps;
const SERVE_STEPS = ALL_STEPS.slice(ALL_STEPS.findIndex((s) => s.scene === 'forms'));

// "How to serve your hours" for a student with an e-ticket (mirrors frontend/src/components/StudentGuide.jsx):
// the serving steps one at a time, with this ticket's hours and site up front and a button on the forms step
// that opens the e-ticket, where the ISO Form and Reflection Form are downloaded.
// Shown once per new ticket (student/dashboard.jsx), and again from the E-Tickets screen. general: the same steps
// for a student without an open ticket (E-Tickets' book icon is always there), with a general intro and no button.
// "3 hours", "1 hour", or minutes under an hour (the demo's 1-minute penalty read "0.016666666666666666 hours")
const hoursText = (h) => {
    if (h < 1) { const m = Math.max(1, Math.round(h * 60)); return `${m} minute${m === 1 ? '' : 's'}`; }
    const r = Math.round(h * 100) / 100;
    return `${r} hour${r === 1 ? '' : 's'}`;
};

export default function StudentGuide({ ticket, general = false, paused = false, onOpenTicket, onClose }) {
    if (!ticket && !general) return null;
    if (!ticket) {
        return <StudentWalkthrough visible paused={paused} title="How to serve your hours" intro="If you get community service hours for a violation, here's how to serve them." steps={SERVE_STEPS} finishLabel="Got it" onClose={onClose} onFinish={onClose} />;
    }
    const site = ticket.assigned_site?.name || ticket.assigned_location;
    const hours = ticket.total_hours_required;
    const intro = `You have ${hours ? hoursText(hours) : 'hours'} of community service${site ? ` at ${site}` : ''} for ${ticket.violation_details?.violation_type || 'your violation'}. Here's how to serve them.`;

    return (
        <StudentWalkthrough
            visible
            paused={paused}
            title="How to serve your hours"
            intro={intro}
            steps={SERVE_STEPS}
            finishLabel="Got it"
            onClose={onClose}
            onFinish={onClose}
            stepAction={{ scene: 'forms', label: 'Open my e-ticket', Icon: FileDown, onPress: () => onOpenTicket(ticket) }}
        />
    );
}
