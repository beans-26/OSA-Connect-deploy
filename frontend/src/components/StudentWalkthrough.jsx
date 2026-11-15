import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStudentShell } from './StudentShell';
import { BadgeCheck, ChevronLeft, ChevronRight, FileDown, LocateFixed, Mail, MapPin, QrCode, Repeat, Scale, ScanLine, Ticket, X } from 'lucide-react';
// Same steps and pictures as the app (mobile/components/StudentWalkthrough.jsx)
import help from '../../../shared/help-content.json';
import { walkthroughScene, fullFrame, restFrame, ART_WIDTH, ART_HEIGHT } from '../../../shared/walkthrough-art';

const guide = help.student.walkthrough;
const ICONS = { BadgeCheck, FileDown, LocateFixed, Mail, MapPin, QrCode, Repeat, Scale, ScanLine, Ticket };

// A picture layer's motion as CSS: moves are in % of the layer (the picture's size), so they scale with it
const frameCss = (f) => {
    const { tx, ty, r, s, o } = fullFrame(f);
    return `transform: translate(${(tx / ART_WIDTH) * 100}%, ${(ty / ART_HEIGHT) * 100}%) rotate(${r}deg) scale(${s}); opacity: ${o};`;
};
const keyframesCss = (name, anim) => `@keyframes ${name} {${anim.frames.map((f, i) => `${((i / (anim.frames.length - 1)) * 100).toFixed(2)}% { ${frameCss(f)} }`).join(' ')}}`;
const layerStyle = (name, anim) => {
    if (!anim) return undefined;
    const rest = restFrame(anim);
    const [ox, oy] = anim.origin || [ART_WIDTH / 2, ART_HEIGHT / 2];
    return {
        // The still frame (shown as is when motion is off); the animation plays over it
        transform: `translate(${(rest.tx / ART_WIDTH) * 100}%, ${(rest.ty / ART_HEIGHT) * 100}%) rotate(${rest.r}deg) scale(${rest.s})`,
        opacity: rest.o,
        transformOrigin: `${(ox / ART_WIDTH) * 100}% ${(oy / ART_HEIGHT) * 100}%`,
        '--wt-anim': `${name} ${anim.duration}ms ${anim.linear ? 'linear' : 'ease-in-out'} infinite`,
    };
};

// "How OSAConnect works": what happens if the student gets a violation, one step per screen, each with a
// picture of a student doing it. firstTime (right after the first login): it can't be closed until the last
// step. Reopened from Help: closes any time.
// The e-ticket's "How to serve your hours" (StudentGuide) uses it too, with its own title, intro, steps (the
// serving ones), last button and an action on one step (open the e-ticket on the forms step).
// paused: hidden for now (e.g. while the e-ticket its button opened is showing), back on the same step after
const StudentWalkthrough = ({ open, paused = false, firstTime = false, onFinish, onClose, title = guide.title, intro = guide.intro, steps = guide.steps, finishLabel = 'I understand', stepAction }) => {
    const [step, setStep] = useState(0);
    // Which way the last move went, for the slide-in direction
    const [dir, setDir] = useState('next');
    const go = (to) => { setDir(to > step ? 'next' : 'back'); setStep(to); };
    const dark = !!useStudentShell()?.isDarkMode;
    const last = step === steps.length - 1;

    // Back to the first step each time it opens
    useEffect(() => { if (open) { setStep(0); setDir('next'); } }, [open]);

    if (!open || paused) return null;
    const s = steps[step];
    const Icon = ICONS[s.icon] || BadgeCheck;
    const next = () => (last ? (onFinish || onClose)() : go(step + 1));
    const art = walkthroughScene(s.scene, {
        bg: s.highlight ? (dark ? '#78350f' : '#fde68a') : (dark ? '#1e3a8a' : '#dbeafe'),
        ring: dark ? '#1e293b' : '#ffffff',
    });
    const iconColor = s.highlight ? '#d97706' : last ? '#10b981' : (dark ? '#60a5fa' : '#1e3a8a');

    // Drawn on <body>, so the page's own layout (a parent with a transform, the top bar's layer) can't cut it off;
    // its own .student-ui wrapper brings the student colors and font along
    return createPortal(
        <div className="student-ui" data-theme={dark ? 'dark' : 'light'}>
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="walkthrough-title"
            onClick={firstTime ? undefined : onClose}>
            <div className="popup-max-h relative flex w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-[var(--s-card)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {!firstTime && (
                    <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--s-bg)] text-[var(--s-muted)]">
                        <X size={18} />
                    </button>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-1">
                    <p className="pr-10 text-xs font-bold uppercase tracking-wide text-[var(--s-primary)]">{title}</p>
                    {/* On every step (it used to show on the first only, so the box shrank after it) */}
                    {intro && <p className="mt-1 pr-10 text-sm font-medium leading-5 text-[var(--s-muted)]">{intro}</p>}

                    {/* key: a new step remounts, which replays the slide-in */}
                    <div key={step} className={`wt-step-${dir} mt-3 rounded-2xl p-4 border-2 ${s.highlight ? 'border-[#f59e0b] bg-[#fffbeb] dark:bg-amber-500/10' : 'border-transparent bg-[var(--s-bg)]'}`}>
                        {/* The picture: a student (and a guard on step 1), with the step's icon in the speech bubble.
                            Our own fixed drawing (shared/walkthrough-art.js), no user data in it. */}
                        <div className="relative mx-auto w-full max-w-[190px]" style={{ aspectRatio: `${ART_WIDTH} / ${ART_HEIGHT}` }} aria-hidden="true">
                            <style>{art.layers.map((l, i) => (l.anim ? keyframesCss(`wt-${s.scene}-${i}`, l.anim) : '')).join(' ')}</style>
                            {art.layers.map((l, i) => (
                                <div key={i} className={`absolute inset-0 ${l.anim ? 'wt-move' : ''}`} style={layerStyle(`wt-${s.scene}-${i}`, l.anim)} dangerouslySetInnerHTML={{ __html: l.svg }} />
                            ))}
                            <div className="wt-bubble absolute inset-0">
                                <div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: art.front }} />
                                <div className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center" style={{ left: `${art.bubble.left}%`, top: `${art.bubble.top}%` }}>
                                    <Icon size={24} color={iconColor} strokeWidth={2.25} />
                                </div>
                            </div>
                        </div>
                        <p className="mt-2 text-xs font-bold text-[var(--s-muted)]">Step {step + 1} of {steps.length}</p>
                        {/* Every step's words in the same spot, only this one visible: the box is always as tall as the
                            longest step, so it doesn't change size on Next / Back */}
                        <div className="grid">
                            {steps.map((st, i) => (
                                <div key={i} style={{ gridArea: '1 / 1' }} className={i === step ? '' : 'invisible'} aria-hidden={i !== step}>
                                    <h2 id={i === step ? 'walkthrough-title' : undefined} className="mt-0.5 text-lg font-black text-[var(--s-text)]">{st.title}</h2>
                                    <p className="mt-1.5 text-sm font-medium leading-5 text-[var(--s-text)]">{st.text}</p>
                                    {stepAction && stepAction.scene === st.scene && (
                                        <button onClick={stepAction.onClick} tabIndex={i === step ? 0 : -1} className="mt-3 flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#f59e0b] p-2.5 text-sm font-bold text-white hover:brightness-105">
                                            {stepAction.icon && <stepAction.icon size={18} />} {stepAction.label}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Progress dots */}
                    <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
                        {steps.map((_, i) => (
                            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-[var(--s-primary)]' : i < step ? 'w-1.5 bg-[var(--s-primary)]/50' : 'w-1.5 bg-[var(--s-border)]'}`} />
                        ))}
                    </div>
                </div>

                <div className="flex shrink-0 gap-2 border-t border-[var(--s-border)] p-3.5">
                    {step > 0 && (
                        <button onClick={() => go(step - 1)} className="flex items-center justify-center gap-1 rounded-[14px] border border-[var(--s-border)] px-4 py-3 text-sm font-bold text-[var(--s-text)]">
                            <ChevronLeft size={18} /> Back
                        </button>
                    )}
                    <button onClick={next} className="flex flex-1 items-center justify-center gap-1 rounded-[14px] border border-transparent bg-[var(--s-primary)] px-4 py-3 text-sm font-bold text-white">
                        {last ? finishLabel : 'Next'}
                        {!last && <ChevronRight size={18} />}
                    </button>
                </div>
            </div>
        </div>
        </div>,
        document.body,
    );
};

export default StudentWalkthrough;
