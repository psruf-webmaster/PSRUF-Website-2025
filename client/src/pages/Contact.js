import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, MapPin, Sparkles } from 'lucide-react';
import heroImage from '../pics/20250606_144233_2B9D0D.JPEG';

export default function Contact() {
  return (
    <div className="page-shell">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-grid">
          
          {/* Left Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <motion.div 
              className="hero-badge"
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            >
              <Sparkles size={15} />
              Contact us
            </motion.div>

            <h1 className="hero-title">We’d love to hear from you.</h1>
            
            <p className="hero-description">
              Whether you are a prospective member, alumna, or partner, reach out and we will connect you with the right person.
            </p>

            <div className="hero-actions">
              <motion.a 
                className="button" 
                href="mailto:psruf.vpmembership@gmail.com"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Email the chapter <ArrowRight size={16} />
              </motion.a>
            </div>
          </motion.div>

          {/* Right Hero Image Card with Float Effect */}
          <motion.div 
            className="hero-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          >
            <motion.img
              src={heroImage}
              alt="Phi Sigma Rho chapter contact"
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
            />
            <motion.div 
              className="hero-card-float"
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 1 }}
            >
              Let’s connect.
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* Content Section with Scroll Animations & Hover Lifts */}
      <section className="content-section">
        <motion.div 
          className="info-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.2 }
            }
          }}
        >
          {/* Email Link Card */}
          <motion.a 
            href="mailto:psruf.vpmembership@gmail.com" 
            className="info-card info-card-link"
            style={{ textDecoration: 'none', color: 'inherit' }}
            variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
            whileHover={{ y: -8, transition: { duration: 0.2 } }}
          >
            <div className="pillar-icon">
              <Mail size={18} />
            </div>
            <h3>Email</h3>
            <p>psruf.vpmembership@gmail.com</p>
          </motion.a>

          {/* Location Card */}
          <motion.div 
            className="info-card"
            variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
            whileHover={{ y: -8, transition: { duration: 0.2 } }}
          >
            <div className="pillar-icon">
              <MapPin size={18} />
            </div>
            <h3>Location</h3>
            <p>
              PO Box 58304
              <br />
              Gainesville, FL 32611
            </p>
          </motion.div>

          {/* Report Bugs Mailto Link Card */}
          <motion.a 
            href="mailto:psruf.webmaster@gmail.com?subject=Bug%20Report" 
            className="info-card info-card-link"
            style={{ textDecoration: 'none', color: 'inherit' }}
            variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
            whileHover={{ y: -8, transition: { duration: 0.2 } }}
          >
            <div className="pillar-icon">
              <Sparkles size={18} />
            </div>
            <h3>Find any bugs?</h3>
            <p>Click here to report any bugs or issues you encounter.</p>
          </motion.a>

        </motion.div>
      </section>
    </div>
  );
}