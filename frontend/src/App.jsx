import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import StudentIdleGuard from './components/StudentIdleGuard';
import LoginSwitchGuard from './components/LoginSwitchGuard';
import { stopActiveSession } from './components/studentSession';
import { STUDENT_LOGIN, GUARD_STAFF_LOGIN, ADMIN_LOGIN, loginPathFor, loginPathForUrl } from './lib/portals';

// Pages load when first opened, so a student's phone doesn't download the admin pages, charts and PDF
// tools. After a new deploy an open tab may ask for a page file that no longer exists: reload once to get
// the new version (the flag stops a reload loop when the network is simply down).
const page = (load) => lazy(() => load().then((module) => {
  sessionStorage.removeItem('page-reload');
  return module;
}).catch((error) => {
  if (!sessionStorage.getItem('page-reload')) {
    sessionStorage.setItem('page-reload', '1');
    window.location.reload();
    return new Promise(() => {});
  }
  throw error;
}));
const ForgotPassword = page(() => import('./pages/ForgotPassword'));
const StudentRegistration = page(() => import('./pages/StudentRegistration'));
const ReportViolation = page(() => import('./pages/guard/ReportViolation'));
const GuardHistory = page(() => import('./pages/guard/GuardHistory'));
const GuardAnalytics = page(() => import('./pages/guard/GuardAnalytics'));
const ClearanceCapture = page(() => import('./pages/ClearanceCapture'));
const StaffDashboard = page(() => import('./pages/StaffDashboard'));
const PendingReviews = page(() => import('./pages/staff/PendingReviews'));
const Archives = page(() => import('./pages/staff/Archives'));
const StaffSettings = page(() => import('./pages/staff/Settings'));
const AllStudents = page(() => import('./pages/staff/AllStudents'));
const Analytics = page(() => import('./pages/staff/Analytics'));
const StudentDashboard = page(() => import('./pages/StudentDashboard'));
const Settings = page(() => import('./pages/student/Settings'));
const Help = page(() => import('./pages/Help'));
const LandingPage = page(() => import('./pages/LandingPage'));

const PageLoading = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
    <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-ustp-blue border-t-transparent" />
  </div>
);

const ProtectedRoute = ({ element, allowedRoles }) => {
  const { pathname } = useLocation();
  const userStr = localStorage.getItem('user');
  if (!userStr) return <Navigate to={loginPathForUrl(pathname)} replace />;

  try {
    const user = JSON.parse(userStr);
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
          <div className="bg-white p-10 rounded-[32px] shadow-xl max-w-sm border-2 border-red-100 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Access Denied</h2>
            <p className="text-slate-500 font-medium mb-8 text-sm leading-relaxed">This link is restricted. Your account does not have permission for this section.</p>
            <div className="space-y-3">
              {user.role === 'student' && (
                <a href="/student/dashboard" className="block w-full bg-ustp-blue text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-200">My Dashboard</a>
              )}
              {user.role === 'guard' && (
                <a href="/guard/report" className="block w-full bg-ustp-blue text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-200">Guard Dashboard</a>
              )}
              {user.role === 'admin' && (
                <a href="/admin/overview" className="block w-full bg-ustp-blue text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-200">Admin Dashboard</a>
              )}
              <button onClick={async () => { if (user.role === 'student') await stopActiveSession(user.username); localStorage.removeItem('user'); window.location.href = loginPathFor(user.role); }} className="block w-full bg-slate-100 text-slate-500 py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition">Log Out</button>
            </div>
          </div>
        </div>
      );
    }
    return element;
  } catch (error) {
    return <Navigate to={loginPathForUrl(pathname)} replace />;
  }
};

const OldLoginRedirect = ({ to }) => <Navigate to={to} replace state={useLocation().state} />;

// Pages with a sidebar animate only their <main> (the .page-enter class) so the sidebar stays still
const SIDEBAR_PAGES = /^\/(admin\/|help$|guard\/history$)/;

// Fades each page in when the route changes. Opacity only: a transform here would
// break the pages' position: fixed modals and menus while the animation runs.
const PageFade = ({ children }) => {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial={SIDEBAR_PAGES.test(location.pathname) ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <StudentIdleGuard />
        <Suspense fallback={<PageLoading />}>
        <PageFade>
        <Routes>
          {/* One login URL per group */}
          {/* Logged in and opening another group's login: asks before logging out */}
          <Route path={STUDENT_LOGIN} element={<LoginSwitchGuard portal="student"><Login portal="student" /></LoginSwitchGuard>} />
          <Route path={GUARD_STAFF_LOGIN} element={<LoginSwitchGuard portal="faculty"><Login portal="faculty" /></LoginSwitchGuard>} />
          <Route path="/guardnstaff" element={<Navigate to={GUARD_STAFF_LOGIN} replace />} />
          <Route path={ADMIN_LOGIN} element={<LoginSwitchGuard portal="admin"><AdminLogin /></LoginSwitchGuard>} />
          {/* Old login links; state keeps the idle-logout notice */}
          <Route path="/login" element={<OldLoginRedirect to={STUDENT_LOGIN} />} />
          <Route path="/login/admin" element={<Navigate to={ADMIN_LOGIN} replace />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/register" element={<StudentRegistration />} />
          {/* Opened on the admin's phone from the QR in a violation's details; the link itself is the permission */}
          <Route path="/capture/:token" element={<ClearanceCapture />} />

          <Route path="/guard/report" element={<ProtectedRoute element={<ReportViolation />} allowedRoles={['guard', 'admin']} />} />
          <Route path="/guard/history" element={<ProtectedRoute element={<GuardHistory />} allowedRoles={['guard', 'admin']} />} />
          <Route path="/guard/analytics" element={<ProtectedRoute element={<GuardAnalytics />} allowedRoles={['guard', 'admin']} />} />
          <Route path="/guard/*" element={<Navigate to="/guard/report" replace />} />

          <Route path="/staff/report" element={<ProtectedRoute element={<ReportViolation />} allowedRoles={['staff']} />} />
          <Route path="/staff/history" element={<ProtectedRoute element={<GuardHistory />} allowedRoles={['staff']} />} />
          <Route path="/staff/*" element={<Navigate to="/staff/report" replace />} />

          <Route path="/admin/overview" element={<ProtectedRoute element={<StaffDashboard />} allowedRoles={['admin']} />} />
          <Route path="/admin/students" element={<ProtectedRoute element={<AllStudents />} allowedRoles={['admin']} />} />
          <Route path="/admin/pending" element={<ProtectedRoute element={<PendingReviews />} allowedRoles={['admin']} />} />
          <Route path="/admin/archives" element={<ProtectedRoute element={<Archives />} allowedRoles={['admin']} />} />
          <Route path="/admin/settings" element={<ProtectedRoute element={<StaffSettings />} allowedRoles={['admin']} />} />
          <Route path="/admin/analytics" element={<ProtectedRoute element={<Analytics />} allowedRoles={['admin']} />} />
          <Route path="/admin/*" element={<Navigate to="/admin/overview" replace />} />

          <Route path="/help" element={<ProtectedRoute element={<Help />} allowedRoles={['admin', 'staff', 'guard', 'student']} />} />
          <Route path="/admin/help" element={<Navigate to="/help" replace />} />

          <Route path="/student/dashboard" element={<ProtectedRoute element={<StudentDashboard />} allowedRoles={['student']} />} />
          <Route path="/student/settings" element={<ProtectedRoute element={<Settings />} allowedRoles={['student']} />} />
          <Route path="/student/*" element={<Navigate to="/student/dashboard" replace />} />
          {/* Old link from when students were mobile-only */}
          <Route path="/mobile-only" element={<Navigate to={STUDENT_LOGIN} replace />} />

          <Route path="/" element={<LandingPage />} />
        </Routes>
        </PageFade>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
