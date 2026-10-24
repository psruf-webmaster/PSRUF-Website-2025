import { motionTokens } from '../design/motion';
import React, { useState, useEffect } from 'react';
import { ArrowRight, HeartHandshake, Sparkles, Users, CalendarDays, MapPin } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import './Recruitment.css';
import heroImage from '../pics/20260423_195529_6A0A07.JPEG';

export default function Recruitment() {
  const reduceMotion = useReducedMotion();
  const [pnmEvents, setPnmEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  useEffect(() => {
    const loadPnmEvents = async () => {
      try {
        setIsLoadingEvents(true);
        const response = await fetch('/api/events/public/pnm');
        if (!response.ok) throw new Error(`Events returned ${response.status}`);
        const data = await response.json();
        setPnmEvents(Array.isArray(data) ? data : []);
      } catch (err) {
        setPnmEvents([]);
      } finally {
        setIsLoadingEvents(false);
      }
    };
    loadPnmEvents();
  }, []);

  const acceptedMajors = [
    "Aerospace Engineering", "Agricultural & Biological Engineering", "Astronomy",
    "Biomedical Engineering", "Computer Science", "Chemical Engineering",
    "Civil Engineering", "Computer Engineering", "Data Science",
    "Digital Arts and Sciences", "Electrical Engineering", "Environmental Engineering",
    "Geomatics", "Industrial & Systems Engineering", "Materials Science and Engineering",
    "Mechanical Engineering", "Physics", "Nuclear Engineering",
    "Nuclear and Radiological Sciences", "Undecided Engineering"
  ];

  return (
    <div className="page-shell recruitment-page">
      {/* HERO SECTION */}
      <section className="hero-section" style={{ background: 'transparent', boxShadow: 'none', border: 'none', padding: '3rem 1.5rem' }}>
        <div className="hero-grid" style={{ background: 'transparent', boxShadow: 'none', border: 'none', padding: 0 }}>
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: motionTokens.enter, ease: motionTokens.ease }}
          >
            <motion.div 
              className="hero-badge"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <Sparkles size={15} />
              Spring recruitment
            </motion.div>
            <h1 className="hero-title" style={{ color: 'var(--home-maroon-deep)' }}>
              Engineering is tough. Finding your friends shouldn't be.
            </h1>
            <p className="hero-description" style={{ color: 'var(--home-copy-soft)' }}>
              Navigating classes, labs, and life at UF is so much better when you have a support system that actually gets it. 
              We’re a sisterhood that studies hard, but we also love a good social, grabbing coffee, and making the most out of college together. 
              Come as you are, we'd love to meet you.
            </p>
            <div className="hero-actions">
              <motion.a 
                className="button" 
                href="#events" 
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' });
                }}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
              >
                See our rush schedule <ArrowRight size={16} />
              </motion.a>
              <motion.a 
                className="button-secondary" 
                href="https://docs.google.com/forms/d/e/1FAIpQLSd7XzAEOR7hOqxU3NOFY9df0ZQFcPGI5LPeSI1pW3jQLo4aXg/viewform"
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
              >
                Join Our Email List
              </motion.a>
            </div>
          </motion.div>

          <motion.div 
            className="hero-card"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: motionTokens.enter, delay: 0.2, ease: motionTokens.ease }}
            whileHover={{ y: -3, scale: 1.015 }}
          >
            <motion.img
              src={heroImage}
              alt="Phi Sigma Rho Sisters"
            />
            <div className="hero-card-float">Ready to meet your future sisters?</div>
          </motion.div>
        </div>
      </section>

      {/* VP MEMBERSHIP MESSAGE */}
      <section className="content-section">
        <motion.div 
          className="section-header-centered"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: motionTokens.enter }}
        >
          <h2>A personal welcome</h2>
        </motion.div>

        <motion.div 
          className="vp-message-grid"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: motionTokens.enter, ease: motionTokens.ease }}
        >
          <motion.div 
            className="vp-photo-card"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: motionTokens.fast }}
          >
            <img 
              src="/message_from_vp_membership.jpeg" 
              alt="VP Membership Kaitlyn Kapalka" 
              className="vp-image" 
            />
          </motion.div>

          <div className="vp-letter-card">
            <div className="vp-letter-content">
              <p>Dear PNMs,</p>
              <p>
                Like many of you, two years ago I was so nervous for recruitment and what it would look like. I remember showing up to my first open social late because I wasn't even sure if I wanted to go and feeling that anxiety up until recruitment. I wish someone had told me there was no need to worry at all.
              </p>
              <p>
                Now I know how many amazing people this chapter holds. When people say just be yourself, they truly mean it and you will find the people meant for you! In your time here at UF you will meet incredible people and build lifelong friendships. Phi Sigma Rho is just another step in that journey of finding what fits for you.
              </p>
              <p>
                If you're feeling nervous, you're never alone. All of us have been there as well! We are ready to share our sisterhood with you and are just as excited to meet you as you are to learn more about us. During rush, we hope you feel the bonds and encouragement that make this sisterhood so special.
              </p>
              <p className="vp-signoff">
                PRL,<br />
                <strong>Kaitlyn Kapalka</strong>
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Upcoming recruitment events */}
      <section id="events" className="content-section recruitment-events">
        <div className="recruitment-events-heading">
          <div>
            <span className="recruitment-events-eyebrow">Meet the chapter</span>
            <h2>Open socials &amp; rush events</h2>
            <p>Come meet our sisters. No RSVP required unless noted.</p>
          </div>
          {!isLoadingEvents && pnmEvents.length > 0 && (
            <span className="recruitment-events-count">{pnmEvents.length} upcoming</span>
          )}
        </div>

        {isLoadingEvents ? (
          <div className="recruitment-events-empty" role="status">Loading upcoming events…</div>
        ) : pnmEvents.length > 0 ? (
          <div className="recruitment-events-rail">
            {pnmEvents.map((event, index) => {
              const startDate = new Date(event.startAt);
              const month = startDate.toLocaleDateString('en-US', { month: 'short' });
              const day = startDate.getDate();
              const time = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
              const weekday = startDate.toLocaleDateString('en-US', { weekday: 'long' });
              const eventImageUrl = event.image || event.imageUrl || event.coverImage;

              return (
                <motion.article
                  key={event._id}
                  className="recruitment-event-card"
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : Math.min(index * 0.07, 0.21), ease: motionTokens.ease }}
                >
                  <div className={`recruitment-event-cover${eventImageUrl ? ' has-image' : ''}`}>
                    {eventImageUrl && (
                      <img src={eventImageUrl} alt={event.title} onError={e => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement.classList.remove('has-image');
                      }} />
                    )}
                  </div>
                  <div className="recruitment-event-body">
                    <div className="recruitment-event-date-row">
                      <time className="recruitment-event-date" dateTime={event.startAt}>
                        <span>{month}</span>
                        <strong>{day}</strong>
                      </time>
                      <div className="recruitment-event-time">
                        <span>{weekday}</span>
                        <span><CalendarDays size={14} aria-hidden="true" />{time}</span>
                      </div>
                    </div>
                    <h3>{event.title}</h3>
                    {event.description && <p>{event.description}</p>}
                    <div className="recruitment-event-location">
                      <MapPin size={16} aria-hidden="true" />
                      <span>{event.location || 'Location to be announced'}</span>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        ) : (
          <motion.div
            className="recruitment-events-empty recruitment-events-invitation"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: motionTokens.enter, ease: motionTokens.ease }}
          >
            <div className="recruitment-invitation-icon" aria-hidden="true"><CalendarDays size={28} /><Sparkles size={16} /></div>
            <span className="recruitment-invitation-label">Your next chapter starts here</span>
            <h3>Good things are on the way.</h3>
            <p>We’re planning more chances to meet your future sisters. Join our email list to hear about open socials and rush dates.</p>
            <a className="button" href="https://docs.google.com/forms/d/e/1FAIpQLSd7XzAEOR7hOqxU3NOFY9df0ZQFcPGI5LPeSI1pW3jQLo4aXg/viewform">Keep me in the loop <ArrowRight size={16} aria-hidden="true" /></a>
            <span className="recruitment-invitation-note">A little curiosity. A lot of possibility.</span>
          </motion.div>
        )}
      </section>

      {/* WHY PHI SIGMA RHO & PILLARS */}
      <section className="content-section">
        <motion.div 
          className="section-header-centered"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: motionTokens.enter }}
        >
          <span>Our roots</span>
          <h2>Built for women in STEM</h2>
          <p>
            Phi Sigma Rho was founded in 1984 at Purdue University by Abby McDonald and Rashmi Khanna to provide a sorority experience tailored to the unique demands of engineering and technical fields. Today, we are 40+ chapters strong nationwide.
          </p>
        </motion.div>

        <div className="info-grid-3x1">
          <motion.div 
            className="info-card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: motionTokens.enter, delay: 0.1 }}
            whileHover={{ y: -3, scale: 1.02 }}
          >
            <div className="pillar-icon"><Users size={18} /></div>
            <h3>Friendship</h3>
            <p>Get to know women in your classes who understand late-night study sessions and celebrate your wins right alongside you.</p>
          </motion.div>

          <motion.div 
            className="info-card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: motionTokens.enter, delay: 0.2 }}
            whileHover={{ y: -3, scale: 1.02 }}
          >
            <div className="pillar-icon"><HeartHandshake size={18} /></div>
            <h3>Scholarship</h3>
            <p>Sustain academic excellence with built-in study groups, upperclassmen mentorship, and a community that prioritizes your goals.</p>
          </motion.div>

          <motion.div 
            className="info-card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: motionTokens.enter, delay: 0.3 }}
            whileHover={{ y: -3, scale: 1.02 }}
          >
            <div className="pillar-icon"><Sparkles size={18} /></div>
            <h3>Encouragement</h3>
            <p>From leadership roles to lifelong personal support, find a space where you are constantly inspired to grow with confidence.</p>
          </motion.div>
        </div>
      </section>

      {/* ACCEPTED MAJORS */}
      <section className="content-section">
        <motion.div 
          className="section-header-centered"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: motionTokens.enter }}
        >
          <span>Qualifications</span>
          <h2>Accepted Majors</h2>
          <p>We welcome undergraduate students pursuing degrees across technical and scientific disciplines.</p>
        </motion.div>

        <div className="majors-grid">
          {acceptedMajors.map((major, index) => (
            <motion.div 
              key={index} 
              className="major-chip"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: motionTokens.fast, delay: index * 0.02 }}
              whileHover={{ y: -3, scale: 1.04, backgroundColor: '#ffffff', borderColor: 'var(--home-maroon)' }}
              whileTap={{ scale: 0.97 }}
            >
              {major}
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}