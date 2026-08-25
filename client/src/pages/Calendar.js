import React from 'react';
import { motion } from 'motion/react';
import { CalendarDays } from 'lucide-react';
import './Calendar.css';

export default function Calendar() {
  return (
    <motion.main
      className="page-shell calendar-page-shell"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <section className="calendar-section">
        <div className="calendar-hero">
          <div className="calendar-hero-icon">
            <CalendarDays size={18} strokeWidth={1.8} />
          </div>

          <div className="calendar-hero-copy">
            <span className="calendar-eyebrow">
              Chapter events
            </span>

            <h1>Calendar</h1>

            <p>
              Stay up to date with everything happening around
              Phi Sigma Rho.
            </p>
          </div>
        </div>

        <motion.div
          className="calendar-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: 0.08,
            ease: 'easeOut',
          }}
        >
          <div className="calendar-card-top">
            <div>
              <span className="calendar-card-label">
                PSR Tau Chapter
              </span>
              <h2>Upcoming Events</h2>
            </div>

            <div className="calendar-card-icon">
              <CalendarDays size={20} strokeWidth={1.7} />
            </div>
          </div>

          <div className="calendar-frame-wrap">
            <iframe
              title="Phi Sigma Rho Tau Chapter Calendar"
              src="https://calendar.google.com/calendar/embed?src=psruf.webmaster%40gmail.com&ctz=America%2FNew_York"
              className="calendar-embed-frame"
              style={{ border: 0 }}
              frameBorder="0"
              scrolling="no"
            />
          </div>
        </motion.div>
      </section>
    </motion.main>
  );
}