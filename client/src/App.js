// client/src/App.js
import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';

import AuthProvider from './context/AuthContext';
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

// Wrapper so we can use useLocation inside Router
function AppContent() {
  const location = useLocation();
  // const isHome = location.pathname === '/'; // keep if you use elsewhere

  const [bgPosition, setBgPosition] = useState('40% -10%');

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 600) {
        setBgPosition('center top');
      } else {
        setBgPosition('40% -10%');
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // once on mount
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {/* Public navbar is always visible so users can browse the public site */}
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

          {/* Admin tools (also protected by login; we can add role checks later) */}
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
