import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/leadership">Leadership</Link>
        <Link to="/recruitment">Recruitment</Link>
        <Link to="/alumni">Alumni</Link>
        <Link to="/partners">Partners</Link>
        <Link to="/calendar">Calendar</Link>
        <Link to="/contact">Contact Us</Link>
        <Link to="/members">Members</Link>
      </div>
      <div className="auth-button">
        <Link to="/signinup" className="signin-link">👤 Sign Up! / Login</Link>
      </div>
    </nav>
  );
}

export default Navbar;
