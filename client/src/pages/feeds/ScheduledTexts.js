import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Clock3, Send, ChevronDown, RefreshCw, Inbox } from 'lucide-react';
import './ScheduledTexts.css';

export function canScheduleTexts(user) {
  const roles = Array.isArray(user?.role) ? user.role : [user?.role];
  return !!user?.isApproved && (roles.includes('webmaster') ||
    (user.positions || []).some(position => ['WEBMASTER', 'VP_COMMUNICATIONS'].includes(position?.key)));
}

export function TextScheduleFields({ later, onModeChange, value, onChange }) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ');
  return <div className="sms-delivery">
    <span className="sms-field-label">Delivery</span>
    <div className="sms-delivery-options" role="radiogroup" aria-label="Text delivery">
      {[{ active: !later, label: 'Send now', detail: 'Along with your post', icon: Send, mode: false },
        { active: later, label: 'Schedule for later', detail: 'Pick a date & time', icon: CalendarDays, mode: true }].map(option =>
        <button key={option.label} type="button" role="radio" aria-checked={option.active}
          className={`sms-delivery-option${option.active ? ' is-selected' : ''}`}
          onClick={() => { onModeChange(option.mode); if (!option.mode) onChange(''); }}>
          <option.icon size={17} aria-hidden="true" />
          <span><strong>{option.label}</strong><small>{option.detail}</small></span>
          <span className="sms-radio-dot" aria-hidden="true" />
        </button>)}
    </div>
    {later && <div className="sms-date-panel">
      <label className="sms-field-label" htmlFor="sms-send-at">Send text at</label>
      <input id="sms-send-at" className="sms-date-input" type="datetime-local" required value={value} onChange={event => onChange(event.target.value)} />
      <span className="sms-timezone"><Clock3 size={13} aria-hidden="true" /> {timezone}</span>
      <p className="sms-delivery-note">The feed post appears now; only the text is scheduled. Choose a time at least one minute ahead.</p>
    </div>}
  </div>;
}

export default function ScheduledTexts({ refreshKey = 0 }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('psr_token') || ''}` });
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/feeds/scheduled-sms', { headers: headers() });
      if (!response.ok) throw new Error('Unable to load scheduled texts. You may need to log in again.');
      setItems(await response.json()); setError('');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);
  const cancel = async id => {
    setBusy(true);
    try {
      const response = await fetch(`/api/feeds/scheduled-sms/${id}/cancel`, { method: 'POST', headers: headers() });
      if (!response.ok) throw new Error('Unable to cancel. The text may already be sending.');
      await load();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const pending = items.filter(item => item.smsSchedule.status === 'pending').length;
  const statusLabels = { pending: 'Scheduled', sending: 'Sending', sent: 'Sent', partial: 'Partially sent', failed: 'Failed', cancelled: 'Cancelled' };
  return <details className="sms-queue">
    <summary>
      <span className="sms-queue-title"><Clock3 size={16} aria-hidden="true" /> Scheduled text blasts
        {pending > 0 && <span className="sms-queue-count">{pending}</span>}
      </span>
      <ChevronDown className="sms-queue-chevron" size={16} aria-hidden="true" />
    </summary>
    <div className="sms-queue-body">
      <div className="sms-queue-toolbar"><span>Delivery activity</span>
        <button className="sms-refresh" type="button" onClick={load} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'sms-spin' : ''} aria-hidden="true" /> Refresh
        </button>
      </div>
      {error && <p className="sms-error" role="alert">{error}</p>}
      {loading && !items.length && <p className="sms-empty" role="status">Loading scheduled texts…</p>}
      {!loading && !items.length && !error && <div className="sms-empty">
        <Inbox size={26} strokeWidth={1.4} aria-hidden="true" /><strong>Your queue is clear</strong>
        <span>Scheduled texts will appear here. You can review or cancel them before they send.</span>
      </div>}
      <div className="sms-queue-list">
        {items.map(item => <article className="sms-queue-card" key={item._id}>
          <div className="sms-queue-card-top">
            <time dateTime={item.smsSchedule.sendAt}>{new Date(item.smsSchedule.sendAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</time>
            <span className={`sms-status sms-status--${item.smsSchedule.status}`}>{statusLabels[item.smsSchedule.status] || item.smsSchedule.status}</span>
          </div>
          <p className="sms-queue-message">{item.smsSchedule.message}</p>
          <div className="sms-queue-card-footer">
            <span>{item.feed.replace(/([a-z])([A-Z])/g, '$1 $2')} <span aria-hidden="true">·</span> {item.authorName}</span>
            {item.smsSchedule.status === 'pending' && <button className="sms-cancel" type="button" disabled={busy} onClick={() => cancel(item._id)}>Cancel scheduled text</button>}
          </div>
        </article>)}
      </div>
    </div>
  </details>;
}
