import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
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

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/guard/report" element={<ReportViolation />} />
          <Route path="/guard/history" element={<GuardHistory />} />
          <Route path="/guard/*" element={<Navigate to="/guard/report" replace />} />

          <Route path="/staff/overview" element={<StaffDashboard />} />
          <Route path="/staff/students" element={<AllStudents />} />
          <Route path="/staff/pending" element={<PendingReviews />} />
          <Route path="/staff/archives" element={<Archives />} />
          <Route path="/staff/settings" element={<StaffSettings />} />
          <Route path="/staff/analytics" element={<Analytics />} />
          <Route path="/staff/*" element={<Navigate to="/staff/overview" replace />} />

          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/settings" element={<Settings />} />
          <Route path="/student/*" element={<Navigate to="/student/dashboard" replace />} />

          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>

  );
}

export default App;
