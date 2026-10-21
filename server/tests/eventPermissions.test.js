const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const User = require('../models/User');
const Event = require('../models/Event');
const PointsLedger = require('../models/PointsLedger');
process.env.JWT_SECRET = 'event-permission-test-secret';
require.cache[require.resolve('../utils/cloudinaryConfig')] = { loaded: true, exports: { storage: undefined, getCloudinaryFileUrl: () => null } };
const { issueToken } = require('../middleware/requireJwt');
const owner = { _id: '507f1f77bcf86cd799439011', role: ['member'], isApproved: true };
const outsider = { _id: '507f1f77bcf86cd799439012', role: ['webmaster'], isApproved: true };
const eventId = '507f1f77bcf86cd799439013';
let server, base, saved = 0, seriesQuery;
let series = false;
before(async () => {
  User.findById = id => {
    const value = [owner, outsider].find(u => u._id === String(id));
    const query = Promise.resolve(value);
    query.select = async () => value;
    return query;
  };
  User.find = () => ({ select: async () => [] });
  const makeEvent = () => {
    const event = new Event({ _id: eventId, createdBy: owner._id, coHosts: [outsider._id], title: 'Event',
      startAt: new Date('2027-01-01T15:00:00Z'), endAt: new Date('2027-01-01T16:00:00Z'),
      visibility: { rolesAllowed: ['member', 'exec'] }, points: { category: 'phi' }, recurrence: { frequency: series ? 'weekly' : 'none', seriesId: series ? 'test-series' : undefined, endDate: series ? new Date('2027-02-01') : undefined } });
    event.save = async () => { saved++; };
    return event;
  };
  Event.findById = async () => makeEvent();
  Event.find = query => {
    seriesQuery = query;
    return { sort: async () => [makeEvent()], select: async () => [{ _id: eventId }] };
  };
  Event.deleteMany = async () => ({ deletedCount: 1 });
  PointsLedger.deleteMany = async () => ({});
  PointsLedger.findOneAndUpdate = async () => ({});
  const app = express(); app.use(express.json()); app.use('/events', require('../routes/events'));
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/events/${eventId}`;
});
after(() => new Promise(resolve => server.close(resolve)));
const routes = [['GET', '/manage'], ['PATCH', ''], ['PATCH', '/cohosts'], ['PUT', '/attendance'], ['POST', '/mass-rsvp'], ['POST', '/manage-members'], ['DELETE', '']];
async function request(method, suffix, token, extra = {}, body = {}) {
  return fetch(base + suffix, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...extra }, ...(method === 'GET' ? {} : { body: JSON.stringify(body) }) });
}
test('non-creators cannot manage even with privileged roles or co-host membership', async () => {
  for (const role of ['officer', 'exec', 'webmaster', 'webdev', 'candOfficer', 'member']) {
    outsider.role = [role];
    for (const [method, suffix] of routes) assert.equal((await request(method, suffix, issueToken(outsider))).status, 403, `${role}: ${method} ${suffix}`);
  }
  assert.equal(saved, 0);
});
test('raw creator IDs and spoofed identity headers cannot bypass authentication', async () => {
  for (const [method, suffix] of routes) {
    assert.equal((await request(method, suffix, owner._id, { 'x-user-id': owner._id })).status, 401);
    assert.equal((await request(method, suffix, issueToken(outsider), { 'x-user-id': owner._id })).status, 403);
  }
});
test('verified creator retains management regardless of current role', async () => {
  assert.equal((await request('PATCH', '/cohosts', issueToken(owner))).status, 200);
  assert.equal(saved, 1);
});


test('VP Standards can manage another creator’s event on every management endpoint', async () => {
  outsider.positions = [{ key: 'VP_STANDARDS' }];
  outsider.role = ['exec'];
  for (const [method, suffix] of routes) {
    const body = suffix === '/manage-members' ? { userId: owner._id } : {};
    const response = await request(method, suffix, issueToken(outsider), {}, body);
    assert.equal(response.status, 200, `${method} ${suffix}: ${await response.text()}`);
  }
  for (const [method, suffix] of routes) {
    assert.equal((await request(method, suffix, outsider._id)).status, 401);
  }
});

test('VP Standards series edits and deletion target the original creator’s series', async () => {
  series = true;
  const edited = await request('PATCH', '', issueToken(outsider), {}, { applyToSeries: true });
  assert.equal(edited.status, 200, await edited.text());
  assert.equal(String(seriesQuery.createdBy), owner._id);
  assert.equal(seriesQuery['recurrence.seriesId'], 'test-series');
  assert.equal((await request('DELETE', '?scope=series', issueToken(outsider))).status, 200);
  assert.equal(String(seriesQuery.createdBy), owner._id);
  series = false;
});

test('Standards Board and other VP positions do not inherit global event management', async () => {
  for (const positions of [[{ key: 'STANDARDS_BOARD', exec: 'VP_STANDARDS' }], [{ key: 'VP_SOCIAL' }], []]) {
    outsider.positions = positions;
    for (const [method, suffix] of routes) assert.equal((await request(method, suffix, issueToken(outsider))).status, 403);
  }
});
