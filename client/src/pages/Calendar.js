import React from 'react';
import { motion } from 'motion/react';
import { CalendarDays } from 'lucide-react';

export default function Calendar() {
  return (
    <motion.div
      className="page-shell calendar-page-shell"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <motion.section
        className="calendar-embed-shell"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <motion.div
          className="calendar-embed-head"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
        >
          <div className="calendar-embed-badge">
            <CalendarDays size={15} />
            Chapter calendar
          </div>
          <h1>Calendar</h1>
          <p>All chapter events in one place. Tap an event to see details.</p>
        </motion.div>

        <motion.div
          className="calendar-embed-card"
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.14, ease: 'easeOut' }}
        >
          <iframe
            title="Phi Sigma Rho Tau Chapter Calendar"
            src="https://calendar.google.com/calendar/embed?src=psruf.webmaster%40gmail.com&ctz=America%2FNew_York"
            className="calendar-embed-frame"
            style={{ border: 0 }}
            frameBorder="0"
            scrolling="no"
          />
        </motion.div>
      </motion.section>
    </motion.div>
  );
}
