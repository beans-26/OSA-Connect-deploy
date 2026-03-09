import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import StudentRegistration from './pages/StudentRegistration';
import ReportViolation from './pages/guard/ReportViolation';
import GuardHistory from './pages/guard/GuardHistory';
import StaffDashboard from './pages/StaffDashboard';
import PendingReviews from './pages/staff/PendingReviews';
import Archives from './pages/staff/Archives';
import StaffSettings from './pages/staff/Settings';
import AllStudents from './pages/staff/AllStudents';
import Analytics from './pages/staff/Analytics';
import StudentDashboard from './pages/StudentDashboard';
import Settings from './pages/student/Settings';

const ProtectedRoute = ({ element, allowedRoles }) => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return <Navigate to="/login" replace />;

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
            <p className="text-slate-500 font-medium mb-8 text-sm leading-relaxed">This link is restricted. Only <span className="text-ustp-blue font-bold uppercase">Administrators</span> can access this page.</p>
            <div className="space-y-3">
              {user.role === 'student' && (
                <a href="/student/dashboard" className="block w-full bg-ustp-blue text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-200">My Dashboard</a>
              )}
              {user.role === 'guard' && (
                <a href="/guard/report" className="block w-full bg-ustp-blue text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-200">Guard Dashboard</a>
              )}
              <button onClick={() => { localStorage.removeItem('user'); window.location.href = '/login'; }} className="block w-full bg-slate-100 text-slate-500 py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition">Log Out</button>
            </div>
          </div>
        </div>
      );
    }
    return element;
  } catch (error) {
    return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<StudentRegistration />} />

          <Route path="/guard/report" element={<ProtectedRoute element={<ReportViolation />} allowedRoles={['guard', 'admin']} />} />
          <Route path="/guard/history" element={<ProtectedRoute element={<GuardHistory />} allowedRoles={['guard', 'admin']} />} />
          <Route path="/guard/*" element={<Navigate to="/guard/report" replace />} />

          <Route path="/staff/overview" element={<ProtectedRoute element={<StaffDashboard />} allowedRoles={['admin']} />} />
          <Route path="/staff/students" element={<ProtectedRoute element={<AllStudents />} allowedRoles={['admin']} />} />
          <Route path="/staff/pending" element={<ProtectedRoute element={<PendingReviews />} allowedRoles={['admin']} />} />
          <Route path="/staff/archives" element={<ProtectedRoute element={<Archives />} allowedRoles={['admin']} />} />
          <Route path="/staff/settings" element={<ProtectedRoute element={<StaffSettings />} allowedRoles={['admin']} />} />
          <Route path="/staff/analytics" element={<ProtectedRoute element={<Analytics />} allowedRoles={['admin']} />} />
          <Route path="/staff/*" element={<Navigate to="/staff/overview" replace />} />

          <Route path="/student/dashboard" element={<ProtectedRoute element={<StudentDashboard />} allowedRoles={['student']} />} />
          <Route path="/student/settings" element={<ProtectedRoute element={<Settings />} allowedRoles={['student']} />} />
          <Route path="/student/*" element={<Navigate to="/student/dashboard" replace />} />

          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
