import React from 'react';
import { ArrowRight, Sparkles, Users } from 'lucide-react';

export default function Partners() {
  return (
    <div className="page-shell">
      <section className="hero-section">
        <div className="hero-grid">
          <div>
            <div className="hero-badge">
              <Sparkles size={15} />
              Community partners
            </div>
            <h1 className="hero-title">Building impact together.</h1>
            <p className="hero-description">
              Phi Sigma Rho partners with organizations and initiatives that strengthen our community and amplify our service work.
            </p>
            <div className="hero-actions">
              <a className="button" href="/#contact">
                Collaborate with us <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="info-grid">
          <div className="info-card">
            <div className="pillar-icon">
              <Users size={18} />
            </div>
            <h3>Local impact</h3>
            <p>We intentionally work with groups that reflect our values of service and community engagement.</p>
          </div>
          <div className="info-card">
            <div className="pillar-icon">
              <Sparkles size={18} />
            </div>
            <h3>Shared mission</h3>
            <p>Every collaboration helps us expand our reach and create meaningful opportunities.</p>
          </div>
          <div className="info-card">
            <div className="pillar-icon">
              <ArrowRight size={18} />
            </div>
            <h3>Open to partnerships</h3>
            <p>We welcome new opportunities to grow with organizations that support women in STEM.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
