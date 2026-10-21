const crypto = require('crypto');
const Event = require('../models/Event');
const User = require('../models/User');
const EventReminder = require('../models/EventReminder');
const { sendRsvpChangeEmail } = require('./email');
const { rsvpMessage } = require('./rsvpNotification');
const HOUR = 60 * 60 * 1000;
const OFFSETS = [72, 3];

function reminderDue(event, rsvp, offset, now) {
  if (!event.isPublished || rsvp.status !== 'going') return false;
  const shift = event.shiftBasedRegistration && (event.shifts || []).find(s => String(s.shiftId) === String(rsvp.shiftId));
  if (event.shiftBasedRegistration && !shift) return false;
  const startsAt = new Date(shift ? shift.startAt : event.startAt);
  const due = startsAt.getTime() - offset * HOUR;
  // One-hour catch-up window; never send old reminders or reminders for late signups.
  if (!(now >= due && now < due + HOUR && startsAt > now) || new Date(rsvp.createdAt).getTime() > due) return false;
  return startsAt;
}

function reminderMessage(event, rsvp, offset) {
  const message = rsvpMessage(event, {}, 'going', rsvp.shiftId);
  const headline = offset === 72 ? 'Just a reminder: your event is in 3 days.' : 'Just a reminder: your event is in a few hours.';
  message.subject = `Reminder: ${String(event.title).replace(/[\r\n]/g, ' ')} ${offset === 72 ? 'is in 3 days' : 'starts soon'}`;
  message.text = message.text.replace('Hi there,', `Hi there,\n\n${headline}`);
  message.html = message.html.replace('<p>Hi there,</p>', `<p>Hi there,</p><p>${headline}</p>`);
  return message;
}

async function runEventReminders(now = new Date()) {
  const stats = { sent: 0, failed: 0, skipped: 0 };
  const events = Event.find({ isPublished: true, 'rsvps.status': 'going', $or: [
    { startAt: { $gt: now, $lte: new Date(+now + 72 * HOUR) } },
    { 'shifts.startAt': { $gt: now, $lte: new Date(+now + 72 * HOUR) } },
  ] }).lean().cursor();
  let attempts = 0;
  for await (const event of events) {
    for (const rsvp of event.rsvps || []) {
      for (const offset of OFFSETS) {
        const startsAt = reminderDue(event, rsvp, offset, now);
        if (!startsAt) continue;
        const id = crypto.createHash('sha256').update(`${event._id}:${rsvp.user}:${startsAt.toISOString()}:${offset}`).digest('hex');
        try {
          await EventReminder.create({ _id: id, eventId: event._id, userId: rsvp.user, startsAt, offsetHours: offset,
            expiresAt: new Date(+startsAt + 90 * 24 * HOUR) });
        } catch (err) {
          if (err.code === 11000) continue;
          throw err;
        }
        let state = 'skipped';
        try {
          // Recheck the current selection after claiming, before delivery.
          const latest = await Event.findById(event._id).lean();
          const selection = latest?.rsvps?.find(entry => String(entry.user) === String(rsvp.user));
          const currentStart = selection && reminderDue(latest, selection, offset, now);
          const account = await User.findById(rsvp.user).select('personalEmail isApproved').lean();
          if (currentStart && +currentStart === +startsAt && account?.isApproved && account.personalEmail) {
            await sendRsvpChangeEmail(account.personalEmail, reminderMessage(latest, selection, offset));
            state = 'sent';
          }
        } catch (err) {
          state = 'failed';
          console.error('Event reminder delivery failed.', { eventId: String(event._id),
            code: ['EMAIL_API', 'EMAIL_CONFIG', 'EMAIL_CONNECTION'].includes(err?.code) ? err.code : 'DELIVERY_FAILED' });
        }
        await EventReminder.updateOne({ _id: id }, { $set: { state } });
        stats[state]++;
        if (++attempts >= 100) return stats;
      }
    }
  }
  return stats;
}

function startEventReminders() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await runEventReminders(); }
    catch { console.error('Event reminder scan failed.'); }
    finally { running = false; }
  };
  void tick();
  const timer = setInterval(tick, 5 * 60 * 1000);
  timer.unref();
  return timer;
}
module.exports = { reminderDue, reminderMessage, runEventReminders, startEventReminders };
