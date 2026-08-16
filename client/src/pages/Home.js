import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // Upgraded import for AnimatePresence
import { Link } from 'react-router-dom';
import {
  Aperture,
  ArrowRight,
  Award,
  CalendarDays,
  Clock3,
  MapPin,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import './Home.css';

const chapterPhoto = '/dbb97d8762356babafe63b3cef9f46fcfedf78a1.png';

const editorialPhotosContext = require.context(
  '../pics',
  false,
  /\.(jpg|jpeg|png|webp)$/i
);

const editorialPhotos = editorialPhotosContext
  .keys()
  .map((file) => editorialPhotosContext(file));

const highlightBadges = [
  { title: 'Active Members', value: '60+', icon: Users },
  { title: 'Average GPA', value: '3.6', icon: Award },
  { title: 'Leadership Growth', value: '100%', icon: Star },
];

function MaskedReveal({ children, delay = 0, className = 'home-mask-line' }) {
  return (
    <span className={className}>
      <motion.span
        className="home-mask-content"
        initial={{ y: '112%' }}
        animate={{ y: '0%' }}
        transition={{
          duration: 0.9,
          delay,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export default function Home() {
  const [pnmEvents, setPnmEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [parallaxOffset, setParallaxOffset] = useState(0);

  const [editorialPhotoIndex, setEditorialPhotoIndex] = useState(() =>
    editorialPhotos.length > 0
      ? Math.floor(Math.random() * editorialPhotos.length)
      : 0
  );

  const [isEditorialPhotoVisible, setIsEditorialPhotoVisible] = useState(true);
  const [posts, setPosts] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState(null);
  const [activeSlides, setActiveSlides] = useState({});
  const carouselRef = useRef(null);

  /* ------------------------------------------------------------
   * EDITORIAL PHOTO ROTATION (Smoother Transition)
   * ------------------------------------------------------------ */
  useEffect(() => {
    if (editorialPhotos.length <= 1) return undefined;

    const interval = setInterval(() => {
      setIsEditorialPhotoVisible(false);
      setTimeout(() => {
        setEditorialPhotoIndex((currentIndex) => {
          let nextIndex;
          do {
            nextIndex = Math.floor(Math.random() * editorialPhotos.length);
          } while (nextIndex === currentIndex && editorialPhotos.length > 1);
          return nextIndex;
        });
        setIsEditorialPhotoVisible(true);
      }, 800); // Increased slightly for a more natural fade gap
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  /* ------------------------------------------------------------
   * INSTAGRAM POSTS
   * ------------------------------------------------------------ */
  useEffect(() => {
    const loadInstagramPosts = async () => {
      try {
        setIsLoadingPosts(true);
        setPostsError(null);
        const response = await fetch('https://feeds.behold.so/XMOkchRH38VeLujNjDxO');
        if (!response.ok) throw new Error(`Instagram feed returned ${response.status}`);
        const data = await response.json();
        
        const items = data.posts || [];
        const formatted = items
          .map((item) => {
            let images = [];
            if (item.mediaType === 'CAROUSEL_ALBUM' && item.children?.length) {
              images = item.children
                .map((child) => child.sizes?.large?.mediaUrl || child.sizes?.medium?.mediaUrl || child.mediaUrl)
                .filter(Boolean);
            } else {
              const image = item.sizes?.large?.mediaUrl || item.sizes?.medium?.mediaUrl || item.mediaUrl || item.thumbnailUrl;
              if (image) images = [image];
            }
            return {
              id: item.id,
              handle: '@phisigmarhouf',
              title: item.prunedCaption?.split('\n')[0]?.slice(0, 50) || 'Chapter moment',
              images,
              permalink: item.permalink || 'https://www.instagram.com/phisigmarhouf/',
            };
          })
          .filter((post) => post.images.length > 0);

        if (formatted.length === 0) throw new Error('No Instagram posts were returned.');
        setPosts(formatted);
      } catch (err) {
        setPostsError(err.message);
      } finally {
        setIsLoadingPosts(false);
      }
    };
    loadInstagramPosts();
  }, []);

  /* ------------------------------------------------------------
   * PNM EVENTS
   * ------------------------------------------------------------ */
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

  /* ------------------------------------------------------------
   * INSTAGRAM ALBUM SLIDES (Auto-rotate for carousels)
   * ------------------------------------------------------------ */
  useEffect(() => {
    const albumPosts = posts.filter((post) => post.images.length > 1);
    if (albumPosts.length === 0) return undefined;

    const interval = setInterval(() => {
      setActiveSlides((current) => {
        const next = { ...current };
        albumPosts.forEach((post) => {
          const currentIndex = current[post.id] || 0;
          next[post.id] = (currentIndex + 1) % post.images.length;
        });
        return next;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [posts]);

  /* ------------------------------------------------------------
   * SISTERHOOD PARALLAX
   * ------------------------------------------------------------ */
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return undefined;

    let frameId = null;
    const updateParallax = () => {
      frameId = null;
      const sisterhoodSection = document.querySelector('.home-panel-sisterhood');
      if (!sisterhoodSection) return;

      const rect = sisterhoodSection.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      if (rect.bottom >= 0 && rect.top <= windowHeight) {
        const progress = (windowHeight - rect.top) / (windowHeight + rect.height);
        const maxOffset = 90;
        setParallaxOffset((progress - 0.5) * maxOffset * 2);
      }
    };

    const handleScroll = () => {
      if (frameId === null) frameId = window.requestAnimationFrame(updateParallax);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="home-landing">
      {/* HERO */}
      <section className="home-panel home-panel-hero">
        <div className="home-hero-backdrop" aria-hidden="true">
          <span className="home-orb home-orb-one" />
          <span className="home-orb home-orb-two" />
          <span className="home-orb home-orb-three" />
        </div>

        <div className="home-hero-grid">
          <div className="home-hero-copy">
            <motion.div className="home-hero-kicker" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }}>
              <Sparkles size={15} />
              Phi Sigma Rho - Tau Chapter at the University of Florida
            </motion.div>

            <h1 className="home-hero-title" aria-label="Empowering women in engineering.">
              <MaskedReveal delay={0.1}>Re-Engineering</MaskedReveal>
              <MaskedReveal delay={0.22}>Sorority life.</MaskedReveal>
            </h1>

            <motion.p className="home-hero-description" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85, delay: 0.34, ease: [0.22, 1, 0.36, 1] }}>
              Phi Sigma Rho was founded in 1984 with the vision to be the foremost social sorority for women in engineering and engineering technology. Through a powerful bond of friendship that lasts beyond college, unwavering scholarship and academic support in a rigorous field, and constant encouragement through every challenge and victory, our sisters empower each other to thrive from day one.
            </motion.p>

            <motion.div className="home-hero-actions" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.46, ease: 'easeOut' }}>
              <Link className="home-primary-cta" to="/recruitment">
                Join our sisterhood
                <ArrowRight size={18} />
              </Link>
              <Link className="home-secondary-link" to="/leadership">
                Meet our leaders
              </Link>
            </motion.div>

            <div className="home-badge-row" aria-label="Chapter highlights">
              {highlightBadges.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div key={item.title} className="home-stat-badge" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.78, delay: 0.55 + index * 0.08, ease: 'easeOut' }} whileInView={{ y: [0, -8, 0] }} viewport={{ once: true }}>
                    <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4.4, delay: index * 0.35, repeat: Infinity, ease: 'easeInOut' }}>
                      <span className="home-stat-icon"><Icon size={15} /></span>
                      <span>{item.value} {item.title}</span>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* EDITORIAL */}
          <motion.div className="home-hero-editorial" initial={{ opacity: 0, y: 28, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.95, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}>
            <div className="home-editorial-card">
              <div className="home-editorial-meta">
                <span>Sisterhood spirit, STEM focus</span>
                <span>Since 1984</span>
              </div>
              <div className="home-editorial-frame">
                {editorialPhotos.length > 0 && (
                  <img
                    src={editorialPhotos[editorialPhotoIndex]}
                    alt="Phi Sigma Rho Tau sisterhood moment"
                    className={`home-editorial-image ${isEditorialPhotoVisible ? 'is-visible' : ''}`}
                  />
                )}
                <div className="home-editorial-overlay">
                  <p>Friendship</p>
                  <p>Scholarship</p>
                  <p>Encouragement</p>
                </div>
              </div>
            </div>
            <div className="home-editorial-aside">
              <div>
                <span className="home-small-label">Why Phi Rho feels different</span>
                <h2>Warm, ambitious, and deeply connected.</h2>
              </div>
              <p>Sisters find academic encouragement, lasting friendships, and room to lead with confidence from day one.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SISTERHOOD */}
      <section className="home-panel home-panel-sisterhood">
        <div className="home-sisterhood-media">
          <motion.img
            src={chapterPhoto}
            alt="The full Phi Sigma Rho Tau Chapter"
            style={{ transform: `translate3d(0, ${-parallaxOffset}px, 0) scale(1.20)`, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 75%' }}
          />
          <div className="home-sisterhood-wash" />
          <motion.div className="home-sisterhood-copy" initial={{ opacity: 0, y: 34 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}>
            <span>Phi Sigma Rho · Tau Chapter</span>
            <h2>Together we build the future</h2>
          </motion.div>
        </div>
      </section>

      {/* SOCIAL */}
      <section className="home-panel home-panel-social">
        <div className="home-social-header">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.75, ease: 'easeOut' }}>
            <span className="home-small-label">Social and events</span>
            <h2>Instagram energy with chapter moments and upcoming events.</h2>
          </motion.div>
          <motion.p className="home-social-intro" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.82, delay: 0.08, ease: 'easeOut' }}>
            A glimpse into life in PSR — sisterhood, memories, and the moments that make our chapter feel like home.
          </motion.p>
        </div>

        {/* Removed JS dragging constraints, using native CSS horizontal scroll for smoothness on touch devices */}
        <div ref={carouselRef} className="home-social-rail">

          {/* INSTAGRAM CAROUSEL */}
          {isLoadingPosts ? (
            <>
              {[1, 2, 3].map((item) => (
                <article key={`ig-load-${item}`} className="home-social-card home-social-card-instagram home-social-card-loading">
                  <div className="home-social-media home-social-media-loading"><div className="home-social-loading-shimmer" /></div>
                  <div className="home-social-body">
                    <div className="home-social-loading-line short" />
                    <div className="home-social-loading-line" />
                    <div className="home-social-loading-line medium" />
                  </div>
                </article>
              ))}
            </>
          ) : posts.length > 0 ? (
            posts.map((post, index) => {
              const currentSlide = activeSlides[post.id] || 0;
              const hasMultipleImages = post.images.length > 1;

              return (
                <motion.article
                  key={post.id}
                  className="home-social-card home-social-card-instagram"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.7, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -5 }}
                >
                  <div className="home-social-media">
                    <AnimatePresence mode="popLayout">
                      <motion.img
                        key={currentSlide}
                        src={post.images[currentSlide]}
                        alt={post.title}
                        loading="lazy"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        className="instagram-fade-image"
                      />
                    </AnimatePresence>

                    <div className="home-social-media-overlay" />

                    {hasMultipleImages && (
                      <>
                        <div className="home-instagram-number">
                          {currentSlide + 1} / {post.images.length}
                        </div>
                        <div className="home-instagram-dots">
                          {post.images.map((_, dotIndex) => (
                            <span key={dotIndex} className={dotIndex === currentSlide ? 'active' : ''} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="home-social-body">
                    <div className="home-social-kicker">
                      <Aperture size={15} />
                      <span>{post.handle}</span>
                    </div>
                    <h3>{post.title}</h3>
                    
                    {/* The link is now cleanly separated from the card wrapper for touch/click safety */}
                    <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="home-instagram-view">
                      View on Instagram
                      <ArrowRight size={14} />
                    </a>
                  </div>
                </motion.article>
              );
            })
          ) : (
            <article className="home-social-card home-social-card-instagram">
              <div className="home-social-media home-social-media-empty"><Aperture size={36} /></div>
              <div className="home-social-body">
                <div className="home-social-kicker"><Aperture size={15} /><span>@phisigmarhouf</span></div>
                <h3>Instagram feed unavailable</h3>
                <p>{postsError || 'Instagram posts could not be loaded right now.'}</p>
                <a href="https://www.instagram.com/phisigmarhouf/" target="_blank" rel="noopener noreferrer" className="home-social-instagram-link">View Instagram</a>
              </div>
            </article>
          )}

          {/* EVENTS CAROUSEL */}
          {isLoadingEvents ? (
            <>
              {[1, 2].map((item) => (
                <article key={`evt-load-${item}`} className="home-social-card home-social-card-event home-social-card-loading">
                  <div className="home-event-date"><span>---</span><strong>--</strong></div>
                  <div className="home-social-body">
                    <div className="home-social-loading-line short" />
                    <div className="home-social-loading-line" />
                    <div className="home-social-loading-line medium" />
                  </div>
                </article>
              ))}
            </>
          ) : pnmEvents.length > 0 ? (
            pnmEvents.map((event, index) => {
              const startDate = new Date(event.startAt);
              const month = startDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
              const day = startDate.getDate();
              const time = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
              
              // Map potential image fields from your backend
              const eventImageUrl = event.image || event.imageUrl || event.coverImage;

              return (
                <motion.article
                  key={event._id}
                  className="home-social-card home-social-card-event"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.65, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Updated: Sleek Event Image with Pink Fallback */}
                  <div className="home-event-hero-image">
                    {eventImageUrl ? (
                      <img src={eventImageUrl} alt={event.title} loading="lazy" />
                    ) : (
                      <div className="home-event-fallback-image" />
                    )}
                  </div>

                  <div className="home-event-date">
                    <span>{month}</span>
                    <strong>{day}</strong>
                  </div>

                  <div className="home-social-body">
                    <div className="home-social-kicker home-social-kicker-event">
                      <CalendarDays size={16} />
                      <span>Upcoming rush event</span>
                    </div>

                    <h3>{event.title}</h3>
                    {event.description && <p>{event.description}</p>}

                    <div className="home-event-meta-list">
                      <span><Clock3 size={15} />{time}</span>
                      {event.location && <span><MapPin size={15} />{event.location}</span>}
                    </div>
                  </div>
                </motion.article>
              );
            })
          ) : (
            <article className="home-social-card home-social-card-event home-social-card-empty">
              {/* Uses your new pink gradient to make the empty state look intentional */}
              <div className="home-event-hero-image">
                <div className="home-event-fallback-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={42} color="white" style={{ opacity: 0.4 }} />
                </div>
              </div>

              <div className="home-event-date home-event-date-empty">
                <CalendarDays size={20} />
              </div>

              <div className="home-social-body">
                <div className="home-social-kicker home-social-kicker-event">
                  <Sparkles size={16} />
                  <span>Recruitment & sisterhood</span>
                </div>
                <h3>Planning something special</h3>
                <p>Our calendar is currently clear, but check back soon for open socials and upcoming rush events!</p>
              </div>
            </article>
          )}

        </div>
      </section>
    </div>
  );
}