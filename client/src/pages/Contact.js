import React from 'react';
import { ArrowRight, Mail, MapPin, Sparkles } from 'lucide-react';

export default function Contact() {
  return (
    <div className="page-shell">
      <section className="hero-section">
        <div className="hero-grid">
          <div>
            <div className="hero-badge">
              <Sparkles size={15} />
              Contact us
            </div>
            <h1 className="hero-title">We’d love to hear from you.</h1>
            <p className="hero-description">
              Whether you are a prospective member, alumna, or partner, reach out and we will connect you with the right person.
            </p>
            <div className="hero-actions">
              <a className="button" href="mailto:psruf@ufl.edu">
                Email the chapter <ArrowRight size={16} />
              </a>
            </div>
          </div>

          <div className="hero-card">
            <img
              src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80"
              alt="Phi Sigma Rho chapter contact"
            />
            <div className="hero-card-float">Let’s connect.</div>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="info-grid">
          <div className="info-card">
            <div className="pillar-icon">
              <Mail size={18} />
            </div>
            <h3>Email</h3>
            <p>psruf@ufl.edu</p>
          </div>
          <div className="info-card">
            <div className="pillar-icon">
              <MapPin size={18} />
            </div>
            <h3>Location</h3>
            <p>University of Florida • Gainesville, FL</p>
          </div>
          <div className="info-card">
            <div className="pillar-icon">
              <Sparkles size={18} />
            </div>
            <h3>Recruitment inquiries</h3>
            <p>Send a message to start the conversation about joining the chapter.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
