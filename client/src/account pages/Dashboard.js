import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Calendar,
  Clock3,
  Heart,
  MessageSquare,
  PlusCircle,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const POINT_MAX = 50;

const progressColorByKey = {
  phi: '#D4608A',
  sigma: '#6D2C2C',
  rho: '#6B5558',
  tau: '#A04E74',
  any: '#CE90A8',
};

function isAlumniUser(user) {
  const roles = Array.isArray(user?.role) ? user.role : (user?.role ? [user.role] : []);
  return roles.some((role) => String(role).toLowerCase() === 'alumni');
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="8" y1="3.5" x2="8" y2="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="16" y1="3.5" x2="16" y2="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="4" y1="10" x2="20" y2="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4L13.9 9.2L19.5 9.3L15.1 12.8L16.8 18.1L12 14.9L7.2 18.1L8.9 12.8L4.5 9.3L10.1 9.2Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function EventCard({ ev, index }) {
  const start = new Date(ev.startAt);
  const dateStr = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const dayNum = start.getDate();
  const rsvpStatus = ev.currentUserRsvp;
  const isSignedUp = rsvpStatus === 'going' || rsvpStatus === 'maybe';
  const rsvpLabel = rsvpStatus === 'going' ? "RSVP'D" : (rsvpStatus === 'maybe' ? 'RSVP Maybe' : '');

  return (
    <motion.article
      className="dashboard-event-card"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 + 0.4 }}
      whileHover={{ x: 5, backgroundColor: 'rgba(109, 44, 44, 0.05)' }}
    >
      <motion.div
        className="dashboard-event-date-pill"
        aria-hidden="true"
        whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
        transition={{ duration: 0.3 }}
      >
        <span>{dayNum}</span>
      </motion.div>
      <div className="dashboard-event-content">
        <div className="dashboard-event-title-row">
          <div className="dashboard-event-title">{ev.title}</div>
          {isSignedUp && (
            <motion.span
              className={`dashboard-event-rsvp dashboard-event-rsvp-${rsvpStatus}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {rsvpLabel}
            </motion.span>
          )}
        </div>
        <div className="dashboard-event-time">{dateStr} • {timeStr}</div>
        <div className="dashboard-event-tag">{ev.points?.category || ev.pointsCategory || 'General'}</div>
      </div>
    </motion.article>
  );
}

function LoadingState({ text }) {
  return (
    <div className="dashboard-loading-state" role="status" aria-live="polite">
      <span className="dashboard-loading-dot" />
      <span>{text}</span>
    </div>
  );
}

function formatRelativeTime(dateInput) {
  if (!dateInput) return 'Recently';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return 'Recently';

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) {
    const futureMin = Math.ceil(Math.abs(diffMs) / 60000);
    const futureHr = Math.ceil(Math.abs(diffMs) / 3600000);
    const futureDay = Math.ceil(Math.abs(diffMs) / 86400000);
    if (futureMin < 60) return `in ${futureMin} min`;
    if (futureHr < 24) return `in ${futureHr} hour${futureHr === 1 ? '' : 's'}`;
    if (futureDay < 7) return `in ${futureDay} day${futureDay === 1 ? '' : 's'}`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Dashboard() {
  const { user } = useAuth();
  const userId = user?._id || user?.id;
  const isAlumni = isAlumniUser(user);
  const userScopeKey = useMemo(() => JSON.stringify({
    role: user?.role || [],
    memberStatus: user?.memberStatus || [],
    scholarship: user?.scholarship ?? 0,
    positions: user?.positions || [],
  }), [user?.role, user?.memberStatus, user?.scholarship, user?.positions]);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [points, setPoints] = useState({ phi: 0, sigma: 0, rho: 0, tau: 0, any: 0 });
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [activeRingKey, setActiveRingKey] = useState(null);
  const [ringHoverPos, setRingHoverPos] = useState({ x: 130, y: 24 });
  const [requirements, setRequirements] = useState({
    rule: 'per-category',
    minPerCategory: POINT_MAX,
    buckets: {
      phi: { have: 0, need: POINT_MAX, met: false },
      sigma: { have: 0, need: POINT_MAX, met: false },
      rho: { have: 0, need: POINT_MAX, met: false },
      tau: { have: 0, need: POINT_MAX, met: false },
    },
    any: { have: 0, need: POINT_MAX, met: false },
    metAll: false,
    totalRequired: POINT_MAX * 5,
    totalEarned: 0,
  });
  const [error, setError] = useState('');

  const headers = useMemo(() => (
    userId ? { Authorization: `Bearer ${userId}` } : undefined
  ), [userId]);

  useEffect(() => {
    const loadEvents = async () => {
      setLoadingEvents(true);
      try {
        const res = await fetch('/api/events?view=week', { headers, credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load events');
        setEvents(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message);
        setEvents([]);
      } finally {
        setLoadingEvents(false);
      }
    };
    const loadPoints = async () => {
      if (isAlumni) {
        setPoints({ phi: 0, sigma: 0, rho: 0, tau: 0, any: 0 });
        setRequirements({
          rule: 'none',
          minPerCategory: 0,
          buckets: {
            phi: { have: 0, need: 0, met: true },
            sigma: { have: 0, need: 0, met: true },
            rho: { have: 0, need: 0, met: true },
            tau: { have: 0, need: 0, met: true },
          },
          any: { have: 0, need: 0, met: true },
          metAll: true,
          totalRequired: 0,
          totalEarned: 0,
        });
        setLoadingPoints(false);
        return;
      }

      setLoadingPoints(true);
      try {
        const res = await fetch('/api/requirements/active/self', { headers, credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load points');

        const totals = data.totals || {};
        const minPerCategory = data.requirements?.minPerCategory || POINT_MAX;
        const buckets = data.requirements?.buckets || {
          phi: { have: totals.phi || 0, need: Math.max(0, minPerCategory - (totals.phi || 0)), met: (totals.phi || 0) >= minPerCategory },
          sigma: { have: totals.sigma || 0, need: Math.max(0, minPerCategory - (totals.sigma || 0)), met: (totals.sigma || 0) >= minPerCategory },
          rho: { have: totals.rho || 0, need: Math.max(0, minPerCategory - (totals.rho || 0)), met: (totals.rho || 0) >= minPerCategory },
          tau: { have: totals.tau || 0, need: Math.max(0, minPerCategory - (totals.tau || 0)), met: (totals.tau || 0) >= minPerCategory },
        };
        const anyBucket = data.any || { have: 0, need: minPerCategory, met: false };

        const catTotals = {
          phi: buckets.phi?.have ?? totals.phi ?? 0,
          sigma: buckets.sigma?.have ?? totals.sigma ?? 0,
          rho: buckets.rho?.have ?? totals.rho ?? 0,
          tau: buckets.tau?.have ?? totals.tau ?? 0,
        };

        setPoints({ ...catTotals, any: anyBucket.have || 0 });
        setRequirements({
          rule: data.requirements?.rule || 'per-category',
          minPerCategory,
          buckets,
          any: anyBucket,
          metAll: Boolean(data.requirements?.metAll),
          totalRequired: Number(data.requirements?.totalRequired ?? (minPerCategory * 5)),
          totalEarned: Number(totals.total || 0),
        });
      } catch (e) {
        setError(e.message);
        setPoints({ phi: 0, sigma: 0, rho: 0, tau: 0, any: 0 });
      } finally {
        setLoadingPoints(false);
      }
    };

    const loadRecentActivity = async () => {
      setLoadingActivity(true);
      try {
        const [mineRes, monthRes, penguinRes, officerRes, chapterRes] = await Promise.all([
          fetch('/api/events/mine', { headers, credentials: 'include' }),
          fetch('/api/events?view=month', { headers, credentials: 'include' }),
          fetch('/api/feeds/penguinParties/posts', {
            credentials: 'include',
            headers: userId ? { 'x-user-id': userId } : undefined,
          }),
          fetch('/api/feeds/officerFeed/posts', {
            credentials: 'include',
            headers: userId ? { 'x-user-id': userId } : undefined,
          }),
          fetch('/api/feeds/chapterAnnouncements/posts', {
            credentials: 'include',
            headers: userId ? { 'x-user-id': userId } : undefined,
          }),
        ]);

        const [mineData, monthData, penguinData, officerData, chapterData] = await Promise.all([
          mineRes.json(),
          monthRes.json(),
          penguinRes.json(),
          officerRes.json(),
          chapterRes.json(),
        ]);

        const activities = [];

        if (mineRes.ok && Array.isArray(mineData)) {
          mineData.forEach((ev) => {
            if (ev.currentUserRsvp === 'going' || ev.currentUserRsvp === 'maybe') {
              activities.push({
                key: `rsvp-${ev._id}`,
                action: ev.currentUserRsvp === 'going' ? `RSVP'D to ${ev.title}` : `RSVP maybe for ${ev.title}`,
                time: ev.rsvpAt || ev.updatedAt || ev.createdAt || ev.startAt,
                icon: Calendar,
              });
            }

            if (ev.attendance?.status === 'present') {
              activities.push({
                key: `attend-${ev._id}`,
                action: `Attended ${ev.title}`,
                time: ev.attendance?.updatedAt || ev.endAt || ev.startAt,
                icon: Heart,
              });
            }
          });
        }

        if (monthRes.ok && Array.isArray(monthData)) {
          monthData
            .filter((ev) => String(ev.createdBy || '') === String(userId || ''))
            .forEach((ev) => {
              activities.push({
                key: `created-${ev._id}`,
                action: `Created event: ${ev.title}`,
                time: ev.createdAt || ev.startAt,
                icon: PlusCircle,
              });
            });
        }

        if (penguinRes.ok && Array.isArray(penguinData)) {
          penguinData
            .filter((post) => String(post.authorId || '') === String(userId || ''))
            .forEach((post) => {
              activities.push({
                key: `penguin-${post._id}`,
                action: 'Contributed to Penguin Parties',
                time: post.createdAt,
                icon: MessageSquare,
              });
            });
        }

        if (officerRes.ok && Array.isArray(officerData)) {
          officerData
            .filter((post) => String(post.authorId || '') === String(userId || ''))
            .forEach((post) => {
              activities.push({
                key: `officer-${post._id}`,
                action: 'Posted in Officer Feed',
                time: post.createdAt,
                icon: MessageSquare,
              });
            });
        }

        if (chapterRes.ok && Array.isArray(chapterData)) {
          chapterData
            .filter((post) => String(post.authorId || '') === String(userId || ''))
            .forEach((post) => {
              activities.push({
                key: `chapter-${post._id}`,
                action: 'Posted in Chapter Announcements',
                time: post.createdAt,
                icon: MessageSquare,
              });
            });
        }

        activities.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
        setRecentActivity(activities.slice(0, 8));
      } catch (e) {
        setRecentActivity([]);
      } finally {
        setLoadingActivity(false);
      }
    };

    if (userId) {
      loadEvents();
      loadPoints();
      loadRecentActivity();
    }
  }, [headers, isAlumni, userId, userScopeKey]);

  const circles = [
    { label: 'Phi', key: 'phi' },
    { label: 'Sigma', key: 'sigma' },
    { label: 'Rho', key: 'rho' },
    { label: 'Tau', key: 'tau' },
    { label: 'Extra', key: 'any' },
  ];

  const requirementRule = requirements.rule || 'per-category';
  const totalPoints = requirements.totalEarned || circles.reduce((sum, c) => sum + (points[c.key] || 0), 0);
  const totalRequired = requirements.totalRequired || null;

  const progressRows = circles.map((c) => {
    if (requirementRule === 'per-category') {
      if (c.key === 'any') {
        const have = requirements.any?.have || 0;
        const required = requirements.minPerCategory || POINT_MAX;
        const need = Math.max(0, required - have);
        const ratio = required > 0 ? Math.max(0, Math.min(100, (have / required) * 100)) : 0;

        return {
          ...c,
          value: have,
          need,
          required,
          ratio,
        };
      }

      const bucket = requirements.buckets?.[c.key] || { have: points[c.key] || 0, need: POINT_MAX, met: false };
      const required = requirements.minPerCategory || POINT_MAX;
      const rawHave = bucket.have || 0;
      const have = Math.min(rawHave, required);
      const need = Math.max(0, required - have);
      const ratio = required > 0 ? Math.max(0, Math.min(100, (have / required) * 100)) : 0;

      return {
        ...c,
        value: have,
        rawValue: rawHave,
        need,
        required,
        ratio,
      };
    }

    if (requirementRule === 'anywhere') {
      const required = totalRequired || POINT_MAX;
      const have = c.key === 'any'
        ? (requirements.any?.have || totalPoints)
        : (requirements.buckets?.[c.key]?.have ?? points[c.key] ?? 0);
      const need = c.key === 'any' ? Math.max(0, required - have) : 0;
      const ratio = required > 0 ? Math.max(0, Math.min(100, (have / required) * 100)) : 0;

      return {
        ...c,
        value: have,
        rawValue: have,
        need,
        required,
        ratio,
      };
    }

    const have = c.key === 'any'
      ? (requirements.any?.have || 0)
      : (requirements.buckets?.[c.key]?.have ?? points[c.key] ?? 0);

    return {
      ...c,
      value: have,
      rawValue: have,
      need: 0,
      required: 0,
      ratio: 0,
    };
  });

  const coreProgressRows = progressRows.filter((row) => row.key !== 'any');
  const anyProgressRow = progressRows.find((row) => row.key === 'any');

  const diagramRings = useMemo(() => {
    const displayOrder = ['phi', 'sigma', 'rho', 'tau', 'any'];
    return displayOrder
      .map((key) => progressRows.find((row) => row.key === key))
      .filter(Boolean)
      .map((row) => ({
        ...row,
        color: progressColorByKey[row.key] || '#7a3239',
      }));
  }, [progressRows]);

  const ringGeometry = useMemo(() => {
    return diagramRings.map((row, index) => {
      const radius = 110 - (index * 17);
      const strokeWidth = 12;
      const circumference = 2 * Math.PI * radius;
      const progress = Math.max(0, Math.min(1, row.ratio / 100));
      const dash = circumference * progress;
      return {
        ...row,
        radius,
        strokeWidth,
        circumference,
        dash,
      };
    });
  }, [diagramRings]);

  const firstName = user?.firstName || 'Member';
  const effectiveTotal = requirementRule === 'per-category'
    ? progressRows.reduce((sum, row) => sum + Math.min(row.value, row.required || 0), 0)
    : requirementRule === 'anywhere'
      ? Math.min(totalPoints, totalRequired || 0)
      : 0;

  const totalRatio = totalRequired ? Math.max(0, Math.min(100, (effectiveTotal / totalRequired) * 100)) : 100;
  const remainingPoints = totalRequired ? Math.max(0, Math.round(totalRequired - effectiveTotal)) : null;

  const progressCard = useMemo(() => {
    if (requirementRule === 'none') {
      return {
        title: 'No point requirement this semester',
        body: 'Your current status does not require semester points right now.',
        icon: Sparkles,
        tone: 'excellent',
      };
    }

    if (requirements.metAll) {
      return {
        title: 'Semester goals completed!',
        body: requirementRule === 'anywhere' ? 'Amazing work. You met the total points requirement.' : 'Amazing work. You met every requirement.',
        icon: Sparkles,
        tone: 'excellent',
      };
    }

    if (totalRatio >= 75) {
      return {
        title: 'You are making great progress this semester!',
        body: remainingPoints !== null
          ? `${remainingPoints} points left to reach ${requirementRule === 'anywhere' ? 'the total requirement' : 'full requirements'}.`
          : 'You are close to completing your requirements.',
        icon: TrendingUp,
        tone: 'great',
      };
    }

    if (totalRatio >= 40) {
      return {
        title: 'Nice momentum this semester!',
        body: remainingPoints !== null
          ? `Keep going. You need ${remainingPoints} more points${requirementRule === 'anywhere' ? ' in any category' : ''}.`
          : 'Keep going, you are building strong momentum.',
        icon: Award,
        tone: 'steady',
      };
    }

    return {
      title: 'Let us build momentum this semester!',
      body: remainingPoints !== null
        ? `Start with one event this week. You need ${remainingPoints} more points${requirementRule === 'anywhere' ? ' in any category' : ''}.`
        : 'Start with one event this week to build your points.',
      icon: Calendar,
      tone: 'focus',
    };
  }, [requirementRule, requirements.metAll, totalRatio, remainingPoints]);

  const ProgressCardIcon = progressCard.icon;

  const updateRingHoverPos = (event) => {
    const svg = event.currentTarget?.ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = Math.max(30, Math.min(rect.width - 30, event.clientX - rect.left));
    const y = Math.max(20, Math.min(rect.height - 24, event.clientY - rect.top));
    setRingHoverPos({ x, y });
  };

  return (
    <div className="dashboard-shell">
      <header className="dashboard-hero">
        <p className="dashboard-overline">Chapter Snapshot</p>
        <h1>Welcome back, {firstName}!</h1>
        <p>{isAlumni ? 'Here are your upcoming events and recent chapter touchpoints.' : 'Here is your weekly outlook and points progress.'}</p>
      </header>

      {error && <div className="dashboard-error">{error}</div>}

      <div className="dashboard-main-grid">
        <div className="dashboard-primary-column">
          {!isAlumni && <section className="dashboard-stats-grid" aria-label="Points summary">
            <motion.article
              className="dashboard-stat-card"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1, type: 'spring', stiffness: 200 }}
              whileHover={{ y: -5, boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="dashboard-stat-top">
                <motion.span
                  className="dashboard-stat-icon"
                  aria-hidden="true"
                  whileHover={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.5 }}
                >
                  <Award size={16} strokeWidth={2} />
                </motion.span>
                {totalRequired ? <span className="dashboard-stat-pill">{Math.round(totalRatio)}%</span> : null}
              </div>

              <div className="dashboard-stat-value-row">
                <strong>{Math.round(totalPoints)}</strong>
                {totalRequired ? <span>/ {Math.round(totalRequired)}</span> : null}
              </div>

              <div className="dashboard-stat-label">Total Points</div>
              {totalRequired ? (
                <div className="dashboard-stat-track">
                  <motion.span
                    className="dashboard-stat-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${totalRatio}%` }}
                    transition={{ duration: 1, delay: 0.45 }}
                  />
                </div>
              ) : null}
            </motion.article>
          </section>}

          <motion.section
            className="dashboard-section dashboard-section-events"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.01 }}
          >
            <div className="dashboard-section-heading">
              <motion.span
                className="dashboard-section-icon"
                aria-hidden="true"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <IconCalendar />
              </motion.span>
              <div>
                <h2>This Week&apos;s Events</h2>
                <p>Stay ready for upcoming chapter events.</p>
              </div>
              <motion.div className="dashboard-link-cta-wrap" whileHover={{ x: 5 }} whileTap={{ scale: 0.95 }}>
                <Link to="/events" className="dashboard-link-cta">
                  View All
                  <ArrowRight size={15} strokeWidth={2} />
                </Link>
              </motion.div>
            </div>

            {loadingEvents ? (
              <LoadingState text="Loading events..." />
            ) : events.length === 0 ? (
              <div className="dashboard-empty">No events this week.</div>
            ) : (
              <div className="dashboard-events-row">
                {events.map((ev, index) => <EventCard key={ev._id} ev={ev} index={index} />)}
              </div>
            )}
          </motion.section>

          <motion.section
            className="dashboard-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="dashboard-section-heading">
              <motion.span
                className="dashboard-section-icon"
                aria-hidden="true"
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              >
                <Clock3 size={16} strokeWidth={2} />
              </motion.span>
              <div>
                <h2>Recent Activity</h2>
                <p>See your recent RSVPs, attendance, and contributions.</p>
              </div>
            </div>

            {loadingActivity ? (
              <LoadingState text="Loading activity..." />
            ) : recentActivity.length === 0 ? (
              <div className="dashboard-empty">No recent activity yet.</div>
            ) : (
              <div className="dashboard-activity-list">
                {recentActivity.map((item, index) => {
                  const ActivityIcon = item.icon;
                  return (
                    <motion.article
                      className="dashboard-activity-item"
                      key={item.key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 + 0.5 }}
                      whileHover={{ x: 5 }}
                    >
                      <motion.span
                        className="dashboard-activity-icon"
                        aria-hidden="true"
                        whileHover={{ scale: 1.15, rotate: [0, -10, 10, 0] }}
                        transition={{ duration: 0.3 }}
                      >
                        <ActivityIcon size={14} strokeWidth={2} />
                      </motion.span>
                      <div>
                        <div className="dashboard-activity-title">{item.action}</div>
                        <div className="dashboard-activity-time">{formatRelativeTime(item.time)}</div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </motion.section>

        </div>

        <aside className="dashboard-sidebar-column">
          {!isAlumni ? <motion.section
            className="dashboard-section dashboard-points-panel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="dashboard-section-heading">
              <span className="dashboard-section-icon" aria-hidden="true">
                <IconStar />
              </span>
              <div>
                <h2>Points Progress</h2>
                <p>{requirementRule === 'per-category' ? 'Track each point requirement at a glance.' : requirementRule === 'anywhere' ? 'Track your total points toward the anywhere requirement.' : 'No semester point requirement for your current status.'}</p>
              </div>
              <Link to="/points" className="dashboard-details-button">Details</Link>
            </div>

            {loadingPoints ? (
              <LoadingState text="Loading points..." />
            ) : requirementRule !== 'per-category' ? (
              <div className="dashboard-progress-list" aria-label="Points progress summary">
                <div className="dashboard-progress-row">
                  <div className="dashboard-progress-labels">
                    <span>{requirementRule === 'anywhere' ? 'Total points' : 'Requirement'}</span>
                    <span>{requirementRule === 'anywhere' ? `${Math.round(totalPoints)} / ${Math.round(totalRequired || 0)}` : 'No minimum'}</span>
                  </div>
                  {requirementRule === 'anywhere' ? (
                    <div className="dashboard-progress-track">
                      <motion.div
                        className="dashboard-progress-fill"
                        style={{ background: progressColorByKey.any || '#6d2c2c' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${totalRatio}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                      />
                    </div>
                  ) : null}
                </div>
                <div className="dashboard-progress-row">
                  <div className="dashboard-progress-labels">
                    <span>Phi / Sigma / Rho / Tau</span>
                    <span>{[points.phi, points.sigma, points.rho, points.tau].map((value) => Math.round(value)).join(' / ')}</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="dashboard-progress-list" aria-label="Points progress by category">
                  {[...coreProgressRows, ...(anyProgressRow ? [anyProgressRow] : [])].map((row, index) => (
                    <div className="dashboard-progress-row" key={row.key}>
                      <div className="dashboard-progress-labels">
                        <span>{row.label}</span>
                        <span>{Math.round(row.value)} / {Math.round(row.required || 0)}</span>
                      </div>
                      <div className="dashboard-progress-track">
                        <motion.div
                          className="dashboard-progress-fill"
                          style={{ background: progressColorByKey[row.key] || '#6d2c2c' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${row.ratio}%` }}
                          transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="dashboard-rings-diagram" aria-label="Animated category rings">
                  {activeRingKey ? (
                    <div
                      className="dashboard-ring-hover-card"
                      role="status"
                      aria-live="polite"
                      style={{
                        left: `${ringHoverPos.x}px`,
                        top: `${ringHoverPos.y}px`,
                      }}
                    >
                      {(() => {
                        const activeRing = ringGeometry.find((ring) => ring.key === activeRingKey);
                        if (!activeRing) return null;
                        return (
                          <>
                            <span
                              className="dashboard-ring-hover-dot"
                              style={{ background: activeRing.color }}
                              aria-hidden="true"
                            />
                            <strong>{activeRing.label}</strong>
                            <span>{Math.round(activeRing.value)} / {Math.round(activeRing.required || 0)}</span>
                          </>
                        );
                      })()}
                    </div>
                  ) : null}

                  <svg className="dashboard-rings-svg" viewBox="0 0 260 260" role="img" aria-label="Category progress rings">
                    {ringGeometry.map((ring, index) => (
                      <motion.g
                        key={ring.key}
                        initial={{ opacity: 0 }}
                        animate={{
                          opacity: 1,
                          rotate: index % 2 === 0 ? [0, 1.2, 0] : [0, -1.2, 0],
                        }}
                        transition={{
                          opacity: { duration: 0.35, delay: 0.12 + index * 0.1 },
                          rotate: { duration: 6.5 + index, repeat: Infinity, ease: 'easeInOut' },
                        }}
                        style={{ transformOrigin: '130px 130px' }}
                        className={`dashboard-svg-ring-group${activeRingKey === ring.key ? ' is-active' : ''}`}
                        aria-label={`${ring.label} progress ${Math.round(ring.value)} out of ${Math.round(ring.required || 0)}`}
                      >
                        <circle
                          className="dashboard-svg-ring-track"
                          cx="130"
                          cy="130"
                          r={ring.radius}
                          strokeWidth={ring.strokeWidth}
                        />
                        <motion.circle
                          className="dashboard-svg-ring-progress"
                          cx="130"
                          cy="130"
                          r={ring.radius}
                          strokeWidth={ring.strokeWidth}
                          stroke={ring.color}
                          strokeDasharray={ring.circumference}
                          initial={{ strokeDashoffset: ring.circumference }}
                          animate={{ strokeDashoffset: ring.circumference - ring.dash }}
                          transition={{ duration: 0.9, delay: 0.2 + index * 0.12, ease: 'easeOut' }}
                          transform="rotate(-90 130 130)"
                        />
                        <circle
                          className="dashboard-svg-ring-hover-zone"
                          cx="130"
                          cy="130"
                          r={ring.radius}
                          strokeWidth={ring.strokeWidth + 8}
                          transform="rotate(-90 130 130)"
                          onMouseEnter={(event) => {
                            setActiveRingKey(ring.key);
                            updateRingHoverPos(event);
                          }}
                          onMouseMove={updateRingHoverPos}
                          onMouseLeave={() => setActiveRingKey(null)}
                          onFocus={() => {
                            setActiveRingKey(ring.key);
                            setRingHoverPos({ x: 130, y: 24 });
                          }}
                          onBlur={() => setActiveRingKey(null)}
                        />
                      </motion.g>
                    ))}
                    <motion.circle
                      className="dashboard-ring-core"
                      cx="130"
                      cy="130"
                      r="22"
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: [1, 1.04, 1] }}
                      transition={{
                        opacity: { duration: 0.35, delay: 0.45 },
                        scale: { duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 0.7 },
                      }}
                    />
                  </svg>
                </div>
              </>
            )}
          </motion.section> : <motion.section
            className="dashboard-section dashboard-points-panel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="dashboard-section-heading">
              <span className="dashboard-section-icon" aria-hidden="true">
                <IconStar />
              </span>
              <div>
                <h2>Alumni Snapshot</h2>
                <p>Alumni do not have semester point requirements.</p>
              </div>
            </div>
            <div className="dashboard-progress-list" aria-label="Alumni overview">
              <div className="dashboard-progress-row">
                <div className="dashboard-progress-labels">
                  <span>Points requirement</span>
                  <span>None</span>
                </div>
              </div>
              <div className="dashboard-progress-row">
                <div className="dashboard-progress-labels">
                  <span>Focus</span>
                  <span>Events and chapter activity</span>
                </div>
              </div>
            </div>
          </motion.section>}

          <motion.section
            className={`dashboard-encouragement-card dashboard-encouragement-${progressCard.tone}`}
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
          >
            <motion.span
              className="dashboard-encouragement-icon"
              aria-hidden="true"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
              whileHover={{ scale: 1.15, transition: { duration: 0.3 } }}
            >
              <ProgressCardIcon size={20} strokeWidth={2} />
            </motion.span>
            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
            >
              {progressCard.title}
            </motion.h3>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
            >
              {isAlumni ? 'Stay connected through upcoming events and recent activity across the chapter.' : progressCard.body}
            </motion.p>
          </motion.section>
        </aside>
      </div>
    </div>
  );
}
