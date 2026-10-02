// Hands results from the camera screens (the QR scanner) back to the screen that opened them.
// The opener registers a one-shot handler before navigating; the camera screen emits and goes back.
const handlers = {};

export const onCameraResult = (key, handler) => {
    handlers[key] = handler;
};

export const emitCameraResult = (key, value) => {
    const handler = handlers[key];
    delete handlers[key];
    handler?.(value);
};

export const clearCameraResult = (key) => {
    delete handlers[key];
};
