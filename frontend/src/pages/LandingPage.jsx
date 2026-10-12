import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    Bell,
    ChartPie,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Download,
    FileCheck2,
    GraduationCap,
    LogIn,
    MapPin,
    Menu,
    QrCode,
    ScanLine,
    Scale,
    ShieldCheck,
    Smartphone,
    Timer,
    UserCheck,
    X,
} from 'lucide-react';
import laptopMockup from '../assets/mockup_laptop.jpg';
import tabletMockup from '../assets/mockup_tablet.jpg';
import phoneMockup from '../assets/mockup_phone.jpg';
import logo from '../assets/osaconnect-logo.png';
import logoDark from '../assets/osaconnect-logo-dark.png';
import campusPhoto from '../assets/ustp-campus.jpg';
import QRCode from 'react-qr-code';
import { FACULTY_LOGIN } from '../lib/portals';
import { ANDROID_APP_VERSION, ANDROID_DOWNLOAD_PATH, ANDROID_DOWNLOAD_URL } from '../lib/androidApp';

// Brand colours from the OSAConnect logo
const NAVY = '#101A4B';
const ORANGE = '#FFAC17';

const navLinks = [
    { name: 'How it works', href: '#how' },
    { name: 'Features', href: '#features' },
    { name: 'Who uses it', href: '#roles' },
    { name: 'Get the app', href: '#download' },
];

// The four stages of a case (diagrams/OSAConnect-System-Documentation.md, section 1)
const steps = [
    { icon: ScanLine, title: 'Report', text: 'A guard or faculty member scans the student’s QR ID (or types the student ID) and files the violation. The student gets an email.' },
    { icon: Scale, title: 'Review', text: 'OSA approves or dismisses the report. The penalty follows the OSA Student Handbook: 3 hours, then 6 hours, then no entry.' },
    { icon: Timer, title: 'Serve', text: 'The student scans the service site’s QR code to time in. The timer only counts while their phone is inside the site’s area.' },
    { icon: FileCheck2, title: 'Clear', text: 'With the hours done, the student hands in the signed time log and reflection paper. OSA clears the case and archives it.' },
];

const features = [
    { icon: QrCode, title: 'QR student ID', text: 'Every student has a QR ID on their phone, so reports are filed in seconds with the right name, course and college.' },
    { icon: Scale, title: 'Handbook penalties', text: 'Penalties come straight from the OSA Student Handbook by offense number. Nobody types the hours by hand.' },
    { icon: MapPin, title: 'GPS-checked service', text: 'Each service site has a QR code and a set area. Time only counts while the student is inside it.' },
    { icon: Bell, title: 'Notifications', text: 'Students are told by email and in the app when a report is filed, approved, or their hours are done.' },
    { icon: FileCheck2, title: 'Ready-to-print forms', text: 'The community service time log (ISO form) and reflection paper are filled in from the student’s sessions.' },
    { icon: ChartPie, title: 'Analytics and archives', text: 'OSA sees violations by type, college and month, exports PDF reports, and keeps every cleared case on file.' },
];

const roles = [
    {
        icon: GraduationCap,
        title: 'Students',
        points: ['See your violations and penalties', 'Time in and out at your service site', 'Track your remaining hours and deadline', 'Get your forms ready for clearance'],
        cta: { to: '/student', label: 'Student login' },
    },
    {
        icon: ShieldCheck,
        title: 'Guards and faculty & staff',
        points: ['Scan a student’s QR ID to report', 'Attach details and the time of the incident', 'Follow each report through OSA’s review', 'Faculty can report even without an account'],
        cta: { to: FACULTY_LOGIN, label: 'Faculty & staff login' },
    },
    {
        icon: UserCheck,
        title: 'Office of Student Affairs',
        points: ['Review reports with the handbook penalty', 'Assign service sites and issue e-tickets', 'Monitor service sessions live', 'Approve clearances and run reports'],
    },
];

// Fades, slides up and grows an element in each time it scrolls into view. `delay` (ms) staggers items in a row.
// People who turned on "reduce motion" see everything at once.
const Reveal = ({ as: Tag = 'div', delay = 0, className = '', children }) => {
    const ref = useRef(null);
    const [shown, setShown] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setShown(true);
            return undefined;
        }
        // In view: slide in. Out of view: reset, so it plays again on the next scroll past
        const observer = new IntersectionObserver(([entry]) => setShown(entry.isIntersecting), {
            threshold: 0.12,
            rootMargin: '0px 0px -60px 0px',
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <Tag
            ref={ref}
            style={{ transitionDelay: `${delay}ms` }}
            className={`transition-[opacity,transform] duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${shown ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-16 scale-[0.96] opacity-0'} ${className}`}
        >
            {children}
        </Tag>
    );
};

// Device frames drawn in code around the screenshots
const Glare = () => <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent" aria-hidden="true" />;

const Laptop = ({ img, alt }) => (
    <div className="w-[300px] md:w-[460px]">
        {/* Lid: black bezel with a camera */}
        <div className="relative rounded-t-[14px] md:rounded-t-[18px] bg-[#0b0f1a] p-[6px] pt-[14px] md:p-[9px] md:pt-[20px] ring-1 ring-white/10">
            <span className="absolute left-1/2 top-[5px] md:top-[7px] h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-slate-700" />
            <div className="relative aspect-[16/9] overflow-hidden rounded-[3px] bg-white">
                <img src={img} alt={alt} className="h-full w-full object-cover object-top" draggable="false" />
                <Glare />
            </div>
        </div>
        {/* Base: aluminium deck with the opening notch */}
        <div className="relative -mx-[7%] h-[12px] md:h-[16px] rounded-b-[12px] md:rounded-b-[16px] bg-gradient-to-b from-slate-200 via-slate-300 to-slate-500 shadow-[0_2px_0_rgba(0,0,0,0.25)]">
            <span className="absolute left-1/2 top-0 h-[5px] md:h-[6px] w-[18%] -translate-x-1/2 rounded-b-md bg-slate-400/80" />
        </div>
    </div>
);

const Tablet = ({ img, alt }) => (
    <div className="relative w-[170px] md:w-[240px] rounded-[24px] md:rounded-[32px] bg-[#0b0f1a] p-[8px] md:p-[11px] ring-1 ring-white/15 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.06)]">
        <span className="absolute left-1/2 top-[3px] md:top-[4px] h-[4px] w-[4px] -translate-x-1/2 rounded-full bg-slate-700" />
        <div className="relative aspect-[3/4.4] overflow-hidden rounded-[16px] md:rounded-[22px] bg-white">
            <img src={img} alt={alt} className="h-full w-full object-cover object-top" draggable="false" />
            <Glare />
        </div>
    </div>
);

const Phone = ({ img, alt }) => (
    <div className="relative w-[124px] md:w-[170px] rounded-[30px] md:rounded-[40px] bg-[#0b0f1a] p-[5px] md:p-[7px] ring-1 ring-white/15 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.08)]">
        {/* Side buttons */}
        <span className="absolute -left-[3px] top-[22%] h-[9%] w-[3px] rounded-l bg-slate-600" />
        <span className="absolute -left-[3px] top-[34%] h-[9%] w-[3px] rounded-l bg-slate-600" />
        <span className="absolute -right-[3px] top-[28%] h-[14%] w-[3px] rounded-r bg-slate-600" />
        <div className="relative aspect-[9/19.5] overflow-hidden rounded-[25px] md:rounded-[33px] bg-white">
            <img src={img} alt={alt} className="h-full w-full object-cover object-top" draggable="false" />
            {/* Dynamic island */}
            <span className="absolute left-1/2 top-[6px] md:top-[8px] h-[14px] md:h-[18px] w-[38%] -translate-x-1/2 rounded-full bg-black" />
            <Glare />
        </div>
    </div>
);

// Phone (first), laptop and tablet taking turns at the front: the front one is full size, the others turn away
// to the sides like a 3D carousel. Pauses while the mouse is over it; the arrows step through, the dots jump to a device.
const RotatingDeviceStack = ({ laptop, tablet, phone }) => {
    const devices = [
        { id: 'mobile', Frame: Phone, img: phone, device: 'Phone', title: 'Student hub' },
        { id: 'desktop', Frame: Laptop, img: laptop, device: 'Desktop', title: 'Admin dashboard' },
        { id: 'tablet', Frame: Tablet, img: tablet, device: 'Tablet', title: 'Guard report' },
    ];
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (paused) return undefined;
        const timer = setInterval(() => setIndex((prev) => (prev + 1) % 3), 4000);
        return () => clearInterval(timer);
    }, [paused, index]);

    // Front, then the next one on the right, the one after on the left
    const placement = (i) => {
        const diff = (i - index + 3) % 3;
        if (diff === 0) {
            return { transform: 'translate(-50%, -50%) translateX(0) translateZ(0) rotateY(0deg) scale(1)', filter: 'brightness(1)', zIndex: 30 };
        }
        // Behind (pushed back in 3D, so it never draws over the front one) and dimmed, not see-through
        const side = diff === 1 ? 1 : -1;
        return {
            transform: `translate(-50%, -50%) translateX(calc(var(--carousel-offset) * ${side})) translateZ(-260px) rotateY(${side * -30}deg) scale(0.8)`,
            filter: 'brightness(0.45) saturate(0.75)',
            zIndex: 10,
        };
    };

    return (
        <div
            className="relative flex w-full flex-col items-center [--carousel-offset:110px] md:[--carousel-offset:190px]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <div className="relative h-[300px] w-full md:h-[440px] [perspective:1400px] [transform-style:preserve-3d]">
                {devices.map(({ id, Frame, img, title }, i) => (
                    <div
                        key={id}
                        className="absolute left-1/2 top-1/2"
                        style={{
                            ...placement(i),
                            transition: 'transform 1100ms cubic-bezier(0.65, 0, 0.35, 1), filter 1100ms cubic-bezier(0.65, 0, 0.35, 1)',
                            willChange: 'transform, filter',
                        }}
                    >
                        <div className="drop-shadow-[0_30px_40px_rgba(0,0,0,0.45)]"><Frame img={img} alt={title} /></div>
                    </div>
                ))}
            </div>

            {/* Previous / next */}
            {[['prev', ChevronLeft, -1, 'left-0 md:left-2'], ['next', ChevronRight, 1, 'right-0 md:right-2']].map(([key, Icon, step, side]) => (
                <button
                    key={key}
                    type="button"
                    aria-label={key === 'prev' ? 'Previous device' : 'Next device'}
                    onClick={() => setIndex((prev) => (prev + step + 3) % 3)}
                    className={`absolute top-[150px] md:top-[220px] z-40 flex h-10 w-10 md:h-11 md:w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white shadow-lg backdrop-blur-sm transition hover:bg-white/25 active:scale-95 ${side}`}
                >
                    <Icon size={22} />
                </button>
            ))}

            {/* Which device is at the front */}
            <div key={index} className="carousel-caption mt-4 space-y-2 text-center">
                <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/80">{devices[index].device}</span>
                <h3 className="text-xl font-extrabold tracking-tight text-white md:text-2xl">{devices[index].title}</h3>
            </div>
            <div className="mt-3 flex justify-center gap-1.5">
                {devices.map((d, i) => (
                    <button
                        key={d.id}
                        type="button"
                        aria-label={`Show ${d.device.toLowerCase()}`}
                        onClick={() => setIndex(i)}
                        className={`h-1.5 rounded-full transition-all duration-500 ${i === index ? 'w-6 bg-[#FFAC17]' : 'w-1.5 bg-white/30 hover:bg-white/60'}`}
                    />
                ))}
            </div>
        </div>
    );
};

const SectionTitle = ({ eyebrow, title, text, light = false }) => (
    <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>{eyebrow}</p>
        <h2 className={`mt-3 text-3xl font-extrabold tracking-tight md:text-4xl ${light ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{title}</h2>
        {text && <p className={`mt-4 text-base leading-relaxed ${light ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'}`}>{text}</p>}
    </Reveal>
);

const LandingPage = () => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Menu links glide to their section instead of jumping (only on this page)
    useEffect(() => {
        const html = document.documentElement;
        const before = html.style.scrollBehavior;
        html.style.scrollBehavior = 'smooth';
        return () => { html.style.scrollBehavior = before; };
    }, []);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        handleScroll();
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Over the navy hero the white logo shows; once the bar turns white, the navy one
    const onDark = !scrolled && !mobileMenuOpen;

    return (
        <div className="min-h-screen bg-white font-sans text-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {/* Navigation */}
            <nav className={`fixed inset-x-0 top-0 z-[100] transition-all duration-200 ${onDark ? 'bg-transparent py-5' : 'border-b border-slate-100 bg-white/90 py-3 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/90'}`}>
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
                    <a href="#home" className="flex items-center">
                        <img src={onDark ? logoDark : logo} alt="OSAConnect" className={`h-9 w-auto select-none md:h-10 ${onDark ? '' : 'dark:hidden'}`} draggable="false" />
                        {!onDark && <img src={logoDark} alt="OSAConnect" className="hidden h-9 w-auto select-none md:h-10 dark:block" draggable="false" />}
                    </a>

                    <div className="hidden items-center gap-8 md:flex">
                        {navLinks.map((link) => (
                            <a key={link.name} href={link.href} className={`text-sm font-semibold transition-colors ${onDark ? 'text-white/80 hover:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}>
                                {link.name}
                            </a>
                        ))}
                        <Link to="/student" className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-slate-900 shadow-sm transition hover:brightness-105" style={{ backgroundColor: ORANGE }}>
                            <LogIn size={16} /> Log in
                        </Link>
                    </div>

                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu" className={`md:hidden ${onDark ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                        {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
                    </button>
                </div>

                {mobileMenuOpen && (
                    <div className="absolute inset-x-0 top-full flex flex-col gap-1 border-b border-slate-100 bg-white p-4 shadow-lg md:hidden dark:border-slate-700 dark:bg-slate-900">
                        {navLinks.map((link) => (
                            <a key={link.name} href={link.href} onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">{link.name}</a>
                        ))}
                        <Link to="/student" className="mt-2 rounded-xl py-3 text-center text-sm font-bold text-slate-900" style={{ backgroundColor: ORANGE }}>Student login</Link>
                        <Link to={FACULTY_LOGIN} className="rounded-xl border border-slate-200 py-3 text-center text-sm font-bold text-slate-700 dark:border-slate-600 dark:text-slate-200">Faculty & staff login</Link>
                    </div>
                )}
            </nav>

            {/* Hero */}
            <section id="home" className="relative overflow-hidden px-4 pb-20 pt-32 sm:px-6 md:pb-28 md:pt-40 lg:min-h-[760px]" style={{ backgroundColor: NAVY }}>
                {/* The USTP campus, darkened with the brand navy so the text stays readable */}
                <div className="pointer-events-none absolute inset-0 bg-cover bg-center" aria-hidden="true" style={{ backgroundImage: `url(${campusPhoto})` }} />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#101A4B] via-[#101A4B]/85 to-[#101A4B]/40" aria-hidden="true" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#101A4B]/70 to-transparent" aria-hidden="true" />
                <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
                    <Reveal className="text-center lg:text-left">
                        <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ORANGE }} />
                            Office of Student Affairs · USTP
                        </p>
                        <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
                            Student violations and community service,{' '}
                            <span style={{ color: ORANGE }}>one scan at a time.</span>
                        </h1>
                        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/70 lg:mx-0">
                            OSAConnect replaces paper slips and logbooks. Guards report with a QR scan, OSA reviews
                            with the Student Handbook, and students serve and track their hours from their phone.
                        </p>
                        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                            <Link to="/student" className="inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold text-slate-900 shadow-lg shadow-black/20 transition hover:brightness-105" style={{ backgroundColor: ORANGE }}>
                                Student login <ArrowRight size={16} />
                            </Link>
                            <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">
                                Register as a student
                            </Link>
                        </div>
                        <p className="mt-5 text-sm text-white/50">
                            Faculty, staff or guard? <Link to={FACULTY_LOGIN} className="font-semibold text-white/80 underline underline-offset-4 hover:text-white">Log in here</Link>
                        </p>
                    </Reveal>

                    <div className="flex justify-center lg:justify-end">
                        <Reveal delay={200} className="w-full"><RotatingDeviceStack laptop={laptopMockup} tablet={tabletMockup} phone={phoneMockup} /></Reveal>
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section id="how" className="scroll-mt-20 bg-slate-50 px-4 py-20 sm:px-6 md:py-28 dark:bg-slate-900">
                <div className="mx-auto max-w-7xl">
                    <SectionTitle eyebrow="How it works" title="From report to clearance" text="Every case follows the same four steps, and everyone involved can see where it is." />
                    <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {steps.map((s, i) => (
                            <Reveal as="li" key={s.title} delay={i * 120} className="relative rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                                <div className="flex items-center justify-between">
                                    <span className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ backgroundColor: NAVY }}>
                                        <s.icon size={20} />
                                    </span>
                                    <span className="text-3xl font-extrabold text-slate-200 dark:text-slate-700">0{i + 1}</span>
                                </div>
                                <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">{s.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{s.text}</p>
                            </Reveal>
                        ))}
                    </ol>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="scroll-mt-20 bg-white px-4 py-20 sm:px-6 md:py-28 dark:bg-slate-800">
                <div className="mx-auto max-w-7xl">
                    <SectionTitle eyebrow="Features" title="Built for the way OSA works" />
                    <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                        {features.map((f, i) => (
                            <Reveal key={f.title} delay={(i % 3) * 120} className="flex gap-4">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                                    <f.icon size={20} />
                                </span>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">{f.title}</h3>
                                    <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{f.text}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Roles */}
            <section id="roles" className="scroll-mt-20 px-4 py-20 sm:px-6 md:py-28" style={{ backgroundColor: NAVY }}>
                <div className="mx-auto max-w-7xl">
                    <SectionTitle light eyebrow="Who uses it" title="One system, three sides of every case" />
                    <div className="mt-14 grid gap-6 lg:grid-cols-3">
                        {roles.map((r, i) => (
                            <Reveal key={r.title} delay={i * 120} className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-7">
                                <span className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-900" style={{ backgroundColor: ORANGE }}>
                                    <r.icon size={20} />
                                </span>
                                <h3 className="mt-5 text-xl font-bold text-white">{r.title}</h3>
                                <ul className="mt-4 flex-1 space-y-3">
                                    {r.points.map((p) => (
                                        <li key={p} className="flex gap-3 text-sm text-white/75">
                                            <CheckCircle2 size={18} className="mt-px shrink-0" style={{ color: ORANGE }} /> {p}
                                        </li>
                                    ))}
                                </ul>
                                {r.cta && (
                                    <Link to={r.cta.to} className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-white hover:underline">
                                        {r.cta.label} <ArrowRight size={16} />
                                    </Link>
                                )}
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Platforms, with the Android download */}
            <section id="download" className="scroll-mt-20 bg-slate-50 px-4 py-20 sm:px-6 dark:bg-slate-900">
                <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[3fr_2fr]">
                    <Reveal className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-7 sm:flex-row sm:items-center dark:border-slate-700 dark:bg-slate-800">
                        <div className="flex-1">
                            <Smartphone size={24} className="text-slate-700 dark:text-slate-300" />
                            <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Android app</h3>
                            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">For students, guards and faculty & staff. Keeps the service timer running in the background.</p>
                            <a href={ANDROID_DOWNLOAD_PATH} className="mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:brightness-105" style={{ backgroundColor: ORANGE }}>
                                <Download size={16} /> Download the APK
                            </a>
                        </div>
                        {/* Scan with an Android phone's camera to download the app */}
                        <div className="shrink-0 self-center text-center">
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <QRCode value={ANDROID_DOWNLOAD_URL} size={132} fgColor={NAVY} title="QR code to download the OSAConnect Android app" />
                            </div>
                            <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Scan to download</p>
                            <p className="text-[11px] text-slate-400">Version {ANDROID_APP_VERSION}</p>
                        </div>
                    </Reveal>
                    <Reveal delay={120} className="rounded-2xl border border-slate-200 bg-white p-7 dark:border-slate-700 dark:bg-slate-800">
                        <ScanLine size={24} className="text-slate-700 dark:text-slate-300" />
                        <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Website</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">For everyone, on any device. Students with an iPhone use the website in their browser.</p>
                    </Reveal>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-100 bg-white px-4 py-12 sm:px-6 dark:border-slate-700 dark:bg-slate-800">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row">
                    <div className="text-center md:text-left">
                        <img src={logo} alt="OSAConnect" className="mx-auto h-10 w-auto select-none md:mx-0 dark:hidden" draggable="false" />
                        <img src={logoDark} alt="OSAConnect" className="mx-auto hidden h-10 w-auto select-none md:mx-0 dark:block" draggable="false" />
                        <p className="mt-3 text-xs text-slate-400">Office of Student Affairs, University of Science and Technology of Southern Philippines</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                        <Link to="/student" className="hover:text-slate-900 dark:hover:text-white">Student login</Link>
                        <Link to="/register" className="hover:text-slate-900 dark:hover:text-white">Register</Link>
                        <Link to={FACULTY_LOGIN} className="hover:text-slate-900 dark:hover:text-white">Faculty & staff</Link>
                    </div>
                </div>
                <p className="mx-auto mt-10 max-w-7xl text-center text-xs text-slate-400 md:text-left">© {new Date().getFullYear()} OSAConnect</p>
            </footer>
        </div>
    );
};

export default LandingPage;
