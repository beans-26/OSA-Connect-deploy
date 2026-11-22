import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Keyboard, Platform, ScrollView, TextInput, View } from 'react-native';

// A ScrollView for screens with text fields. On Android the app draws edge to edge (Expo SDK 54+), so the screen no
// longer shrinks when the keyboard opens: the keyboard covered the field being typed in. This adds empty space the
// size of the keyboard under the content and scrolls the focused field just above the keyboard (when the keyboard
// opens, and when another field is tapped while it's open). iOS is unchanged (automaticallyAdjustKeyboardInsets or
// the screen's KeyboardAvoidingView handle it there).
const GAP = 24; // space between the field and the top of the keyboard

const KeyboardScrollView = forwardRef(function KeyboardScrollView({ children, onScroll, ...props }, ref) {
    const scrollRef = useRef(null);
    useImperativeHandle(ref, () => scrollRef.current, []);
    const scrollY = useRef(0);
    const keyboardTop = useRef(null); // screen y of the keyboard's top edge while it's open
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    const revealFocused = useCallback(() => {
        const input = TextInput.State.currentlyFocusedInput?.();
        if (!input || keyboardTop.current == null || !scrollRef.current) return;
        input.measureInWindow((x, y, width, height) => {
            const overlap = y + height + GAP - keyboardTop.current;
            if (overlap > 0) scrollRef.current?.scrollTo({ y: scrollY.current + overlap, animated: true });
        });
    }, []);

    useEffect(() => {
        if (Platform.OS !== 'android') return undefined;
        const show = Keyboard.addListener('keyboardDidShow', (e) => {
            keyboardTop.current = e.endCoordinates.screenY;
            setKeyboardHeight(e.endCoordinates.height);
            // After the space is added, so there's room to scroll
            setTimeout(revealFocused, 60);
        });
        const hide = Keyboard.addListener('keyboardDidHide', () => {
            keyboardTop.current = null;
            setKeyboardHeight(0);
        });
        return () => { show.remove(); hide.remove(); };
    }, [revealFocused]);

    return (
        <ScrollView
            ref={scrollRef}
            scrollEventThrottle={16}
            onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; onScroll?.(e); }}
            // Tapping another field while the keyboard is open doesn't fire keyboardDidShow again
            onTouchEnd={Platform.OS === 'android' ? () => setTimeout(revealFocused, 120) : undefined}
            {...props}
        >
            {children}
            {keyboardHeight > 0 && <View style={{ height: keyboardHeight }} />}
        </ScrollView>
    );
});

export default KeyboardScrollView;
