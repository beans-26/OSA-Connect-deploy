import { useState } from 'react';
import { EyeOff, Map as MapIcon } from 'lucide-react';
import { useStudentShell } from './StudentShell';

// The dashboard map with "Show map" / "Hide map". Data saver (Settings): the map is the heaviest thing on the
// dashboard (its tiles are a few hundred KB), so it starts hidden and only loads when the student taps
// "Show map". With data saver off it starts shown. Either way the student can hide or show it.
// Mirrors mobile/components/MapGate.jsx.
export default function MapGate({ children }) {
    const { dataSaver } = useStudentShell();
    const [choice, setChoice] = useState(null); // null: follow data saver; true / false: the student's choice
    const shown = choice ?? !dataSaver;
    if (shown) {
        return (
            <>
                {children}
                <button
                    type="button"
                    onClick={() => setChoice(false)}
                    className="mx-auto mt-2 flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-[var(--s-muted)] hover:bg-[var(--s-bg)] hover:text-[var(--s-text)]"
                >
                    <EyeOff size={14} /> Hide map
                </button>
            </>
        );
    }
    return (
        <button
            type="button"
            onClick={() => setChoice(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--s-border)] bg-[var(--s-bg)] px-3 py-3 text-[13px] font-bold text-[var(--s-text)] hover:border-[var(--s-accent)]"
        >
            <MapIcon size={16} /> Show map
            {dataSaver && <span className="font-medium text-[var(--s-muted)]">· Data saver is on</span>}
        </button>
    );
}
