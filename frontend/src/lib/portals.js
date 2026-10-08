// Each group has its own login URL: /student, /guard (security guards), /faculty (faculty & staff), and /admin.

export const STUDENT_LOGIN = '/student';
export const GUARD_LOGIN = '/guard';
export const FACULTY_LOGIN = '/faculty';
export const ADMIN_LOGIN = '/admin';

/** Login page for a role, e.g. where to go after logging out. */
export const loginPathFor = (role) => {
    if (role === 'admin') return ADMIN_LOGIN;
    if (role === 'guard') return GUARD_LOGIN;
    if (role === 'staff') return FACULTY_LOGIN;
    return STUDENT_LOGIN;
};

/** Login page for a protected URL someone opened while logged out. */
export const loginPathForUrl = (pathname) => {
    if (pathname.startsWith('/admin')) return ADMIN_LOGIN;
    if (/^\/guard(\/|$)/.test(pathname)) return GUARD_LOGIN;
    if (/^\/(staff|faculty)(\/|$)/.test(pathname)) return FACULTY_LOGIN;
    return STUDENT_LOGIN;
};

/** Roles each login page accepts ('student' | 'guard' | 'faculty' | 'admin'). */
export const rolesForLogin = (portal) => ({
    student: ['student'],
    guard: ['guard'],
    faculty: ['staff'],
    admin: ['admin'],
})[portal] || [];

/** Where each role lands after logging in. */
export const homePathFor = (role) => ({
    admin: '/admin/overview',
    staff: '/staff/report',
    guard: '/guard/report',
    student: '/student/dashboard',
})[role];
