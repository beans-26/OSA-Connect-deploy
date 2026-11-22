import { forwardRef } from 'react';
import { Platform, ScrollView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

// A ScrollView for screens with text fields. On Android the app draws edge to edge (Expo SDK 54+), so the screen no
// longer shrinks when the keyboard opens and the keyboard covered the field being typed in and the buttons under
// it. On Android this is react-native-keyboard-controller's KeyboardAwareScrollView (needs KeyboardProvider, in
// app/_layout.jsx): it adds room for the keyboard and scrolls the focused field up, BOTTOM_OFFSET above the
// keyboard, so what's under it (the next field, the Login button) shows too. iOS keeps a plain ScrollView
// (automaticallyAdjustKeyboardInsets or the screen's KeyboardAvoidingView handle it there).
const BOTTOM_OFFSET = 140;

const KeyboardScrollView = forwardRef(function KeyboardScrollView(props, ref) {
    if (Platform.OS !== 'android') return <ScrollView ref={ref} {...props} />;
    return <KeyboardAwareScrollView ref={ref} bottomOffset={BOTTOM_OFFSET} {...props} />;
});

export default KeyboardScrollView;
