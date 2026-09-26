import { useEffect, useState } from 'react';

// Active service sites (Settings > Service Sites) for the "Assign Building" dropdowns.
// The sites API checks the X-OSA-User header names an admin account, like ServiceSites.jsx.
export const useServiceSites = () => {
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        fetch('/api/admin/sites/', { headers: { 'X-OSA-User': user.username || '' } })
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then((data) => setSites((Array.isArray(data) ? data : []).filter((s) => s.is_active)))
            .catch(() => setError("Couldn't load service sites."))
            .finally(() => setLoading(false));
    }, []);

    return { sites, loading, error };
};

// Options for a <select> whose value is the site code; the backend saves the site's name as the
// assigned building and ties the e-ticket to that site, so only its QR starts the student's timer
export const ServiceSiteOptions = ({ sites, loading, error, placeholder }) => {
    if (loading) return <option value="">Loading service sites…</option>;
    if (error) return <option value="">{error}</option>;
    if (sites.length === 0) return <option value="">No service sites yet. Add one in Settings → Service Sites</option>;
    return (
        <>
            <option value="">{placeholder}</option>
            {sites.map((s) => (
                <option key={s.id} value={s.site_code}>{s.name} ({s.site_code})</option>
            ))}
        </>
    );
};
