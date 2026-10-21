const User = require('../models/User');
const { sendRsvpChangeEmail } = require('./email');
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const format = (value, options) => new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', ...options,
}).format(new Date(value));
function dateRange(start, end) {
  const day = value => format(value, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const time = value => format(value, { hour: 'numeric', minute: '2-digit' });
  const endTime = format(end, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  const startTime = format(start, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  return day(start) === day(end) && startTime.split(' ').at(-1) === endTime.split(' ').at(-1)
    ? `${day(start)} · ${time(start)}–${endTime}`
    : `${day(start)} at ${startTime} – ${day(end)} at ${endTime}`;
}

function rsvpMessage(event, member, status, shiftId) {
  const base = new URL(process.env.FRONTEND_URL || 'https://phisigmarhouf.com');
  if (!['https:', 'http:'].includes(base.protocol)) throw new Error('Invalid frontend URL');
  base.search = ''; base.hash = `/events/${encodeURIComponent(String(event._id))}`;
  const shift = (event.shifts || []).find(entry => String(entry.shiftId) === String(shiftId));
  const memberResponse = {
    going: 'You’re going to',
    maybe: 'You might be able to make it to',
    notGoing: 'You marked yourself as not going to',
    none: 'You cancelled your RSVP for',
  }[status];
  const headline = `${memberResponse} ${event.title}.`;
  const lines = [
    'Hi there,',
    headline,
    `When: ${dateRange(event.startAt, event.endAt)}`,
    ...(shift ? [`${status === 'none' ? 'Previous shift' : 'Shift'}: ${shift.label} — ${dateRange(shift.startAt, shift.endAt)}`] : []),
    ...(event.recurrence?.frequency && event.recurrence.frequency !== 'none' ? ['This RSVP is for this date only.'] : []),
  ];
  return {
    subject: headline.replace(/[\r\n]/g, ' '),
    text: `${lines.join('\n\n')}\n\nView event: ${base.toString()}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;line-height:1.6;padding:16px">${lines.map(line => `<p>${escapeHtml(line)}</p>`).join('')}<p><a href="${escapeHtml(base.toString())}">View event</a></p></div>`,
  };
}

function logFailure(event, err) {
  console.error('RSVP notification failed.', {
    eventId: String(event._id),
    code: ['EMAIL_CONFIG', 'EMAIL_API', 'EMAIL_CONNECTION', 'EAUTH', 'ETIMEDOUT', 'ECONNECTION'].includes(err?.code) ? err.code : 'DELIVERY_FAILED',
    responseCode: Number.isInteger(err?.responseCode) ? err.responseCode : undefined,
  });
}

async function notifyRsvpChange(event, member, status, shiftId) {
  // RSVP emails are member confirmations only; creator/co-host roles add no recipients.
  try {
    const account = await User.findById(member._id).select('personalEmail');
    const email = account?.personalEmail?.trim();
    if (!email) {
      console.error('RSVP notification skipped.', { eventId: String(event._id), code: 'RECIPIENT_EMAIL_MISSING' });
      return;
    }
    await sendRsvpChangeEmail(email, rsvpMessage(event, member, status, shiftId));
  } catch (err) {
    logFailure(event, err);
  }
}
module.exports = { notifyRsvpChange, rsvpMessage };
