import React from 'react';
import { ArrowRight, Award, BookOpen, HeartHandshake, Sparkles, Star, Users } from 'lucide-react';

const highlights = [
  { title: 'Active Members', value: '85+', icon: Users },
  { title: 'Community Hours', value: '2,400+', icon: HeartHandshake },
  { title: 'Average GPA', value: '3.6', icon: Award },
  { title: 'Leadership Growth', value: '100%', icon: Star },
];

const pillars = [
  {
    title: 'Sisterhood',
    description: 'Build lifelong friendships with women who share your passion for engineering.',
    icon: Users,
  },
  {
    title: 'Scholarship',
    description: 'Support one another through tutoring, study nights, and academic encouragement.',
    icon: BookOpen,
  },
  {
    title: 'Service',
    description: 'Create impact through philanthropy, campus engagement, and community outreach.',
    icon: HeartHandshake,
  },
  {
    title: 'Leadership',
    description: 'Grow your confidence through mentorship, committees, and executive opportunities.',
    icon: Star,
  },
];

export default function Home() {
  return (
    <div className="page-shell">
      <section className="hero-section">
        <div className="hero-grid">
          <div>
            <div className="hero-badge">
              <Sparkles size={15} />
              Tau Chapter at University of Florida
            </div>
            <h1 className="hero-title">Empowering women in engineering.</h1>
            <p className="hero-description">
              Phi Sigma Rho creates a vibrant, supportive sisterhood for women in engineering and engineering technology.
              We grow together through friendship, scholarship, service, and leadership every semester.
            </p>
            <div className="hero-actions">
              <a className="button" href="/recruitment">
                Join our sisterhood <ArrowRight size={16} />
              </a>
              <a className="button-secondary" href="/leadership">
                Explore leadership
              </a>
            </div>
            <div className="hero-metrics">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="metric-pill">
                    <Icon size={15} />
                    <span>{item.value} {item.title}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="hero-card">
            <img
              src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80"
              alt="Phi Sigma Rho sisters together"
            />
            <div className="hero-card-float">A close-knit chapter, built to last.</div>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <p className="eyebrow">Our values</p>
          <h2>Built around sisterhood, scholarship, service, and leadership.</h2>
        </div>

        <div className="pillars-grid">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div key={pillar.title} className="pillar-card">
                <div className="pillar-icon">
                  <Icon size={18} />
                </div>
                <h3>{pillar.title}</h3>
                <p>{pillar.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="content-section">
        <div className="info-grid">
          <div className="info-card">
            <h3>Re-engineering sorority life</h3>
            <p>Founded in 1984, Phi Sigma Rho continues to create an inclusive and empowering space for women in STEM.</p>
          </div>
          <div className="info-card">
            <h3>Meaningful connections</h3>
            <p>From study sessions to social events, the chapter creates room for every sister to belong.</p>
          </div>
          <div className="info-card">
            <h3>Next steps</h3>
            <p>Explore recruitment, leadership opportunities, and chapter updates from one polished experience.</p>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <p className="eyebrow">Why it feels different</p>
          <h2>A chapter experience that blends community, growth, and connection.</h2>
        </div>
        <div className="info-grid">
          <div className="info-card">
            <h3>Guided by values</h3>
            <p>Every event and opportunity is shaped around sisterhood, support, and academic success.</p>
          </div>
          <div className="info-card">
            <h3>Built for belonging</h3>
            <p>Members find a welcoming place to show up as themselves and grow with confidence.</p>
          </div>
          <div className="info-card">
            <h3>Made to last</h3>
            <p>The chapter experience is designed to create friendships and memories that carry beyond college.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
