import { useState } from 'react';
import { Map as MapIcon } from 'lucide-react';
import { useStudentShell } from './StudentShell';

// Data saver (Settings): the map is the heaviest thing on the dashboard (its tiles are a few hundred KB),
// so it only loads when the student taps "Show map". With data saver off it shows right away.
// Mirrors mobile/components/MapGate.jsx.
export default function MapGate({ children }) {
    const { dataSaver } = useStudentShell();
    const [shown, setShown] = useState(false);
    if (!dataSaver || shown) return children;
    return (
        <button
            type="button"
            onClick={() => setShown(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--s-border)] bg-[var(--s-bg)] px-3 py-3 text-[13px] font-bold text-[var(--s-text)] hover:border-[var(--s-accent)]"
        >
            <MapIcon size={16} /> Show map
            <span className="font-medium text-[var(--s-muted)]">· Data saver is on</span>
        </button>
    );
}
