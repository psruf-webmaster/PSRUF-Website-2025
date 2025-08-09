import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

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
import Dashboard from './account pages/Dashboard';
import Navbar from './components/Navbar';

// Wrapper so we can use useLocation inside Router
function AppContent() {
  const location = useLocation();
  const isHome = location.pathname === '/';

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
    handleResize(); // Call once on mount

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <Navbar />
      <Routes>
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
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
