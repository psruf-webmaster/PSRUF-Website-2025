
  import React, {useState} from 'react';
  import './Executive.css'
  
  const leaderData = {
    '2024-2025': {
      'Executive Board': [
        {name: 'Katie Samel', title: 'President', img: '/headshots/katie.jpg', email: 'psruf.president@gmail.com'}, 
        {name: 'Vivian Lowe', title: 'VP Standards', img: '/headshots/vivian.jpg', email: 'psruf.vpstandards@gmail.com'}, 
        {name: 'Truly Thomas', title: 'VP Finance', img: '/headshots/truly.jpg',  email: 'psruf.vpfinance@gmail.com'},
        {name: 'Jaiden Martin', title: 'VP Communications & Records', img: '/headshots/jaiden.jpg', email: 'psruf.vpcr@gmail.com'},
        {name: 'Andrea Ortiz', title: 'VP Service', img: '/headshots/andrea.jpg', email: 'psruf.vpservice@gmail.com'},
        {name: 'Maria McDonald', title: 'VP Scholarship', img: '/headshots/maria.jpg', email: 'psruf.vpscholarship@gmail.com'},
        {name: 'Janelle Whiteside', title: 'VP Social', img: '/headshots/janelle.jpg', email: 'psruf.vpsocial@gmail.com'},
        {name: 'Annie Stocks Natalias', title: 'VP Membership', img: '/headshots/annie.jpg', email: 'psruf.vpmembership@gmail.com'},
      ]
    },
    '2025-2026': {
      'Executive Board': [
        {name: 'Maria McDonald', title: 'President', img: '/headshots/maria.jpg', email: 'psruf.president@gmail.com'}, 
        {name: 'Lianna Larson', title: 'VP Standards', img: '/headshots/lianna.jpg', email: 'psruf.vpstandards@gmail.com'}, 
        {name: 'Kalista Oberes', title: 'VP Finance', img: '/headshots/kalista.jpg',  email: 'psruf.vpfinance@gmail.com'},
        {name: 'Olivia Huewe', title: 'VP Communications & Records', img: '/headshots/olivia.jpg', email: 'psruf.vpcr@gmail.com'},
        {name: 'Tori LaRose', title: 'VP Service', img: '/headshots/tori.jpg', email: 'psruf.vpservice@gmail.com'},
        {name: 'Melissa Marino', title: 'VP Scholarship', img: '/headshots/melissa.jpg', email: 'psruf.vpscholarship@gmail.com'},
        {name: 'Kali Schuchhardt', title: 'VP Social', img: '/headshots/kali.jpg', email: 'psruf.vpsocial@gmail.com'},
        {name: 'Kaitlyn Kapalka', title: 'VP Membership', img: '/headshots/kaitlyn.jpg', email: 'psruf.vpmembership@gmail.com'},
      ]
    }
  }
  
  
  export default function Leadership() {
    const [selectedYear, setSelectedYear] = useState('2025-2026');
  
    const handleChange = (e) => {
      setSelectedYear(e.target.value);
    };
  
    return (
      <div className="ExecWelcomeSection">
    <div className="WelcomeHeader">
      <h1 className="welcometext">Meet Our Executive Board!</h1>
      <div className="YearDropdownContainer">
        <select
          className="year-select"
          name="year"
          value={selectedYear}
          onChange={handleChange}
          required
        >
          {Object.keys(leaderData).map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
    </div>
  
    <div className="LeadersScrollContainer">
      {Object.entries(leaderData[selectedYear]).map(([sectionName, members]) => (
        <div key={sectionName} className="LeaderSection">
          <div className="LeaderColumn">
            {members.map((leader, index) => (
              <div className="LeaderCard" key={index}>
                <img src={leader.img} alt={leader.name} className="LeaderImage" />
                <div className="LeaderName">{leader.name}</div>
                <div className="LeaderTitle">{leader.title}</div>
                <div className="Email">{leader.email}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
    )}
  