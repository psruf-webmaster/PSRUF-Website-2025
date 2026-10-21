const User = require('../models/User');
const { sendRsvpChangeEmail } = require('./email');
const labels = { going: 'Going', maybe: 'Maybe', notGoing: 'Not Going', none: 'Cancelled (RSVP removed)' };
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const date = value => new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short',
}).format(new Date(value));

function rsvpMessage(event, member, status, shiftId) {
  const base = new URL(process.env.FRONTEND_URL || 'https://phisigmarhouf.com');
  if (!['https:', 'http:'].includes(base.protocol)) throw new Error('Invalid frontend URL');
  base.search = ''; base.hash = `/events/${encodeURIComponent(String(event._id))}`;
  const shift = (event.shifts || []).find(entry => String(entry.shiftId) === String(shiftId));
  const name = [member.firstName, member.lastName].filter(Boolean).join(' ') || 'A member';
  const lines = [
    `${name}: ${labels[status]}`,
    `Event: ${event.title}`,
    `Occurrence: ${date(event.startAt)} – ${date(event.endAt)} (America/New_York)`,
    ...(shift ? [`Shift: ${shift.label} — ${date(shift.startAt)} – ${date(shift.endAt)} (America/New_York)`] : []),
    'This update applies only to this event occurrence.',
  ];
  return {
    subject: `RSVP ${status === 'none' ? 'cancelled' : 'update'}: ${String(event.title).replace(/[\r\n]/g, ' ')} — ${labels[status]}`,
    text: `${lines.join('\n')}\n\nView event: ${base.toString()}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;line-height:1.6;padding:16px">${lines.map(line => `<p>${escapeHtml(line)}</p>`).join('')}<p><a href="${escapeHtml(base.toString())}">View event occurrence</a></p></div>`,
  };
}

async function notifyRsvpChange(event, member, status, shiftId) {
  try {
    // Creator-only policy: co-host membership never adds recipients.
    if (!event.createdBy) return;
    const creator = await User.findById(event.createdBy).select('personalEmail');
    if (!creator?.personalEmail) {
      console.error('RSVP notification skipped.', { eventId: String(event._id), code: 'CREATOR_EMAIL_MISSING' });
      return;
    }
    await sendRsvpChangeEmail(creator.personalEmail, rsvpMessage(event, member, status, shiftId));
  } catch (err) {
    console.error('RSVP notification failed.', {
      eventId: String(event._id),
      code: ['EMAIL_CONFIG', 'EMAIL_API', 'EMAIL_CONNECTION', 'EAUTH', 'ETIMEDOUT', 'ECONNECTION'].includes(err?.code) ? err.code : 'DELIVERY_FAILED',
      responseCode: Number.isInteger(err?.responseCode) ? err.responseCode : undefined,
    });
  }
}
module.exports = { notifyRsvpChange, rsvpMessage };
