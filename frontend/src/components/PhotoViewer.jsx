import { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';

// A photo shown full screen over the page (the clearance photos in the Archives). It opens on top instead of a
// new tab, so there is always a way back: the Back button, the phone's / browser's back button, Escape, or
// tapping outside the photo.
const PhotoViewer = ({ image, title, onClose }) => {
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        // A history entry for the open photo (same URL, the router's state kept), so "back" closes the photo
        // instead of leaving the page
        window.history.pushState({ ...window.history.state, photoViewer: true }, '');
        const onPop = () => onCloseRef.current();
        const onKey = (e) => { if (e.key === 'Escape') window.history.back(); };
        window.addEventListener('popstate', onPop);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('popstate', onPop);
            window.removeEventListener('keydown', onKey);
        };
    }, []);

    // Going back removes the photo's history entry; the popstate above then closes it
    const close = () => window.history.back();

    return (
        <div className="fixed inset-0 z-[90] flex flex-col bg-black/95" role="dialog" aria-modal="true" aria-label={title} onClick={close}>
            <div className="flex items-center gap-3 px-3 py-3 sm:px-5" onClick={(e) => e.stopPropagation()}>
                <button onClick={close} className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20">
                    <ArrowLeft size={18} /> Back
                </button>
                <p className="min-w-0 truncate text-sm font-semibold text-white/80">{title}</p>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6">
                <img src={image} alt={title} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
            </div>
        </div>
    );
};

export default PhotoViewer;
