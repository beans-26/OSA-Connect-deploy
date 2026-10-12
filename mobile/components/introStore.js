// Shared between the opening logo animation (LogoIntro) and the login/register screens (AuthScreen):
// AuthScreen reports where its logo is on screen, so the animated logo can move exactly there; once the
// animation has finished, AuthScreen shows its own logo in that same spot.

let target = null; // the login logo's position on screen: { x, y, width, height }
let done = false;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

export const introStore = {
    setTarget(rect) {
        if (done || !rect || !rect.width) return;
        target = rect;
        emit();
    },
    getTarget: () => target,
    finish() {
        done = true;
        emit();
    },
    isDone: () => done,
    subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    },
};
