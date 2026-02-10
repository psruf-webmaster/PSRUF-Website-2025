import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen(prev => !prev);
  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">

      <div className="menu-toggle" onClick={toggleMenu}>
        ☰
      </div>

      <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
        <Link to="/" onClick={closeMenu}>Home</Link>
        <Link to="/executive" onClick={closeMenu}>Executive</Link>
        <Link to="/recruitment" onClick={closeMenu}>Recruitment</Link>
        <Link to="/members" onClick={closeMenu}>Members</Link>
        <Link to="/alumni" onClick={closeMenu}>Alumni</Link>
        <Link to="/partners" onClick={closeMenu}>Partners</Link>
        <Link to="/contact" onClick={closeMenu}>Contact Us</Link>
      

        <div className="auth-button">
        <Link to="/signinup" className="signin-link">
          <span role="img" aria-label="heart">💖</span> Sign In / Up
        </Link>
      </div>
      </div>
    </nav>
  );
}

export default Navbar;
