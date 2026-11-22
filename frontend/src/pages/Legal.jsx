import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// The Terms of Service (/terms) and Privacy Policy (/privacy) linked under the student, guard and faculty
// logins ("By continuing, you agree to..."), on the website and in the Android app (which opens these pages).
// Each describes what OSAConnect actually does with people's data; keep it in step with the system.
const EFFECTIVE = 'November 22, 2026';

const TERMS = {
    title: 'Terms of Service',
    intro: 'OSAConnect is the Office of Student Affairs (OSA) system of the University of Science and Technology of Southern Philippines, Cagayan de Oro Campus, for reporting student violations and monitoring community service. By logging in or using it, you agree to these terms.',
    sections: [
        ['Who may use it', [
            'Students of USTP Cagayan de Oro, to view their violations and e-tickets and to render community service.',
            'Security guards and faculty and staff, to report student violations.',
            'Authorized OSA personnel, to review reports and manage cases.',
        ]],
        ['Your account', [
            'Keep your password to yourself. You are responsible for what is done with your account.',
            'Give true and complete information when you register or file a report.',
            'Tell the OSA office if your details are wrong; only OSA can correct your name, program and college.',
        ]],
        ['Reporting violations', [
            'Report only what you saw. Every report is reviewed by OSA, which may approve or dismiss it.',
            'Penalties follow the OSA Student Handbook. The system records decisions; it does not replace the authority of OSA.',
        ]],
        ['Community service', [
            'Time in and time out only by scanning the QR code posted at your assigned service site, while you are there.',
            'Do not fake your location, share or copy QR codes, or let someone else serve your hours. Doing so may be reported to OSA as a violation.',
            'Your hours are confirmed only after OSA checks your signed ISO form and reflection paper.',
        ]],
        ['Availability', [
            'OSAConnect needs an internet connection and may sometimes be unavailable. If something goes wrong during your service, report it to the OSA office.',
        ]],
        ['Changes', [
            'OSA may update these terms. The date below shows the latest version.',
        ]],
    ],
};

const PRIVACY = {
    title: 'Privacy Policy',
    intro: 'OSAConnect handles personal information in line with the Data Privacy Act of 2012 (Republic Act No. 10173). This policy says what the system collects, why, and who can see it.',
    sections: [
        ['What we collect', [
            'Students: student ID, full name, college, program, year level, gender, contact number, email, and password (stored only in scrambled, hashed form).',
            'Violation reports: the violation, when it was reported, the description, and the name of the guard or faculty member who reported it.',
            'Community service: the service site, time in and time out, and your location while a service session is running.',
            'Clearance: photos of your signed ISO form and reflection paper, taken by OSA.',
            'Faculty and staff: name and USTP email. Guards: the name of the guard on duty.',
        ]],
        ['Why we collect it', [
            'To identify the student in a report, apply the handbook penalty, assign community service, check that service is rendered at the assigned site, and clear the case.',
            'To send you emails about verification codes, reports and your case.',
            'To produce reports for OSA. Statistics shown to guards and faculty contain counts only, no names.',
        ]],
        ['Your location', [
            'Your location is used only while a community service session is running, to check that you stay at the service site. It is not tracked at other times.',
        ]],
        ['Who can see it', [
            'Students see only their own records.',
            'Guards and faculty see a student’s details only when they look the student up to file a report.',
            'Authorized OSA personnel see the records they need to handle cases.',
            'The system runs on cloud services (website hosting, database and email) that store the data for OSA. It is not sold or shared for any other purpose.',
        ]],
        ['How long we keep it', [
            'Clearance photos are deleted 365 days after the case is cleared. Case records are kept as OSA disciplinary records under university policy.',
        ]],
        ['Your rights', [
            'You may ask to see, correct or question your personal information. Visit the Office of Student Affairs, USTP Cagayan de Oro, to make a request.',
        ]],
    ],
};

const Legal = ({ kind = 'terms' }) => {
    const navigate = useNavigate();
    const doc = kind === 'privacy' ? PRIVACY : TERMS;
    const other = kind === 'privacy' ? ['/terms', 'Terms of Service'] : ['/privacy', 'Privacy Policy'];
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
                <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
                    className="-ml-2 mb-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-bold text-blue-800 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-white/5">
                    <ArrowLeft size={17} /> Back
                </button>
                <p className="text-[11px] font-bold uppercase tracking-[2px] text-slate-500 dark:text-slate-400">OSAConnect</p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{doc.title}</h1>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Effective {EFFECTIVE}</p>
                <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-300">{doc.intro}</p>
                {doc.sections.map(([heading, items]) => (
                    <section key={heading} className="mt-6">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">{heading}</h2>
                        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-slate-700 dark:text-slate-300">
                            {items.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                    </section>
                ))}
                <p className="mt-8 border-t border-slate-200 pt-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
                    See also the <Link to={other[0]} className="font-bold text-blue-800 underline underline-offset-2 dark:text-blue-300">{other[1]}</Link>.
                </p>
            </main>
        </div>
    );
};

export default Legal;
