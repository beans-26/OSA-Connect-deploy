import { useEffect, useState } from 'react';

// Active service sites (Settings > Service Sites) for the "Assign Building" dropdowns.
// The sites API is admin-only (checked from the login token).
export const useServiceSites = () => {
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/admin/sites/')
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
                <option key={s.id} value={s.site_code}>
                    {s.name} ({s.site_code}) · {s.assigned_count ?? 0}/{s.capacity ?? 10}{(s.assigned_count ?? 0) >= (s.capacity ?? 10) ? ' Full' : ''}
                </option>
            ))}
        </>
    );
};

// POSTs an assignment (approve, bulk report, change building). When the building is already at its
// capacity the backend answers 409; the admin can then assign anyway, which resends with
// allow_over_capacity. Returns { ok, data }; ok is false when the admin cancels or the request fails.
export const postAssignment = async (url, body) => {
    const send = (extra = {}) => fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, ...extra }),
    });
    let response = await send();
    let data = await response.json().catch(() => ({}));
    if (response.status === 409 && data.code === 'site_full') {
        if (!window.confirm(`${data.error}\n\nAssign anyway?`)) return { ok: false, cancelled: true, data };
        response = await send({ allow_over_capacity: true });
        data = await response.json().catch(() => ({}));
    }
    return { ok: response.ok, data };
};
