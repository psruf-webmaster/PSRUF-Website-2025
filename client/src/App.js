// client/src/App.js
import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  Outlet
} from 'react-router-dom';

import AuthProvider, { useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';

import Home from './pages/Home';
import Leadership from './pages/Leadership';
import Recruitment from './pages/Recruitment';
import Alumni from './pages/Alumni';
import Partners from './pages/Partners';
import Calendar from './pages/Calendar';
import Contact from './pages/Contact';
import Members from './pages/Members';
import SignInUp from './pages/SignInUp';
import SignUp from './pages/SignUp';
import Login from './pages/Login';

import Dashboard from './account pages/Dashboard';
import Events from './pages/Events';
import Announcements from './pages/Announcements';

import AdminApprovals from './pages/AdminApprovals';
import AdminUsers from './pages/AdminUsers';

// NEW layout + shared feed renderer
import FeedsLayout from './pages/feeds/FeedsLayout';
import FeedPage from './pages/feeds/FeedPage';

// ---- Officer-only guard ----
function isOfficerLevel(user) {
  if (!user) return false;
  if (user.isOfficer || user.isExec || user.isWebmaster) return true;
  const roles = Array.isArray(user.role)
    ? user.role.map(r => String(r).toLowerCase())
    : [String(user.role || '').toLowerCase()];
  return roles.some(r =>
    r.includes('officer') ||
    r.includes('exec') ||
    r.includes('webmaster') ||
    r.includes('vp_comm') || r.includes('vp comm') ||
    r.includes('vpcommunications') || r.includes('vp communications')
  );
}

function OfficerRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isOfficerLevel(user)) return <Navigate to="/feeds/chapter" replace />;
  return <Outlet />;
}

// ---- AppContent so we can use useLocation ----
function AppContent() {
  const location = useLocation();
  const [bgPosition, setBgPosition] = useState('40% -10%');

  useEffect(() => {
    const handleResize = () => {
      setBgPosition(window.innerWidth < 600 ? 'center top' : '40% -10%');
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <Navbar />

      <Routes>
        {/* Public site */}
        <Route path="/" element={<Home bgPosition={bgPosition} />} />
        <Route path="/leadership" element={<Leadership />} />
        <Route path="/recruitment" element={<Recruitment />} />
        <Route path="/alumni" element={<Alumni />} />
        <Route path="/partners" element={<Partners />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/members" element={<Members />} />
        <Route path="/signinup" element={<SignInUp />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />

        {/* Logged-in area */}
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/events" element={<Events />} />
          <Route path="/announcements" element={<Announcements />} />

          {/* Channels (feeds) – shared layout + sidebar */}
          <Route path="/feeds" element={<FeedsLayout />}>
            <Route path="chapter"  element={<FeedPage feed="chapterAnnouncements" />} />
            <Route path="penguins" element={<FeedPage feed="penguinParties" />} />
            <Route element={<OfficerRoute />}>
              <Route path="officers" element={<FeedPage feed="officerFeed" />} />
            </Route>
          </Route>

          {/* Admin tools */}
          <Route path="/admin/approvals" element={<AdminApprovals />} />
          <Route path="/admin/users" element={<AdminUsers />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}
