import React, {useState} from 'react';
import './Leadership.css'

const leaderData = {
  '2025-2026': {
    'Executive Board': [
      {name: 'Maria McDonald', title: 'President', img: '/headshots/maria.jpg'}, 
      {name: 'Lianna Larson', title: 'VP Standards', img: '/headshots/lianna.jpg'}, 
      {name: 'Kalista Oberes', title: 'VP Finance', img: '/headshots/kalista.jpg'},
      {name: 'Olivia Huewe', title: 'VP Communications & Records', img: '/headshots/olivia.jpg'},
      {name: 'Tori LaRose', title: 'VP Service', img: '/headshots/tori.jpg'},
      {name: 'Melissa Marino', title: 'VP Scholarship', img: '/headshots/melissa.jpg'},
      {name: 'Kali Schuchhardt', title: 'VP Social & Web Developer', img: '/headshots/kali.jpg'},
      {name: 'Kaitlyn Kapalka', title: 'VP Membership', img: '/headshots/kaitlyn.jpg'},
    ],
    'Directors':[
      {name: 'Samantha Capas', title: 'Sister at Large', img: '/headshots/samanthac.jpg'}, 
      {name: 'Jessica Cormack', title: 'Standards Board', img: '/headshots/jessica.jpg'}, 
      {name: 'Annie Stocks-Natalias', title: 'Standards Board & Fundraising Chair', img: '/headshots/annie.jpg'},
      {name: 'Janelle Whiteside', title: 'Standards Board', img: '/headshots/janelle.jpg'},
      {name: 'Libby Trent', title: 'Standards Board', img: '/headshots/libby.jpg'},
      {name: 'Ava Wood', title: 'Public Relations Director', img: '/headshots/avaw.jpg'},
      {name: 'Andrea Ortiz', title: 'Public Relations Director', img: '/headshots/andrea.jpg'},
      {name: 'Ivanna Milian', title: 'Sergeant-at-Arms', img: '/headshots/ivanna.jpg'},
      {name: 'Sydney Rivas', title: 'Membership Educator', img: '/headshots/sydneyr.jpg'},
      {name: 'Anna Miller', title: 'Membership Educator', img: '/headshots/annam.jpg'},
      {name: 'Anna Hudson', title: 'Recruitment Board & Web Developer', img: '/headshots/annah.jpg'},
      {name: 'Teah Agaj', title: 'Recruitment Board', img: '/headshots/teah.jpg'},
      {name: 'Nadia Elmore', title: 'Recruitment Board', img: '/headshots/nadia.jpg'},
      {name: 'Amber Nguyen', title: 'Recruitment Board', img: '/headshots/amber.jpg'},
      {name: 'Ava Forehand', title: 'Recruitment Board', img: '/headshots/avaf.jpg'},
      {name: 'Jacqueline Salas', title: 'Recruitment Board', img: '/headshots/jacqueline.jpg'},


    ],
    'Chairs':[
      {name: 'Nandika Regatti', title: 'Webmaster', img: '/headshots/nandika.jpg'}, 
      {name: 'Andria Subhit', title: 'Web Developer', img: '/headshots/andria.jpg'}, 
      {name: 'Angie Arrasco Pinedo', title: 'Sisterhood Chair', img: '/headshots/angie.jpg'}, 
      {name: 'Natalie Rhoads', title: 'Sisterhood Chair', img: '/headshots/natalie.jpg'}, 
      {name: 'Cate DiMassa', title: 'Power Penguin', img: '/headshots/cate.jpg'},
      {name: 'Jennifer Rubin', title: 'STEM Chair', img: '/headshots/jennifer.jpg'},
      {name: 'Elle Burkhalter', title: 'Philanthropy Chair', img: '/headshots/elle.jpg'},
      {name: 'Avalee Demidovich', title: 'Philanthropy Chair', img: '/headshots/avalee.jpg'},
      {name: 'Shreya Shanmugam', title: 'Fundraising Chair', img: '/headshots/shreya.jpg'},
      {name: 'Christina Chi', title: 'External Affairs & Banquet Chair', img: '/headshots/christina.jpg'},
      {name: 'Isabella Goodwin', title: 'Banquet Chair', img: '/headshots/isabella.jpg'},
      {name: 'Emily Wells', title: 'Fam/Alum Chair', img: '/headshots/emily.jpg'},
      {name: 'Krishna Surapaneni', title: 'Professional Development Chair', img: '/headshots/krishna.jpg'},
      {name: 'Jaydy Suarez', title: 'Memorabilia Chair', img: '/headshots/jaydy.jpg'},
      {name: 'Lucy Saadvandi', title: 'Memorabilia Chair', img: '/headshots/lucy.jpg'},
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
    <h1 className="welcometext">Meet Our Leaders!</h1>
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
        <h2 className="SectionTitle">{sectionName}</h2>
        <div className="LeaderColumn">
          {members.map((leader, index) => (
            <div className="LeaderCard" key={index}>
              <img src={leader.img} alt={leader.name} className="LeaderImage" />
              <div className="LeaderName">{leader.name}</div>
              <div className="LeaderTitle">{leader.title}</div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
</div>
  )}
