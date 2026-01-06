import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const POINT_MAX = 50;
const CATEGORIES = ['phi', 'sigma', 'rho', 'tau'];

function Circle({ label, value, onClick }) {
  const pct = Math.max(0, Math.min(1, value / POINT_MAX));
  const angle = pct * 360;
  const bg = `conic-gradient(#6d2c2c ${angle}deg, #e5e7eb ${angle}deg 360deg)`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={onClick}>
      <div style={{
        width: 90,
        height: 90,
        borderRadius: '50%',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#222',
        fontWeight: 600,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: '#4b5563' }}>{Math.round(value)} / {POINT_MAX}</div>
    </div>
  );
}

function EventCard({ ev }) {
  const start = new Date(ev.startAt);
  const dateStr = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return (
    <div style={{
      minWidth: 220,
      padding: 12,
      borderRadius: 12,
      border: '1px solid #e5e7eb',
      background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      <div style={{ fontWeight: 700 }}>{ev.title}</div>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{dateStr} • {timeStr}</div>
      <div style={{ marginTop: 6, fontSize: 12, color: '#4b5563', textTransform: 'uppercase' }}>{ev.points?.category || ev.pointsCategory || ''}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?._id || user?.id;
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [points, setPoints] = useState({ phi: 0, sigma: 0, rho: 0, tau: 0, any: 0 });
  const [loadingPoints, setLoadingPoints] = useState(true);
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
      setLoadingPoints(true);
      try {
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        const res = await fetch(`/api/ledger/summary?${params.toString()}`, { headers, credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load points');
        const totals = (data.totals || [])[0]?.totalsByCategory || {};
        const grand = (data.totals || [])[0]?.grandTotal || 0;
        const catTotals = {
          phi: totals.phi || 0,
          sigma: totals.sigma || 0,
          rho: totals.rho || 0,
          tau: totals.tau || 0,
        };
        const any = Math.max(0, grand - (catTotals.phi + catTotals.sigma + catTotals.rho + catTotals.tau));
        setPoints({ ...catTotals, any });
      } catch (e) {
        setError(e.message);
        setPoints({ phi: 0, sigma: 0, rho: 0, tau: 0, any: 0 });
      } finally {
        setLoadingPoints(false);
      }
    };

    if (userId) {
      loadEvents();
      loadPoints();
    }
  }, [headers, userId]);

  const circles = [
    { label: 'Phi', key: 'phi' },
    { label: 'Sigma', key: 'sigma' },
    { label: 'Rho', key: 'rho' },
    { label: 'Tau', key: 'tau' },
    { label: 'Any', key: 'any' },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 12 }}>Dashboard</h1>
      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}

      <section style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>My Weekly Outlook</div>
        {loadingEvents ? (
          <div>Loading events...</div>
        ) : events.length === 0 ? (
          <div>No events this week.</div>
        ) : (
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {events.map(ev => <EventCard key={ev._id} ev={ev} />)}
          </div>
        )}
      </section>

      <section>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>My Points</div>
        {loadingPoints ? (
          <div>Loading points...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16 }}>
            {circles.map(c => (
              <Circle
                key={c.key}
                label={c.label}
                value={points[c.key] || 0}
                onClick={() => navigate(`/points?category=${c.key}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
