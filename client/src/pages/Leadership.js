import React, { useState } from 'react';

const leaderData = {
  '2024-2025': {
    'Leaders': [
      { name: 'Katie Samel', title: 'President', img: '/headshots/katie.jpg', email: 'katie@example.com', linkedin: 'https://linkedin.com/in/katie' },
      { name: 'Vivian Lowe', title: 'VP Standards', img: '/headshots/vivian.jpg', email: 'vivian@example.com', linkedin: 'https://linkedin.com/in/vivian' },
      { name: 'Truly Thomas', title: 'VP Finance', img: '/headshots/truly.jpg', email: 'truly@example.com', linkedin: 'https://linkedin.com/in/truly' },
      { name: 'Jaiden Martin', title: 'VP Communications & Records', img: '/headshots/jaiden.jpg', email: 'jaiden@example.com', linkedin: 'https://linkedin.com/in/jaiden' },
      { name: 'Andrea Ortiz', title: 'VP Service', img: '/headshots/andrea.jpg', email: 'andrea@example.com', linkedin: 'https://linkedin.com/in/andrea' },
      { name: 'Maria McDonald', title: 'VP Scholarship', img: '/headshots/maria.jpg', email: 'maria@example.com', linkedin: 'https://linkedin.com/in/maria' },
      { name: 'Janelle Whiteside', title: 'VP Social', img: '/headshots/janelle.jpg', email: 'janelle@example.com', linkedin: 'https://linkedin.com/in/janelle' },
      { name: 'Annie Stocks Natalias', title: 'VP Membership', img: '/headshots/annie.jpg', email: 'annie@example.com', linkedin: 'https://linkedin.com/in/annie' },
      { name: 'Nandika Regatti', title: 'Webmaster', img: '/headshots/nandika.jpg', email: 'nandika@example.com', linkedin: 'https://linkedin.com/in/nandika' },
    ]
  },
  '2025-2026': {
    'Leaders': [
      { name: 'Maria McDonald', title: 'President', img: '/headshots/maria.jpg', email: 'maria@example.com', linkedin: 'https://linkedin.com/in/maria' },
      { name: 'Lianna Larson', title: 'VP Standards', img: '/headshots/lianna.jpg', email: 'lianna@example.com', linkedin: 'https://linkedin.com/in/lianna' },
      { name: 'Kalista Oberes', title: 'VP Finance', img: '/headshots/kalista.jpg', email: 'kalista@example.com', linkedin: 'https://linkedin.com/in/kalista' },
      { name: 'Olivia Huewe', title: 'VP Communications & Records', img: '/headshots/olivia.jpg', email: 'olivia@example.com', linkedin: 'https://linkedin.com/in/olivia' },
      { name: 'Tori LaRose', title: 'VP Service', img: '/headshots/tori.jpg', email: 'tori@example.com', linkedin: 'https://linkedin.com/in/tori' },
      { name: 'Melissa Marino', title: 'VP Scholarship', img: '/headshots/melissa.jpg', email: 'melissa@example.com', linkedin: 'https://linkedin.com/in/melissa' },
      { name: 'Kali Schuchhardt', title: 'VP Social', img: '/headshots/kali.jpg', email: 'kali@example.com', linkedin: 'https://linkedin.com/in/kali' },
      { name: 'Kaitlyn Kapalka', title: 'VP Membership', img: '/headshots/kaitlyn.jpg', email: 'kaitlyn@example.com', linkedin: 'https://linkedin.com/in/kaitlyn' },
      { name: 'Isabella Goodwin', title: 'Webmaster', img: '/headshots/isabella.jpg', email: 'isabella@example.com', linkedin: 'https://linkedin.com/in/isabella' },
    ]
  },
  '2026-2027': {
    'Leaders': [
      { name: 'Melissa Marino', title: 'President', img: '/headshots/melissa.jpg', email: 'melissa@example.com', linkedin: 'https://linkedin.com/in/melissa' },
      { name: 'Natalie Rhoads', title: 'VP Standards', img: '/headshots/natalie.jpg', email: 'natalie@example.com', linkedin: 'https://linkedin.com/in/natalie' },
      { name: 'Elle Burkhalter', title: 'VP Finance', img: '/headshots/elle.jpg', email: 'elle@example.com', linkedin: 'https://linkedin.com/in/elle' },
      { name: 'Samantha Capas', title: 'VP Communications & Records', img: '/headshots/samantha.jpg', email: 'samantha@example.com', linkedin: 'https://linkedin.com/in/samantha' },
      { name: 'Jennifer Rubin', title: 'VP Service', img: '/headshots/jennifer.jpg', email: 'jennifer@example.com', linkedin: 'https://linkedin.com/in/jennifer' },
      { name: 'Ava Wood', title: 'VP Scholarship', img: '/headshots/ava.jpg', email: 'ava@example.com', linkedin: 'https://linkedin.com/in/ava' },
      { name: 'Christina Chi', title: 'VP Social', img: '/headshots/christina.jpg', email: 'christina@example.com', linkedin: 'https://linkedin.com/in/christina' },
      { name: 'Jacqueline Salas', title: 'VP Membership', img: '/headshots/jacqueline.jpg', email: 'jacqueline@example.com', linkedin: 'https://linkedin.com/in/jacqueline' },
      { name: 'Kali Schuchhardt', title: 'Webmaster', img: '/headshots/kali.jpg', email: 'kali@example.com', linkedin: 'https://linkedin.com/in/kali' },
    ]
  },
};

export default function Leadership() {
  const [selectedYear, setSelectedYear] = useState('2026-2027');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const executiveBoard = leaderData[selectedYear]?.Leaders || [];
  const years = ['2024-2025', '2025-2026', '2026-2027'];

  return (
    <div className="page-shell">
      <div className="page-hero">
        <div>
          <h1 className="page-title">Meet our leaders</h1>
          <p className="page-subtitle">
            Our executive board leads the chapter with heart, purpose, and a commitment to growing together.
          </p>
        </div>
        <div className="custom-dropdown">
          <button 
            className="dropdown-toggle"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span>{selectedYear}</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3.5 6L8 11L12.5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {dropdownOpen && (
            <div className="dropdown-menu">
              {years.map((year) => (
                <button
                  key={year}
                  className={`dropdown-option ${year === selectedYear ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedYear(year);
                    setDropdownOpen(false);
                  }}
                >
                  {year}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="content-section">
        <div className="leader-grid">
          {executiveBoard.map((leader, index) => (
            <div className="leader-card" key={`${leader.name}-${index}`}>
              <img src={leader.img} alt={leader.name} className="leader-image" />
              <div className="leader-name">{leader.name}</div>
              <div className="leader-title">{leader.title}</div>
              <div className="leader-links">
                <a href={`mailto:${leader.email}`} className="leader-link email-link" title="Email">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </a>
                <a href={leader.linkedin} target="_blank" rel="noopener noreferrer" className="leader-link linkedin-link" title="LinkedIn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
                    <circle cx="4" cy="4" r="2" />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
