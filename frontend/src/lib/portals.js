// Each group has its own login URL: /student, /faculty (guards and faculty & staff), and /admin.

export const STUDENT_LOGIN = '/student';
export const FACULTY_LOGIN = '/faculty';
export const GUARD_STAFF_LOGIN = FACULTY_LOGIN;
export const ADMIN_LOGIN = '/admin';

/** Login page for a role, e.g. where to go after logging out. */
export const loginPathFor = (role) => {
    if (role === 'admin') return ADMIN_LOGIN;
    if (role === 'guard' || role === 'staff') return FACULTY_LOGIN;
    return STUDENT_LOGIN;
};

/** Login page for a protected URL someone opened while logged out. */
export const loginPathForUrl = (pathname) => {
    if (pathname.startsWith('/admin')) return ADMIN_LOGIN;
    if (/^\/(guard|staff|faculty)(\/|$)/.test(pathname)) return FACULTY_LOGIN;
    return STUDENT_LOGIN;
};

/** Roles each login page accepts ('student' | 'faculty' | 'admin'). */
export const rolesForLogin = (portal) => ({
    student: ['student'],
    faculty: ['guard', 'staff'],
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
