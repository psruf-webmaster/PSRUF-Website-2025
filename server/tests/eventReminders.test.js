const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Event = require('../models/Event');
const User = require('../models/User');
const Reminder = require('../models/EventReminder');
let event, sent, claims, failed, now;
require.cache[require.resolve('../utils/email')] = { exports: { sendRsvpChangeEmail: async (to, message) => {
  if (failed) throw Object.assign(new Error('sensitive'), { code: 'EMAIL_API' });
  sent.push({ to, ...message });
} } };
const { reminderDue, runEventReminders, reminderMessage } = require('../utils/eventReminders');
beforeEach(() => {
  now = new Date('2026-11-07T15:00:00Z');
  event = { _id: 'occurrence', title: 'Service Day', isPublished: true, startAt: new Date('2026-11-10T15:00:00Z'), endAt: new Date('2026-11-10T16:00:00Z'), rsvps: [{ user: 'member', status: 'going', createdAt: new Date('2026-11-01') }] };
  sent = []; claims = new Map(); failed = false;
  Event.find = () => ({ lean: () => ({ cursor: async function* () { yield structuredClone(event); } }) });
  Event.findById = () => ({ lean: async () => event });
  User.findById = () => ({ select: () => ({ lean: async () => ({ personalEmail: 'member@example.com', isApproved: true }) }) });
  Reminder.create = async value => {
    if (claims.has(value._id)) throw Object.assign(new Error('duplicate'), { code: 11000 });
    claims.set(value._id, value);
  };
  Reminder.updateOne = async (query, update) => Object.assign(claims.get(query._id), update.$set);
});
test('sends both reminders once, including across separate worker runs', async () => {
  await runEventReminders(now);
  await runEventReminders(now);
  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /in 3 days/);
  assert.match(sent[0].text, /#\/events\/occurrence/);
  now = new Date(+event.startAt - 3 * 3600000);
  await runEventReminders(now);
  await runEventReminders(now);
  assert.equal(sent.length, 2);
  assert.match(sent[1].subject, /starts soon/);
});
test('ignores cancelled, Maybe, Not Going, unpublished, late signup and stale reminder windows', async () => {
  for (const status of ['maybe', 'notGoing']) {
    event.rsvps[0].status = status;
    assert.equal(reminderDue(event, event.rsvps[0], 72, now), false);
  }
  event.rsvps[0].status = 'going';
  event.isPublished = false;
  assert.equal(reminderDue(event, event.rsvps[0], 72, now), false);
  event.isPublished = true;
  assert.equal(reminderDue(event, event.rsvps[0], 72, new Date(+now + 3600000)), false);
  event.rsvps[0].createdAt = new Date(+now + 1);
  assert.equal(reminderDue(event, event.rsvps[0], 72, now), false);
  event.rsvps = [];
  await runEventReminders(now);
  assert.equal(sent.length, 0);
});
test('shift start determines delivery and correct shift appears in the email', async () => {
  event.shiftBasedRegistration = true;
  event.shifts = [{ shiftId: 'late', label: 'Afternoon', startAt: new Date(+event.startAt + 2 * 3600000), endAt: new Date(+event.endAt + 2 * 3600000) }];
  event.rsvps[0].shiftId = 'late';
  await runEventReminders(now);
  assert.equal(sent.length, 0);
  await runEventReminders(new Date(+now + 2 * 3600000));
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /Shift: Afternoon/);
});
test('rechecks cancellation after claiming and skips missing accounts', async () => {
  Event.findById = () => ({ lean: async () => ({ ...event, rsvps: [] }) });
  await runEventReminders(now);
  assert.equal(sent.length, 0);
  assert.equal([...claims.values()][0].state, 'skipped');
});
test('concurrent scans claim only one delivery', async () => {
  await Promise.all([runEventReminders(now), runEventReminders(now)]);
  assert.equal(sent.length, 1);
});
test('provider failure is recorded without exposing contents and is not retried', async () => {
  failed = true;
  const original = console.error; const logs = [];
  console.error = (...args) => logs.push(args);
  try { await runEventReminders(now); await runEventReminders(now); }
  finally { console.error = original; }
  assert.deepEqual(logs, [['Event reminder delivery failed.', { eventId: 'occurrence', code: 'EMAIL_API' }]]);
  assert.equal([...claims.values()][0].state, 'failed');
});
test('reminder HTML escapes event content', () => {
  event.title = '<img src=x>';
  assert.match(reminderMessage(event, event.rsvps[0], 3).html, /&lt;img/);
});
