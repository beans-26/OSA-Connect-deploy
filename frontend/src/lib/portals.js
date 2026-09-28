// Each group has its own login URL: /student, /guardnstaff (guards, staff, faculty), and /admin.

export const STUDENT_LOGIN = '/student';
export const GUARD_STAFF_LOGIN = '/guardnstaff';
export const ADMIN_LOGIN = '/admin';

/** Login page for a role, e.g. where to go after logging out. */
export const loginPathFor = (role) => {
    if (role === 'admin') return ADMIN_LOGIN;
    if (role === 'guard' || role === 'staff' || role === 'faculty') return GUARD_STAFF_LOGIN;
    return STUDENT_LOGIN;
};

/** Login page for a protected URL someone opened while logged out. */
export const loginPathForUrl = (pathname) => {
    if (pathname.startsWith('/admin')) return ADMIN_LOGIN;
    if (/^\/(guard|staff|faculty)(\/|$)/.test(pathname)) return GUARD_STAFF_LOGIN;
    return STUDENT_LOGIN;
};

/** Roles each login page accepts ('student' | 'guardnstaff' | 'admin'). */
export const rolesForLogin = (portal) => ({
    student: ['student'],
    guardnstaff: ['guard', 'staff'],
    admin: ['admin'],
})[portal] || [];

/** Where each role lands after logging in. */
export const homePathFor = (role) => ({
    admin: '/admin/overview',
    staff: '/staff/report',
    guard: '/guard/report',
    student: '/student/dashboard',
})[role];
