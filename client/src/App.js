// client/src/App.js
import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useParams
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
import ProfileSettings from './pages/ProfileSettings';

import Dashboard from './account pages/Dashboard';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Announcements from './pages/Announcements';
import Points from './pages/Points';
import PointsOverview from './pages/PointsOverview';
import Ledger from './pages/Ledger';

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

function canAccessAdminUsers(user) {
  if (!user) return false;
  const roles = Array.isArray(user.role)
    ? user.role.map(role => String(role).toLowerCase())
    : [String(user.role || '').toLowerCase()];
  const positions = Array.isArray(user.positions) ? user.positions : [];
  if (roles.includes('webmaster')) return true;
  return positions.some(position => ['PRESIDENT', 'VP_STANDARDS', 'VP_FINANCE', 'WEBMASTER'].includes(position?.key));
}

function AdminUsersRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!canAccessAdminUsers(user)) {
    return (
      <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
        You do not have permission to access Admin Users.
      </div>
    );
  }
  return <Outlet />;
}

function DynamicFeedRoute() {
  const { feedSlug } = useParams();
  if (!feedSlug) return <Navigate to="/feeds/chapterAnnouncements" replace />;
  return <FeedPage feed={feedSlug} />;
}

function isPublicRoute(pathname) {
  return [
    '/',
    '/leadership',
    '/recruitment',
    '/alumni',
    '/partners',
    '/calendar',
    '/contact',
    '/members',
    '/signinup',
    '/signup',
    '/login',
  ].includes(pathname);
}

// ---- AppContent so we can use useLocation ----
function AppContent() {
  const [bgPosition, setBgPosition] = useState('40% -10%');
  const footerRef = useRef(null);
  const location = useLocation();
  const isFeedsRoute = location.pathname.startsWith('/feeds');
  const showFooter = isPublicRoute(location.pathname);

  useEffect(() => {
    const handleResize = () => {
      setBgPosition(window.innerWidth < 600 ? 'center top' : '40% -10%');
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const applyFooterHeight = () => {
      const nextHeight = showFooter ? (footerRef.current?.offsetHeight || 220) : 0;
      document.documentElement.style.setProperty('--site-footer-height', `${nextHeight}px`);
    };

    applyFooterHeight();
    window.addEventListener('resize', applyFooterHeight);
    return () => window.removeEventListener('resize', applyFooterHeight);
  }, [showFooter]);

  useEffect(() => {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [isFeedsRoute]);

  return (
    <>
      <Navbar />

      <main className={`app-shell${isFeedsRoute ? ' app-shell-feeds' : ''}`}>
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
            <Route path="/profile" element={<ProfileSettings />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:eventId" element={<EventDetail />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/points" element={<Points />} />
            <Route element={<OfficerRoute />}>
              <Route path="/points-overview" element={<PointsOverview />} />
            </Route>
            <Route element={<OfficerRoute />}>
              <Route path="/ledger" element={<Ledger />} />
            </Route>

            {/* Channels (feeds) – shared layout + sidebar */}
            <Route path="/feeds" element={<FeedsLayout />}>
              <Route index element={<Navigate to="/feeds/chapterAnnouncements" replace />} />
              <Route path="chapter" element={<Navigate to="/feeds/chapterAnnouncements" replace />} />
              <Route path="penguins" element={<Navigate to="/feeds/penguinParties" replace />} />
              <Route path="alumni" element={<Navigate to="/feeds/alumniFeed" replace />} />
              <Route path="officers" element={<Navigate to="/feeds/officerFeed" replace />} />
              <Route path=":feedSlug" element={<DynamicFeedRoute />} />
            </Route>

            {/* Admin tools */}
            <Route element={<AdminUsersRoute />}>
              <Route path="/admin/approvals" element={<AdminApprovals />} />
            </Route>
            <Route element={<AdminUsersRoute />}>
              <Route path="/admin/users" element={<AdminUsers />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {showFooter && (
        <footer ref={footerRef} className={`site-footer${isFeedsRoute ? ' site-footer-feeds' : ''}`}>
          <div className="site-footer-inner">
            <div className="site-footer-brand">
              <div className="site-footer-brand-header">
                <span className="site-footer-mark">ΦΣΡ</span>
                <div>
                  <div className="site-footer-title">Phi Sigma Rho</div>
                  <p className="site-footer-subtitle">Tau Chapter - UF</p>
                </div>
              </div>
              <p className="site-footer-copy">
                Connecting hearts and minds in engineering. Inspiring academic excellence and everlasting sisterhood through friendship, scholarship, and encouragement since 1984.
              </p>
              <p className="site-footer-love">
                Made with <span aria-hidden="true">❤</span> by Phi Sigma Rho sisters
              </p>
            </div>

            <div className="site-footer-columns">
              <div className="site-footer-column">
                <p className="site-footer-love">Quick Links</p>
                <a href="/">Home</a>
                <a href="/leadership">Leadership</a>
                <a href="/recruitment">Recruitment</a>
                <a href="/alumni">Alumni</a>
                <a href="/contact">Contact</a>
              </div>

              <div className="site-footer-column">
                <p className="site-footer-love">Connect</p>
                <a href="https://www.instagram.com/phisigmarhouf/" target="_blank" rel="noopener noreferrer">Instagram</a>
                <a href="https://www.facebook.com/ufphisigmarho/" target="_blank" rel="noopener noreferrer">Facebook</a>
                <a href="mailto:psruf.vpmembership@gmail.com">Email Us</a>
              </div>
            </div>
          </div>
          <div className="site-footer-bottom">© 2026 Phi Sigma Rho Tau Chapter. All rights reserved.</div>
        </footer>
      )}
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
