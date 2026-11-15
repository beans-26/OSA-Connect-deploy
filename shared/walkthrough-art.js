// Pictures for the student walkthrough ("How OSAConnect works"): a student (and a guard on the first step)
// doing what each step says, drawn as plain SVG and shared by the website
// (frontend/src/components/StudentWalkthrough.jsx) and the app (mobile/components/StudentWalkthrough.jsx,
// through react-native-svg's SvgXml).
//
// A scene is a stack of layers the same size as the picture. A layer can have an `anim`, a looping motion both
// platforms play the same way:
//   { duration (ms), frames: [{ tx, ty (picture units), r (degrees), s (scale), o (opacity) }, ...] spread
//     evenly over the loop, origin: [x, y] (the point it turns / grows around), linear (no easing), rest (the
//     frame shown when the phone's Reduce motion is on; default: the middle one) }
// The step's icon sits in the speech bubble (`front`), at `bubble` (% of the picture).

export const ART_WIDTH = 240;
export const ART_HEIGHT = 160;

const SKIN = '#f2c6a0';
const HAIR = '#2f2a28';
const PANTS = '#334155';
const SHOES = '#1f2937';
const STUDENT_SHIRT = '#1e3a8a';
const GUARD_SHIRT = '#0f172a';
const BEAM = '#38bdf8';

const limb = (from, to, elbow, color) => {
    const path = elbow ? `M${from[0]} ${from[1]} Q${elbow[0]} ${elbow[1]} ${to[0]} ${to[1]}` : `M${from[0]} ${from[1]} L${to[0]} ${to[1]}`;
    return `<path d="${path}" stroke="${color}" stroke-width="9" stroke-linecap="round" fill="none"/>`
        + `<circle cx="${to[0]}" cy="${to[1]}" r="5" fill="${SKIN}"/>`;
};
const phoneAt = ([hx, hy]) => `<rect x="${hx - 7}" y="${hy - 12}" width="14" height="22" rx="3" fill="#111827"/>`
    + `<rect x="${hx - 5}" y="${hy - 9}" width="10" height="15" rx="1.5" fill="#93c5fd"/>`;

// A person standing on the ground line (feet at y = 150), centred on x, in parts that can move on their own:
// { legs, body (torso, head, left arm), arm (right arm and whatever it holds), shoulder, hand }
const personParts = (x, { pose = 'stand', shirt = STUDENT_SHIRT, guard = false, glasses = false, facing = 1, legs = 'stand' } = {}) => {
    const f = facing;
    const shoulder = [x + 17 * f, 74];
    const leftShoulder = [x - 17 * f, 74];
    let leftArm = limb(leftShoulder, [x - 21 * f, 108], null, shirt);
    let arm = '';
    let hand = null;
    if (pose === 'phone') {
        hand = [x + 14 * f, 78];
        arm = limb(shoulder, hand, [x + 30 * f, 100], shirt) + phoneAt(hand);
    } else if (pose === 'scan') {
        hand = [x + 38 * f, 78];
        arm = limb(shoulder, hand, [x + 28 * f, 92], shirt) + phoneAt(hand);
    } else if (pose === 'think') {
        hand = [x + 6 * f, 62];
        arm = limb(shoulder, hand, [x + 26 * f, 92], shirt);
    } else if (pose === 'wave') {
        hand = [x + 30 * f, 40];
        arm = limb(shoulder, hand, [x + 32 * f, 62], shirt);
    } else if (pose === 'paper') {
        // Both hands hold the forms in front
        leftArm = limb(leftShoulder, [x - 9 * f, 94], [x - 24 * f, 100], shirt);
        hand = [x + 9 * f, 94];
        arm = limb(shoulder, hand, [x + 24 * f, 100], shirt)
            + `<rect x="${x - 14}" y="78" width="28" height="34" rx="2" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>`
            + `<path d="M${x - 9} 86h18M${x - 9} 92h18M${x - 9} 98h12" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>`;
    } else if (pose === 'walk') {
        leftArm = limb(leftShoulder, [x - 26 * f, 102], null, shirt);
        hand = [x + 26 * f, 102];
        arm = limb(shoulder, hand, null, shirt);
    } else {
        hand = [x + 21 * f, 108];
        arm = limb(shoulder, hand, null, shirt);
    }
    const legsSvg = legs === 'walk'
        ? `<path d="M${x - 6} 110 L${x - 16} 147" stroke="${PANTS}" stroke-width="10" stroke-linecap="round"/><path d="M${x + 6} 110 L${x + 15} 147" stroke="${PANTS}" stroke-width="10" stroke-linecap="round"/>`
            + `<ellipse cx="${x - 18}" cy="149" rx="8" ry="3.5" fill="${SHOES}"/><ellipse cx="${x + 18}" cy="149" rx="8" ry="3.5" fill="${SHOES}"/>`
        : `<rect x="${x - 13}" y="108" width="10" height="40" rx="4" fill="${PANTS}"/><rect x="${x + 3}" y="108" width="10" height="40" rx="4" fill="${PANTS}"/>`
            + `<ellipse cx="${x - 9}" cy="149" rx="8" ry="3.5" fill="${SHOES}"/><ellipse cx="${x + 9}" cy="149" rx="8" ry="3.5" fill="${SHOES}"/>`;
    const head = `<rect x="${x - 4}" y="60" width="8" height="8" fill="${SKIN}"/>`
        + `<circle cx="${x}" cy="48" r="15" fill="${SKIN}"/>`
        + (guard
            // Guard's cap
            ? `<path d="M${x - 16} 44 Q${x} 26 ${x + 16} 44 Z" fill="${GUARD_SHIRT}"/><rect x="${x - 17 + 6 * f}" y="41" width="34" height="5" rx="2.5" fill="${GUARD_SHIRT}"/><circle cx="${x}" cy="37" r="2.5" fill="#facc15"/>`
            : `<path d="M${x - 16} 48 a16 16 0 0 1 32 0 q-9 -9 -22 -6 q-6 1 -10 6z" fill="${HAIR}"/>`)
        + `<circle cx="${x - 5 + 2 * f}" cy="50" r="1.8" fill="#1f2937"/><circle cx="${x + 5 + 2 * f}" cy="50" r="1.8" fill="#1f2937"/>`
        + `<path d="M${x - 4 + 2 * f} 56 q4 3 8 0" stroke="#7c2d12" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
        + (glasses
            ? `<circle cx="${x - 5 + 2 * f}" cy="50" r="4.2" fill="none" stroke="#1f2937" stroke-width="1.4"/><circle cx="${x + 5 + 2 * f}" cy="50" r="4.2" fill="none" stroke="#1f2937" stroke-width="1.4"/>`
                + `<path d="M${x - 1 + 2 * f} 50 h2" stroke="#1f2937" stroke-width="1.4"/>`
            : '');
    const torso = `<path d="M${x - 18} 76 Q${x - 18} 66 ${x - 9} 66 H${x + 9} Q${x + 18} 66 ${x + 18} 76 V112 H${x - 18} Z" fill="${shirt}"/>`
        + (guard ? `<path d="M${x - 9} 76 l3 6 l3 -6z" fill="#facc15"/><rect x="${x - 15}" y="102" width="30" height="4" fill="#111827"/>` : '');
    return { legs: legsSvg, body: torso + leftArm + head, arm, shoulder, hand };
};
const whole = (p) => p.legs + p.body + p.arm;

// Frames for a loop that holds still for a while: from -> to, hold, and back
const swing = (from, to, prop = 'r') => [{ [prop]: from }, { [prop]: to }, { [prop]: to }, { [prop]: to }, { [prop]: from }];

const SCENES = {
    // A guard raises a phone and scans the student's QR ID
    reported: () => {
        const guard = personParts(66, { pose: 'scan', shirt: GUARD_SHIRT, guard: true });
        const student = personParts(172, { pose: 'stand', facing: -1 });
        const [hx, hy] = guard.hand;
        return {
            bubble: [120, 30],
            layers: [
                { svg: guard.legs + guard.body + whole(student) },
                { svg: guard.arm, anim: { duration: 2600, origin: guard.shoulder, frames: swing(38, 0), rest: 2 } },
                // The scan beam, on while the phone is up
                { svg: `<path d="M${hx + 7} ${hy - 6} L${155} 58 L${155} 104 L${hx + 7} ${hy + 6} Z" fill="${BEAM}" fill-opacity="0.35"/>`
                    + `<path d="M155 58 V104" stroke="${BEAM}" stroke-width="2.5" stroke-linecap="round"/>`,
                  anim: { duration: 2600, frames: [{ o: 0 }, { o: 0 }, { o: 1 }, { o: 1 }, { o: 0 }], rest: 2 } },
            ],
        };
    },
    // The phone buzzes with a new email / notification
    notified: () => {
        const p = personParts(100, { pose: 'phone' });
        const [hx, hy] = p.hand;
        return {
            bubble: [168, 42],
            layers: [
                { svg: p.legs + p.body },
                { svg: p.arm, anim: { duration: 1800, origin: p.hand, frames: [{ r: 0 }, { r: -9 }, { r: 9 }, { r: -9 }, { r: 9 }, { r: 0 }, { r: 0 }, { r: 0 }, { r: 0 }], rest: 0 } },
                { svg: `<path d="M${hx + 11} ${hy - 12} q5 6 0 12M${hx + 16} ${hy - 16} q8 10 0 20M${hx - 11} ${hy - 12} q-5 6 0 12M${hx - 16} ${hy - 16} q-8 10 0 20" stroke="#f59e0b" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
                  anim: { duration: 1800, frames: [{ o: 0 }, { o: 1 }, { o: 1 }, { o: 1 }, { o: 1 }, { o: 0 }, { o: 0 }, { o: 0 }, { o: 0 }], rest: 2 } },
                // The red dot of a new notification
                { svg: `<circle cx="${hx + 6}" cy="${hy - 11}" r="4" fill="#ef4444" stroke="#fff" stroke-width="1.5"/>`,
                  anim: { duration: 1800, origin: [hx + 6, hy - 11], frames: [{ s: 0, o: 0 }, { s: 1.3, o: 1 }, { s: 1 }, { s: 1 }, { s: 1 }, { s: 1 }, { s: 1 }, { s: 1 }, { s: 0, o: 0 }], rest: 3 } },
            ],
        };
    },
    // Thinking it over: thought dots float up one by one
    penalty: () => {
        const p = personParts(96, { pose: 'think' });
        const dots = [[120, 34, 2.6], [129, 27, 3.4], [139, 22, 4.2]];
        return {
            bubble: [168, 40],
            layers: [
                { svg: whole(p) },
                ...dots.map(([cx, cy, r], i) => ({
                    svg: `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#94a3b8"/>`,
                    anim: { duration: 2200, frames: [0, 1, 2, 3, 4].map((k) => ({ o: k > i && k < 4 ? 1 : 0 })), rest: 3 },
                })),
            ],
        };
    },
    // An e-ticket comes up out of the phone
    ticket: () => {
        const p = personParts(96, { pose: 'phone' });
        const [hx, hy] = p.hand;
        // Beside the phone, clear of the face and the speech bubble
        const tx = hx + 22;
        const ty = hy - 8;
        return {
            bubble: [168, 42],
            layers: [
                { svg: whole(p) },
                { svg: `<g><rect x="${tx - 15}" y="${ty - 9}" width="30" height="18" rx="3" fill="#fbbf24"/><circle cx="${tx - 15}" cy="${ty}" r="3.5" fill="#ffffff"/><circle cx="${tx + 15}" cy="${ty}" r="3.5" fill="#ffffff"/><path d="M${tx - 7} ${ty - 3}h14M${tx - 7} ${ty + 3}h9" stroke="#92400e" stroke-width="2" stroke-linecap="round"/></g>`,
                  anim: { duration: 2200, origin: [tx, ty], frames: [{ tx: -14, ty: 10, s: 0.4, o: 0 }, { ty: 3, s: 1, o: 1 }, { ty: 0, s: 1, o: 1 }, { ty: -3, s: 1, o: 1 }, { ty: -6, s: 1, o: 0 }], rest: 2 } },
            ],
        };
    },
    // A download arrow drops onto the forms the student is holding
    forms: () => {
        const p = personParts(100, { pose: 'paper' });
        return {
            bubble: [168, 42],
            layers: [
                { svg: whole(p) },
                { svg: `<path d="M100 82 V98 M93 92 L100 99 L107 92" stroke="#f59e0b" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
                  anim: { duration: 1500, frames: [{ ty: -16, o: 0 }, { ty: -8, o: 1 }, { ty: 2, o: 1 }, { ty: 4, o: 0 }], rest: 2 } },
            ],
        };
    },
    // Walking over to the service site's pin
    walk: () => {
        const step = personParts(70, { pose: 'walk', legs: 'walk' });
        const N = 9;
        const path = (k) => -18 + (k / (N - 1)) * 62;
        const fade = (k) => (k === 0 || k === N - 1 ? 0 : 1);
        return {
            bubble: [176, 40],
            layers: [
                // The pin to walk to, bouncing
                { svg: `<path d="M184 128 c-9 -10 -13 -16 -13 -22 a13 13 0 0 1 26 0 c0 6 -4 12 -13 22z" fill="#ef4444"/><circle cx="184" cy="106" r="5" fill="#ffffff"/><ellipse cx="184" cy="146" rx="12" ry="3.5" fill="#0f172a" fill-opacity="0.15"/>`,
                  anim: { duration: 1000, frames: [{ ty: 0 }, { ty: -7 }, { ty: 0 }, { ty: 0 }], rest: 0 } },
                // The student moves across with a little step bounce
                { svg: whole(step), anim: { duration: 2800, linear: true, frames: Array.from({ length: N }, (_, k) => ({ tx: path(k), ty: k % 2 ? -3 : 0, o: fade(k) })), rest: 4 } },
            ],
        };
    },
    // Staying inside the service area: the area pulses, the student moves around inside it
    inside: () => {
        const p = personParts(100, { pose: 'phone' });
        return {
            bubble: [168, 42],
            layers: [
                { svg: `<ellipse cx="100" cy="146" rx="66" ry="12" fill="#10b981" fill-opacity="0.15" stroke="#10b981" stroke-width="2" stroke-dasharray="6 5"/>`,
                  anim: { duration: 1600, origin: [100, 146], frames: [{ s: 1, o: 1 }, { s: 1.1, o: 0.55 }, { s: 1, o: 1 }], rest: 0 } },
                { svg: whole(p), anim: { duration: 3200, frames: [{ tx: -10 }, { tx: 10 }, { tx: -10 }], rest: 1 } },
            ],
        };
    },
    // Scanning the service site's QR code again to end the session
    scan: () => {
        const p = personParts(78, { pose: 'scan' });
        const [hx, hy] = p.hand;
        const qr = (x, y) => {
            const cells = [[0, 0], [2, 0], [4, 0], [1, 1], [3, 1], [0, 2], [2, 2], [4, 2], [1, 3], [4, 3], [0, 4], [2, 4], [3, 4]];
            return cells.map(([c, r]) => `<rect x="${x + c * 4.4}" y="${y + r * 4.4}" width="4.4" height="4.4" fill="#0f172a"/>`).join('');
        };
        return {
            bubble: [128, 26],
            layers: [
                // The QR sign on a post
                { svg: `<rect x="186" y="96" width="5" height="54" rx="2" fill="#94a3b8"/><rect x="170" y="66" width="37" height="36" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>${qr(177.5, 73)}`
                    + p.legs + p.body },
                { svg: p.arm, anim: { duration: 2600, origin: p.shoulder, frames: swing(40, 0), rest: 2 } },
                { svg: `<path d="M${hx + 7} ${hy - 6} L170 68 L170 100 L${hx + 7} ${hy + 6} Z" fill="${BEAM}" fill-opacity="0.35"/>`,
                  anim: { duration: 2600, frames: [{ o: 0 }, { o: 0 }, { o: 1 }, { o: 1 }, { o: 0 }], rest: 2 } },
            ],
        };
    },
    // Coming back day after day: the clock keeps turning
    repeat: () => {
        const p = personParts(84, { pose: 'stand' });
        const [cx, cy] = [170, 110];
        return {
            bubble: [168, 42],
            layers: [
                { svg: whole(p) + `<circle cx="${cx}" cy="${cy}" r="22" fill="#ffffff" stroke="#1e3a8a" stroke-width="3"/>`
                    + [0, 90, 180, 270].map((a) => `<circle cx="${cx + 16 * Math.sin((a * Math.PI) / 180)}" cy="${cy - 16 * Math.cos((a * Math.PI) / 180)}" r="1.8" fill="#1e3a8a"/>`).join('')
                    + `<path d="M${cx} ${cy} V${cy - 10}" stroke="#1e3a8a" stroke-width="3" stroke-linecap="round"/>` },
                // The minute hand going round
                { svg: `<path d="M${cx} ${cy} V${cy - 17}" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="3" fill="#1e3a8a"/>`,
                  anim: { duration: 2400, linear: true, origin: [cx, cy], frames: [{ r: 0 }, { r: 360 }], rest: 0 } },
            ],
        };
    },
    // Cleared: the student waves, confetti falls
    done: () => {
        const p = personParts(100, { pose: 'wave' });
        const bits = [[56, 30, '#f59e0b', 1900], [74, 18, '#10b981', 2300], [134, 22, '#ef4444', 2100], [62, 52, '#3b82f6', 2500], [140, 56, '#a855f7', 1700]];
        return {
            bubble: [170, 42],
            layers: [
                { svg: p.legs + p.body },
                { svg: p.arm, anim: { duration: 1400, origin: p.shoulder, frames: [{ r: 0 }, { r: 16 }, { r: -6 }, { r: 16 }, { r: 0 }, { r: 0 }], rest: 0 } },
                ...bits.map(([x, y, color, duration]) => ({
                    svg: `<rect x="${x - 3}" y="${y - 2}" width="6" height="4" rx="1" fill="${color}"/>`,
                    anim: { duration, origin: [x, y], frames: [{ ty: -6, r: 0, o: 0 }, { ty: 4, r: 90, o: 1 }, { ty: 16, r: 180, o: 1 }, { ty: 26, r: 270, o: 0 }], rest: 1 },
                })),
            ],
        };
    },
    // The app's start screen (mobile/app/welcome.jsx): who's using the app. A student waving hello...
    roleStudent: () => {
        const p = personParts(120, { pose: 'wave' });
        // A backpack strap over the shoulder
        const strap = `<path d="M105 68 L128 110" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>`;
        return {
            bubble: [190, 40],
            layers: [
                { svg: p.legs + p.body + strap },
                { svg: p.arm, anim: { duration: 1400, origin: p.shoulder, frames: [{ r: 0 }, { r: 16 }, { r: -6 }, { r: 16 }, { r: 0 }, { r: 0 }], rest: 0 } },
            ],
        };
    },
    // ...and a faculty member (glasses, ID lace) bobbing gently while a check mark pops onto their clipboard
    roleFaculty: () => {
        const p = personParts(120, { pose: 'paper', shirt: '#0f766e', glasses: true });
        const lace = `<path d="M111 67 L120 84 L129 67" stroke="#facc15" stroke-width="2.5" fill="none"/>`;
        const bob = [{ ty: 0 }, { ty: -3 }, { ty: 0 }, { ty: -3 }, { ty: 0 }];
        return {
            bubble: [190, 40],
            layers: [
                { svg: p.legs + p.body + lace + p.arm, anim: { duration: 3200, origin: [120, 150], frames: bob, rest: 0 } },
                {
                    svg: `<path d="M114 102 l4 4 l9 -10" stroke="#16a34a" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
                    anim: { duration: 3200, origin: [120, 101], frames: [{ ty: 0, o: 0, s: 0.4 }, { ty: -3, o: 1, s: 1.15 }, { ty: 0, o: 1, s: 1 }, { ty: -3, o: 1, s: 1 }, { ty: 0, o: 0, s: 1 }], rest: 2 },
                },
            ],
        };
    },
};

// One scene: { layers: [{ svg, anim }], front (the speech bubble), bubble: { left, top } in % }.
// bg: the soft circle behind the people; ring: the speech bubble's color.
export const walkthroughScene = (name, { bg = '#e0e7ff', ring = '#ffffff' } = {}) => {
    const s = (SCENES[name] || SCENES.repeat)();
    const [bx, by] = s.bubble;
    const wrap = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ART_WIDTH} ${ART_HEIGHT}" width="100%" height="100%">${inner}</svg>`;
    const back = `<circle cx="120" cy="92" r="70" fill="${bg}"/><ellipse cx="120" cy="150" rx="96" ry="6" fill="#0f172a" fill-opacity="0.07"/>`;
    return {
        layers: [{ svg: wrap(back) }, ...s.layers.map((l) => ({ ...l, svg: wrap(l.svg) }))],
        front: wrap(`<path d="M${bx - 14} ${by + 18} L${bx - 24} ${by + 30} L${bx - 4} ${by + 20} Z" fill="${ring}"/><circle cx="${bx}" cy="${by}" r="23" fill="${ring}"/>`),
        bubble: { left: (bx / ART_WIDTH) * 100, top: (by / ART_HEIGHT) * 100 },
    };
};

// A frame with every value filled in
export const fullFrame = (f = {}) => ({ tx: f.tx ?? 0, ty: f.ty ?? 0, r: f.r ?? 0, s: f.s ?? 1, o: f.o ?? 1 });
// The frame shown when motion is off
export const restFrame = (anim) => fullFrame(anim.frames[anim.rest ?? Math.floor(anim.frames.length / 2)]);
