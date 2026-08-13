import React from 'react';
import { ArrowRight, Sparkles, Users } from 'lucide-react';

export default function Alumni() {
  return (
    <div className="page-shell">
      <section className="hero-section">
        <div className="hero-grid">
          <div>
            <div className="hero-badge">
              <Sparkles size={15} />
              Alumni network
            </div>
            <h1 className="hero-title">Stay connected long after graduation.</h1>
            <p className="hero-description">
              Our alumnae community keeps shaping the chapter through mentorship, professional opportunities, and lasting sisterhood.
            </p>
            <div className="hero-actions">
              <a className="button" href="/contact">
                Reach out <ArrowRight size={16} />
              </a>
            </div>
          </div>

          <div className="hero-card">
            <img
              src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80"
              alt="Phi Sigma Rho alumnae"
            />
            <div className="hero-card-float">A network that keeps growing.</div>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="info-grid">
          <div className="info-card">
            <div className="pillar-icon">
              <Users size={18} />
            </div>
            <h3>Mentorship</h3>
            <p>Current sisters and alumnae connect through advice, internships, and career guidance.</p>
          </div>
          <div className="info-card">
            <div className="pillar-icon">
              <Sparkles size={18} />
            </div>
            <h3>Events</h3>
            <p>We gather for reunions, networking nights, and special chapter celebrations.</p>
          </div>
          <div className="info-card">
            <div className="pillar-icon">
              <ArrowRight size={18} />
            </div>
            <h3>Stay involved</h3>
            <p>Alumnae play a meaningful role in supporting the future of the chapter.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
