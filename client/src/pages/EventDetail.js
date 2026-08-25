import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Clock3, Download, MapPin, Paperclip, Repeat, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './EventDetail.css';

function formatDateDetail(dateValue) {
  return new Date(dateValue).toLocaleString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDurationHours(startAt, endAt) {
  const durationMs = Math.max(0, new Date(endAt).getTime() - new Date(startAt).getTime());
  const hours = durationMs / (1000 * 60 * 60);
  const roundedHours = Math.round(hours * 10) / 10;
  return roundedHours === 1 ? '1 hour' : `${roundedHours} hours`;
}

function formatFileSize(size) {
  const numeric = Number(size || 0);
  if (!numeric) return 'File';
  if (numeric >= 1024 * 1024) return `${(numeric / (1024 * 1024)).toFixed(1)} MB`;
  if (numeric >= 1024) return `${Math.round(numeric / 1024)} KB`;
  return `${numeric} B`;
}

export default function EventDetail() {
  const { user } = useAuth();
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadEvent = async () => {
      setLoading(true);
      setError('');
      try {
        const userId = user?._id || user?.id;
        const response = await fetch(`/api/events/${eventId}`, {
          credentials: 'include',
          headers: userId ? { Authorization: `Bearer ${userId}` } : undefined,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to load event details');
        if (!cancelled) setEvent(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadEvent();
    return () => {
      cancelled = true;
    };
  }, [eventId, user]);

  if (loading) {
    return <div className="event-detail-shell"><div className="event-detail-empty">Loading event details...</div></div>;
  }

  if (error || !event) {
    return (
      <div className="event-detail-shell">
        <div className="event-detail-empty">{error || 'Event not found.'}</div>
        <Link to="/events" className="event-detail-link-button">Back to Events</Link>
      </div>
    );
  }

  return (
    <div className="event-detail-shell">
      <div className="event-detail-actions">
        <Link to="/events" className="event-detail-link-button">Back to Events</Link>
      </div>

      <article className="event-detail-card">
        <div className="event-detail-hero">
          {event.imageUrl ? (
            <img src={event.imageUrl} alt={event.title} className="event-detail-image" />
          ) : (
            <div className="event-detail-image event-detail-image-fallback" aria-hidden="true" />
          )}
          <div className="event-detail-overlay" />
          <div className="event-detail-copy">
            <div className="event-detail-kicker">Chapter event</div>
            <h1>{event.title}</h1>
            {event.description ? <p>{event.description}</p> : null}
          </div>
        </div>

        <div className="event-detail-grid">
          <section className="event-detail-panel">
            <h2>Overview</h2>
            <div className="event-detail-meta">
              <span><CalendarDays size={16} /> {formatDateDetail(event.startAt)}</span>
              <span><Clock3 size={16} /> {formatDurationHours(event.startAt, event.endAt)}</span>
              <span><MapPin size={16} /> {event.location || 'Location announced soon'}</span>
              <span><Users size={16} /> {(event.totalGoing ?? 0)} going, {(event.totalMaybe ?? 0)} maybe</span>
            </div>

            {event.recurrence?.frequency && event.recurrence.frequency !== 'none' ? (
              <div className="event-detail-badge-row">
                <span className="event-detail-badge"><Repeat size={14} /> Repeats {event.recurrence.frequency}</span>
                {event.recurrence?.endDate ? <span className="event-detail-badge">Until {formatDateDetail(event.recurrence.endDate)}</span> : null}
              </div>
            ) : null}

            {event.visibility?.rolesAllowed?.length ? (
              <div className="event-detail-badge-row">
                {event.visibility.rolesAllowed.map((role) => (
                  <span key={role} className="event-detail-badge">{role}</span>
                ))}
              </div>
            ) : null}
          </section>

          <section className="event-detail-panel">
            <h2>Attachments</h2>
            {event.attachments?.length ? (
              <div className="event-detail-list">
                {event.attachments.map((attachment) => (
                  <a key={`${attachment.url}-${attachment.name}`} href={attachment.url} target="_blank" rel="noreferrer" className="event-detail-list-item">
                    <div>
                      <strong><Paperclip size={14} /> {attachment.name}</strong>
                      <span>{formatFileSize(attachment.size)}</span>
                    </div>
                    <Download size={16} />
                  </a>
                ))}
              </div>
            ) : (
              <div className="event-detail-empty-note">No attachments were added for this event.</div>
            )}
          </section>

          <section className="event-detail-panel event-detail-panel-wide">
            <h2>Shift Registration</h2>
            {event.shiftBasedRegistration && event.shifts?.length ? (
              <div className="event-detail-list">
                {event.shifts.map((shift) => (
                  <div key={shift.shiftId} className="event-detail-list-item event-detail-list-item-static">
                    <div>
                      <strong>{shift.label}</strong>
                      <span>{formatDateDetail(shift.startAt)} - {new Date(shift.endAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
                    </div>
                    <span>{event.rsvps?.filter((entry) => entry.status === 'going' && String(entry.shiftId || '') === String(shift.shiftId)).length || 0} going{shift.capacityMax ? ` / ${shift.capacityMax}` : ''}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="event-detail-empty-note">This event uses standard RSVP instead of shift-specific registration.</div>
            )}
          </section>
        </div>
      </article>
    </div>
  );
}