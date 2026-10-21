import React, { useCallback, useEffect, useState } from 'react';

export function canScheduleTexts(user) {
  const roles = Array.isArray(user?.role) ? user.role : [user?.role];
  return !!user?.isApproved && (roles.includes('webmaster') ||
    (user.positions || []).some(position => ['WEBMASTER', 'VP_COMMUNICATIONS'].includes(position?.key)));
}

export function TextScheduleFields({ later, onModeChange, value, onChange }) {
  return <div style={{ display: 'grid', gap: 6 }}>
    <label>Text delivery
      <select value={later ? 'later' : 'now'} onChange={event => {
        const next = event.target.value === 'later'; onModeChange(next); if (!next) onChange('');
      }}>
        <option value="now">Send now</option><option value="later">Schedule for later</option>
      </select>
    </label>
    {later && <>
      <label>Send text at <input type="datetime-local" required value={value} onChange={event => onChange(event.target.value)} /></label>
      <small>Times use {Intl.DateTimeFormat().resolvedOptions().timeZone}. The feed post appears now; only the text is scheduled. Choose a time at least one minute ahead.</small>
    </>}
  </div>;
}

export default function ScheduledTexts({ refreshKey = 0 }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('psr_token') || ''}` });
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/feeds/scheduled-sms', { headers: headers() });
      if (!response.ok) throw new Error('Unable to load scheduled texts. You may need to log in again.');
      setItems(await response.json()); setError('');
    } catch (err) { setError(err.message); }
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
  return <details style={{ marginTop: 10, fontSize: 12 }}>
    <summary>Scheduled text blasts</summary>
    <button type="button" onClick={load}>Refresh</button>
    {error && <p role="alert">{error}</p>}
    {!items.length && !error && <p>No scheduled texts yet.</p>}
    {items.map(item => <div key={item._id} style={{ padding: '8px 0', borderBottom: '1px solid #ddd' }}>
      <strong>{new Date(item.smsSchedule.sendAt).toLocaleString()}</strong> · {item.smsSchedule.status}
      <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.smsSchedule.message}</p>
      <small>{item.feed} · {item.authorName}</small>
      {item.smsSchedule.status === 'pending' && <button type="button" disabled={busy} onClick={() => cancel(item._id)}>Cancel scheduled text</button>}
    </div>)}
  </details>;
}
