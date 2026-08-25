import React from "react";
import { motion } from 'motion/react';
import { FileText, Download, Eye } from 'react-feather';
import './Alumni.css';

import bylawsPdf from '../bylaws/spring2026_bylaws.pdf';

export default function Bylaws() {
  return (
    <motion.section 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}
    >
      {/* Header & Controls Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(2rem, 3vw, 2.75rem)', fontWeight: '600', margin: 0, color: 'var(--home-maroon-deep)' }}>
            Bylaws (Updated April 2026)
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}
        >
          <motion.a 
            href={bylawsPdf} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="home-primary-cta"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', minHeight: 'auto', padding: '0.75rem 1.25rem', textDecoration: 'none' }}
            whileHover={{ scale: 1.05, boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}
            whileTap={{ scale: 0.96 }}
          >
            <Download size={16} /> Download PDF
          </motion.a>
        </motion.div>
      </div>

      {/* PDF Viewer Container with Enhanced Animation & Shadow */}
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{ 
          width: '100%', 
          height: '700px', 
          borderRadius: '1rem', 
          overflow: 'hidden', 
          border: '1px solid var(--home-border)', 
          background: '#fff',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.07)'
        }}
      >
        <iframe 
          src={`${bylawsPdf}#view=FitH`} 
          title="Phi Sigma Rho Bylaws"
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </motion.div>
    </motion.section>
  );
}