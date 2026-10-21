const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');
const member = { _id: '507f1f77bcf86cd799439011', firstName: '<Alex>', lastName: 'Member', role: ['member'], isApproved: true };
const creatorId = '507f1f77bcf86cd799439012';
const eventId = '507f1f77bcf86cd799439013';
const creator = { _id: creatorId, role: ['officer'], isApproved: true };
let stored, mail, failMail, failSave, conflict, currentEmail, base, server;
require.cache[require.resolve('../utils/cloudinaryConfig')] = { loaded: true, exports: { storage: undefined, getCloudinaryFileUrl: () => null } };
require.cache[require.resolve('../utils/email')] = { loaded: true, exports: {
  sendRsvpChangeEmail: async (to, message) => {
    if (failMail) throw Object.assign(new Error('secret address and message'), { code: 'EMAIL_API', responseCode: 503 });
    mail.push({ to, ...message });
  },
} };
const { rsvpMessage } = require('../utils/rsvpNotification');
before(async () => {
  User.findById = id => {
    const value = String(id) === member._id ? member : String(id) === creatorId ? { ...creator, personalEmail: currentEmail } : null;
    const query = Promise.resolve(value);
    query.select = async () => value;
    return query;
  };
  User.find = () => ({ select: async () => [member] });
  Event.findById = async id => {
    if (String(id) !== eventId) return null;
    const document = new Event(JSON.parse(JSON.stringify(stored)));
    document.save = async () => { stored = document.toObject(); };
    return document;
  };
  Event.updateOne = async (query, update) => {
    if (failSave) throw new Error('database unavailable');
    if (conflict || JSON.stringify(query.rsvps) !== JSON.stringify(new Event(stored).toObject().rsvps)) return { modifiedCount: 0 };
    stored.rsvps = JSON.parse(JSON.stringify(update.$set.rsvps));
    return { modifiedCount: 1 };
  };
  const app = express(); app.use(express.json()); app.use('/events', require('../routes/events'));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/events/${eventId}/rsvp`;
});
beforeEach(() => {
  mail = []; failMail = false; failSave = false; conflict = false; currentEmail = 'current@example.com';
  process.env.FRONTEND_URL = 'https://phisigmarhouf.com';
  stored = new Event({ _id: eventId, title: 'Service <day>', createdBy: creatorId, coHosts: [creatorId, creatorId],
    startAt: '2026-11-10T15:00:00Z', endAt: '2026-11-10T18:00:00Z', visibility: { rolesAllowed: ['member'] },
    points: { category: 'phi' }, recurrence: { frequency: 'weekly', seriesId: 'series' },
    shifts: [{ shiftId: 'morning', label: 'Morning', startAt: '2026-11-10T15:00:00Z', endAt: '2026-11-10T16:00:00Z' },
      { shiftId: 'afternoon', label: 'Afternoon', startAt: '2026-11-10T16:00:00Z', endAt: '2026-11-10T18:00:00Z' }],
  }).toObject();
});
after(() => new Promise(resolve => server.close(resolve)));
async function request(body, authorized = true) {
  const response = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authorized ? { Authorization: `Bearer ${member._id}` } : {}) }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}

test('new and changed statuses send once to creator at their current email, even when also co-host', async () => {
  for (const [i, status] of ['going', 'maybe', 'notGoing'].entries()) {
    currentEmail = `current${i}@example.com`;
    assert.equal((await request({ status })).status, 200);
    assert.equal(mail.length, i + 1);
    assert.equal(mail[i].to, currentEmail);
    assert.match(mail[i].text, new RegExp(['Going', 'Maybe', 'Not Going'][i]));
    assert.match(mail[i].text, /<Alex> Member/);
    assert.match(mail[i].html, /&lt;Alex&gt;/);
    assert.match(mail[i].html, /Service &lt;day&gt;/);
    assert.match(mail[i].text, /November 10, 2026/);
    assert.match(mail[i].text, /only to this event occurrence/);
    assert.match(mail[i].text, new RegExp(`/#/events/${eventId}`));
  }
});

test('unchanged requests and repeated removals do not send or write; cancellation is explicit', async () => {
  await request({ status: 'going' });
  failSave = true;
  assert.equal((await request({ status: 'going' })).status, 200);
  assert.equal(mail.length, 1);
  failSave = false;
  assert.equal((await request({ status: 'none' })).status, 200);
  assert.match(mail[1].subject, /cancelled/);
  assert.match(mail[1].text, /RSVP removed/);
  assert.equal((await request({ status: 'none' })).status, 200);
  assert.equal(mail.length, 2);
});

test('shift change and cancellation identify the affected occurrence and correct selected shift', async () => {
  stored.shiftBasedRegistration = true;
  await request({ status: 'going', shiftId: 'morning' });
  await request({ status: 'going', shiftId: 'afternoon' });
  await request({ status: 'none', shiftId: 'afternoon' });
  assert.equal(mail.length, 3);
  assert.match(mail[0].text, /Shift: Morning/);
  assert.match(mail[1].text, /Shift: Afternoon/);
  assert.match(mail[2].text, /Shift: Afternoon/);
  assert.match(mail[1].text, /11:00 AM/);
  assert.equal(new URL(mail[1].text.split('View event: ')[1]).hash, `#/events/${eventId}`);
});

test('validation, authorization, save failures and concurrent save conflicts suppress mail', async () => {
  assert.equal((await request({ status: 'invalid' })).status, 400);
  assert.equal((await request({})).status, 400);
  assert.equal((await request({ status: 'going', shiftId: {} })).status, 400);
  assert.equal((await request({ status: 'going', shiftId: 'fake' })).status, 400);
  assert.equal((await request({ status: 'going' }, false)).status, 401);
  stored.visibility.rolesAllowed = ['officer'];
  assert.equal((await request({ status: 'going' })).status, 403);
  stored.visibility.rolesAllowed = ['member'];
  stored.shiftBasedRegistration = true;
  assert.equal((await request({ status: 'going', shiftId: 'unknown' })).status, 400);
  stored.shiftBasedRegistration = false;
  failSave = true;
  assert.equal((await request({ status: 'going' })).status, 500);
  failSave = false; conflict = true;
  assert.equal((await request({ status: 'going' })).status, 409);
  assert.equal(mail.length, 0);
});

test('concurrent identical submissions produce only one notification', async () => {
  const results = await Promise.all([request({ status: 'going' }), request({ status: 'going' })]);
  assert.ok(results.every(result => [200, 409].includes(result.status)));
  assert.equal(mail.length, 1);
});

test('provider failure leaves the saved RSVP successful and emits only sanitized metadata', async () => {
  failMail = true;
  const errors = []; const original = console.error;
  console.error = (...args) => errors.push(args);
  try {
    assert.equal((await request({ status: 'going' })).status, 200);
    assert.equal(stored.rsvps[0].status, 'going');
    assert.equal((await request({ status: 'going' })).status, 200);
  } finally { console.error = original; }
  assert.deepEqual(errors, [['RSVP notification failed.', { eventId, code: 'EMAIL_API', responseCode: 503 }]]);
});

test('event links preserve frontend base paths and ignore request/series identifiers', () => {
  process.env.FRONTEND_URL = 'https://example.com/chapter/';
  const message = rsvpMessage(stored, member, 'maybe');
  assert.match(message.text, new RegExp(`https://example.com/chapter/#/events/${eventId}`));
  assert.doesNotMatch(message.text, /series/);
});

test('creator mass RSVP saves members without sending a per-member email blast', async () => {
  process.env.JWT_SECRET = 'rsvp-test-only-secret';
  const { issueToken } = require('../middleware/requireJwt');
  const response = await fetch(base.replace('/rsvp', '/mass-rsvp'), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${issueToken(creator)}` },
    body: JSON.stringify({ status: 'going' }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).count, 1);
  assert.equal(stored.rsvps[0].status, 'going');
  assert.equal(mail.length, 0);
});
