import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Leadership.css'; 

const headshotContext = require.context('../headshots', false, /\.(png|jpe?g|svg|webp)$/i);

function getHeadshotUrl(imgPath) {
  try {
    return headshotContext(`.${imgPath.replace('/headshots', '')}`);
  } catch (err) {
    return 'https://via.placeholder.com/250'; 
  }
}

const leaderData = {
  '2024-2025': {
    'Leaders': [
      { name: 'Katie Samel', title: 'President', img: '/headshots/katie.jpg', email: 'psruf.president@gmail.com', linkedin: 'https://www.linkedin.com/in/katie-samel/' },
      { name: 'Vivian Lowe', title: 'VP Standards', img: '/headshots/vivian.jpg', email: 'psruf.vpstandards@gmail.com', linkedin: 'https://www.linkedin.com/in/vivianlowe/' },
      { name: 'Truly Thomas', title: 'VP Finance', img: '/headshots/truly.jpg', email: 'psruf.vpfinance@gmail.com', linkedin: 'https://www.linkedin.com/in/truly-thomas-mechanicalengineering-chineselanguageandculture/' },
      { name: 'Jaiden Martin', title: 'VP Communications & Records', img: '/headshots/jaiden.jpg', email: 'psruf.vpcr@gmail.com', linkedin: 'https://www.linkedin.com/in/jaiden-martin/' },
      { name: 'Andrea Ortiz', title: 'VP Service', img: '/headshots/andrea.png', email: 'psruf.vpservice@gmail.com', linkedin: 'https://www.linkedin.com/in/andrea-ortiz-engineering/' },
      { name: 'Maria McDonald', title: 'VP Scholarship', img: '/headshots/maria.jpg', email: 'psruf.vpscholarship@gmail.com', linkedin: 'https://www.linkedin.com/in/maria-mcdonald21/' },
      { name: 'Janelle Whiteside', title: 'VP Social', img: '/headshots/janelle.jpg', email: 'psruf.vpsocial@gmail.com', linkedin: 'https://www.linkedin.com/in/janelle-whiteside-199846251/' },
      { name: 'Annie Stocks Natalias', title: 'VP Membership', img: '/headshots/annie.jpg', email: 'psruf.vpmembership@gmail.com', linkedin: 'https://www.linkedin.com/in/astocksnatalias/' },
      { name: 'Nandika Regatti', title: 'Webmaster', img: '/headshots/nandika.jpg', email: 'psruf.webmaster@gmail.com', linkedin: 'https://www.linkedin.com/in/nanre/' },
    ]
  },
  '2025-2026': {
    'Leaders': [
      { name: 'Maria McDonald', title: 'President', img: '/headshots/maria2.jpg', email: 'psruf.president@gmail.com', linkedin: 'https://www.linkedin.com/in/maria-mcdonald21/' },
      { name: 'Lianna Larson', title: 'VP Standards', img: '/headshots/lianna.jpg', email: 'psruf.vpstandards@gmail.com', linkedin: 'https://www.linkedin.com/in/lianna-larson/' },
      { name: 'Kalista Oberes', title: 'VP Finance', img: '/headshots/kalista.jpg', email: 'psruf.vpfinance@gmail.com', linkedin: 'https://www.linkedin.com/in/kalista-oberes/' },
      { name: 'Olivia Huewe', title: 'VP Communications & Records', img: '/headshots/olivia.jpg', email: 'psruf.vpcr@gmail.com', linkedin: 'https://www.linkedin.com/in/olivia-huewe/' },
      { name: 'Tori LaRose', title: 'VP Service', img: '/headshots/tori.jpg', email: 'psruf.vpservice@gmail.com', linkedin: 'https://www.linkedin.com/in/tori-larose/' },
      { name: 'Melissa Marino', title: 'VP Scholarship', img: '/headshots/melissa.jpg', email: 'psruf.vpscholarship@gmail.com', linkedin: 'https://www.linkedin.com/in/melissamarinoprofile/' },
      { name: 'Kali Schuchhardt', title: 'VP Social', img: '/headshots/kali.jpg', email: 'psruf.vpsocial@gmail.com', linkedin: 'https://www.linkedin.com/in/kalischuchhardt984/' },
      { name: 'Kaitlyn Kapalka', title: 'VP Membership', img: '/headshots/kaitlyn.jpg', email: 'psruf.vpmembership@gmail.com', linkedin: 'https://www.linkedin.com/in/kaitlynkapalka/' },
      { name: 'Isabella Goodwin', title: 'Webmaster', img: '/headshots/bella.png', email: 'psruf.webmaster@gmail.com', linkedin: 'https://www.linkedin.com/in/isabellagoodwin970/' },
    ]
  },
  '2026-2027': {
    'Leaders': [
      { name: 'Melissa Marino', title: 'President', img: '/headshots/melissa2.jpg', email: 'psruf.president@gmail.com', linkedin: 'https://www.linkedin.com/in/melissamarinoprofile/' },
      { name: 'Natalie Rhoads', title: 'VP Standards', img: '/headshots/natalie.jpg', email: 'psruf.vpstandards@gmail.com', linkedin: 'https://www.linkedin.com/in/natalie-rhoads/' },
      { name: 'Elle Burkhalter', title: 'VP Finance', img: '/headshots/elle.png', email: 'psruf.vpfinance@gmail.com', linkedin: 'https://www.linkedin.com/in/elle-burkhalter-485026337/' },
      { name: 'Samantha Capas', title: 'VP Communications & Records', img: '/headshots/samantha.jpg', email: 'psruf.vpcr@gmail.com', linkedin: 'https://www.linkedin.com/in/samantha-capas-b74269336/' },
      { name: 'Jennifer Rubin', title: 'VP Service', img: '/headshots/jennifer.jpg', email: 'psruf.vpservice@gmail.com', linkedin: 'https://www.linkedin.com/in/jennifer-rubin-123456789/' },
      { name: 'Ava Wood', title: 'VP Scholarship', img: '/headshots/ava.jpg', email: 'psruf.vpscholarship@gmail.com', linkedin: 'https://www.linkedin.com/in/ava-wood-71bb5730b/' },
      { name: 'Christina Chi', title: 'VP Social', img: '/headshots/christina.jpg', email: 'psruf.vpsocial@gmail.com', linkedin: 'https://www.linkedin.com/in/mei-hsin-chi-b99ba8329/' },
      { name: 'Jacqueline Salas', title: 'VP Membership', img: '/headshots/jacqueline.jpg', email: 'psruf.vpmembership@gmail.com', linkedin: 'https://www.linkedin.com/in/jacqueline-salas-leblanc-a55b82361/' },
      { name: 'Kali Schuchhardt', title: 'Webmaster', img: '/headshots/kali2.jpg', email: 'psruf.webmaster@gmail.com', linkedin: 'https://linkedin.com/in/kalischuchhardt984/' },
    ]
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { 
      staggerChildren: 0.06,
      delayChildren: 0.1
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 25, scale: 0.96 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1, 
    transition: { type: "spring", stiffness: 120, damping: 18 } 
  }
};

export default function Leadership() {
  const [selectedYear, setSelectedYear] = useState('2026-2027');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const executiveBoard = leaderData[selectedYear]?.Leaders || [];
  const years = ['2024-2025', '2025-2026', '2026-2027'];

  return (
    <div className="page-shell">
      <div className="page-hero">
        <motion.div 
          initial={{ opacity: 0, y: -15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="page-title">Meet our leaders</h1>
          <p className="page-subtitle">
            Our executive board leads the chapter with heart, purpose, and a commitment to growing together.
          </p>
        </motion.div>

        <div className="custom-dropdown">
          <button 
            className={`dropdown-toggle ${dropdownOpen ? 'active' : ''}`}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span>{selectedYear} Term</span>
            <motion.svg 
              animate={{ rotate: dropdownOpen ? 180 : 0 }} 
              transition={{ duration: 0.2 }}
              width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M3.5 6L8 11L12.5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </motion.svg>
          </button>
          
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div 
                className="dropdown-menu"
                initial={{ opacity: 0, y: -10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                {years.map((year) => (
                  <button
                    key={year}
                    className={`dropdown-option ${year === selectedYear ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedYear(year);
                      setDropdownOpen(false);
                    }}
                  >
                    <span>{year}</span>
                    {year === selectedYear && (
                       <motion.span 
                         initial={{ opacity: 0, scale: 0 }} 
                         animate={{ opacity: 1, scale: 1 }} 
                         className="check-icon"
                       >
                         ✓
                       </motion.span>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="content-section">
        <motion.div 
          className="leader-grid"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          key={selectedYear} 
        >
          {executiveBoard.map((leader, index) => (
            <motion.div 
              className="leader-card" 
              variants={cardVariants} 
              key={`${leader.name}-${index}`}
            >
              <div className="image-wrapper">
                <img src={getHeadshotUrl(leader.img)} alt={leader.name} className="leader-image" />
                <div className="image-glow-layer"></div>
              </div>
              <h3 className="leader-name">{leader.name}</h3>
              <p className="leader-title">{leader.title}</p>
              
              <div className="leader-links">
                <a href={`mailto:${leader.email}`} className="leader-link email-link" title="Email">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </a>
                <a href={leader.linkedin} target="_blank" rel="noopener noreferrer" className="leader-link linkedin-link" title="LinkedIn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
                    <circle cx="4" cy="4" r="2" />
                  </svg>
                </a>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}