import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, FileText, Download, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Import dedicated modern stylesheet
import './Alumni.css';

// Import your PDF newsletter
import alumniNewsletter from '../alumn/newsletter.pdf';

// Dynamically fetch every image in /src/alumn/ automatically
const importAll = (r) => r.keys().map(r);
const RAW_PHOTOS = importAll(require.context('../alumn', false, /\.(png|jpe?g|webp|JPG|JPEG)$/));

// Shuffle helper for randomized cycling
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const PHOTO_CAPTIONS = [
  "Sisterhood Reunion & Gatherings",
  "Milestones & Professional Growth",
  "Lasting Bonds Beyond Graduation",
  "Chapter Traditions & Memories",
  "Empowering Women in Engineering",
  "Lasting Sisterhood Beyond Graduation",
  "Alumnae Networking & Support"
];

export default function Alumni() {
  const [alumniPhotos, setAlumniPhotos] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Force scroll to top on page load/reload
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Randomize photos once on component mount
  useEffect(() => {
    if (RAW_PHOTOS.length > 0) {
      setAlumniPhotos(shuffleArray(RAW_PHOTOS));
    }
  }, []);

  // Cycle through randomized photos with smooth timing
  useEffect(() => {
    if (alumniPhotos.length === 0) return;
    const timer = setInterval(() => {
      setCurrentPhotoIndex((prev) => (prev + 1) % alumniPhotos.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [alumniPhotos]);

  return (
    <div className="home-landing">
      {/* --- Hero Section --- */}
      <section className="home-panel home-panel-hero" style={{ paddingBottom: '1.5rem', overflow: 'hidden' }}>
        <div className="home-hero-backdrop">
          <motion.div 
            className="home-orb home-orb-one"
            animate={{ y: [0, -20, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="home-orb home-orb-two"
            animate={{ y: [0, 25, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="home-orb home-orb-three"
            animate={{ x: [0, 15, 0], y: [0, -15, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="home-hero-grid" style={{ gridTemplateColumns: '1.15fr 0.85fr', alignItems: 'center' }}>
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="home-hero-copy"
          >
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="home-hero-kicker"
            >
              <Sparkles size={13} />
              Alumnae Network & Support System
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="home-hero-title" 
              style={{ fontSize: 'clamp(3.8rem, 7.2vw, 6.8rem)', lineHeight: '0.94' }}
            >
              Graduation is just the beginning.
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="home-hero-description" 
              style={{ fontSize: 'clamp(1.1rem, 1.9vw, 1.28rem)' }}
            >
              Just because you graduated doesn’t mean that you’ve lost your support system! Stay closely connected with your sisters across every chapter long after college.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="home-hero-actions"
            >
              <motion.a 
                whileHover={{ scale: 1.04, x: 4 }}
                whileTap={{ scale: 0.97 }}
                className="home-primary-cta" 
                href="mailto:psrufalumnae@gmail.com"
              >
                Stay in Touch <ArrowRight size={18} />
              </motion.a>
            </motion.div>
          </motion.div>

          {/* --- Larger Floaty Interactive Visual Gallery Stage --- */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -8, scale: 1.01 }}
            className="home-hero-editorial"
            style={{ width: '100%', maxWidth: '520px', justifySelf: 'end' }}
          >
            <div className="home-editorial-card" style={{ padding: '1.35rem' }}>
              <div className="home-editorial-meta">
                <span>Alumnae Community</span>
                <span>Active Network</span>
              </div>
              <div className="home-editorial-frame" style={{ aspectRatio: '1 / 1' }}>
                {alumniPhotos.length > 0 ? (
                  <AnimatePresence mode="wait">
                    <motion.img 
                      key={currentPhotoIndex}
                      src={alumniPhotos[currentPhotoIndex]} 
                      alt="Phi Sigma Rho Alumnae" 
                      className="home-editorial-image is-visible"
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.7, ease: "easeInOut" }}
                    />
                  </AnimatePresence>
                ) : (
                  <div className="home-social-media-empty">
                    Add photos to /src/alumn
                  </div>
                )}
                <div className="home-editorial-overlay">
                  <motion.span
                    key={currentPhotoIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  >
                    {PHOTO_CAPTIONS[currentPhotoIndex % PHOTO_CAPTIONS.length]}
                  </motion.span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- Combined Narrative & Newsletter Section with comfortable spacing --- */}
      <section className="home-panel" style={{ padding: '1rem 2rem 4rem', maxWidth: '1320px', margin: '0 auto' }}>
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="home-editorial-aside"
          style={{ marginBottom: '2.5rem' }}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="home-small-label" 
            style={{ display: 'inline-flex', width: 'fit-content' }}
          >
            <Users size={13} />
            Lifelong Sisterhood
          </motion.div>
          <h2>Connected across chapters, traditions, and milestones.</h2>
          <p>
            Each year, alums reunite with their sisters at national conferences and conventions and network with alums from all chapters. The strength of our sisterhood even as an alum is obvious through active social networking groups and fun events like holiday gift exchanges and sharing each other’s accomplishments through penguin shoutouts or highlights in our newsletters.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ boxShadow: '0 40px 90px rgba(84, 28, 42, 0.16)' }}
          className="home-editorial-card"
          style={{ padding: '2.5rem', transition: 'box-shadow 0.4s ease, transform 0.4s ease' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <div className="home-small-label" style={{ display: 'inline-flex', width: 'fit-content', marginBottom: '0.75rem' }}>
                <FileText size={13} />
                Interactive Publication
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(2rem, 3vw, 2.75rem)', fontWeight: '600', margin: 0, color: 'var(--home-maroon-deep)' }}>
                Explore Our Alumnae Newsletter
              </h2>
            </div>
            <div>
              <motion.a 
                href={alumniNewsletter} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="home-primary-cta"
                style={{ minHeight: 'auto', padding: '0.75rem 1.25rem' }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
              >
                <Download size={16} /> Download PDF
              </motion.a>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ width: '100%', height: '700px', borderRadius: '1rem', overflow: 'hidden', border: '1px solid var(--home-border)', background: '#fff' }}
          >
            <iframe 
              src={`${alumniNewsletter}#view=FitH`} 
              title="Phi Sigma Rho Alumnae Newsletter"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}