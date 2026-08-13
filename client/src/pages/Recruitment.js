import React from 'react';
import { ArrowRight, HeartHandshake, Sparkles, Users } from 'lucide-react';

export default function Recruitment() {
  return (
    <div className="page-shell">
      <section className="hero-section">
        <div className="hero-grid">
          <div>
            <div className="hero-badge">
              <Sparkles size={15} />
              Spring recruitment
            </div>
            <h1 className="hero-title">Join a community that feels like home.</h1>
            <p className="hero-description">
              Recruitment is the first step into a chapter full of support, friendship, and opportunities to grow.
              We welcome women who are curious, ambitious, and ready to make lasting memories.
            </p>
            <div className="hero-actions">
              <a className="button" href="/contact">
                Get in touch <ArrowRight size={16} />
              </a>
              <a className="button-secondary" href="/about">
                Learn what to expect
              </a>
            </div>
          </div>

          <div className="hero-card">
            <img
              src="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=900&q=80"
              alt="Women connecting during recruitment"
            />
            <div className="hero-card-float">Ready to meet your future sisters?</div>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="info-grid">
          <div className="info-card">
            <div className="pillar-icon">
              <Users size={18} />
            </div>
            <h3>Meet the chapter</h3>
            <p>Get to know the women in our chapter and see how we show up for one another through every season.</p>
          </div>
          <div className="info-card">
            <div className="pillar-icon">
              <HeartHandshake size={18} />
            </div>
            <h3>Build meaningful friendships</h3>
            <p>Recruitment is about connection, confidence, and finding a space where you can truly belong.</p>
          </div>
          <div className="info-card">
            <div className="pillar-icon">
              <Sparkles size={18} />
            </div>
            <h3>Grow with purpose</h3>
            <p>From leadership to service, your journey with Phi Sigma Rho can be both personal and impactful.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
