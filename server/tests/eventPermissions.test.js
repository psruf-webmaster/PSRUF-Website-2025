const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const User = require('../models/User');
const Event = require('../models/Event');
process.env.JWT_SECRET = 'event-permission-test-secret';
require.cache[require.resolve('../utils/cloudinaryConfig')] = { loaded: true, exports: { storage: undefined, getCloudinaryFileUrl: () => null } };
const { issueToken } = require('../middleware/requireJwt');
const owner = { _id: '507f1f77bcf86cd799439011', role: ['member'], isApproved: true };
const outsider = { _id: '507f1f77bcf86cd799439012', role: ['webmaster'], isApproved: true };
const eventId = '507f1f77bcf86cd799439013';
let server, base, saved = 0;
before(async () => {
  User.findById = async id => [owner, outsider].find(u => u._id === String(id));
  User.find = () => ({ select: async () => [] });
  Event.findById = async () => ({ _id: eventId, createdBy: new (require('mongoose').Types.ObjectId)(owner._id), coHosts: [outsider._id], rsvps: [], attendance: [], save: async () => { saved++; } });
  const app = express(); app.use(express.json()); app.use('/events', require('../routes/events'));
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/events/${eventId}`;
});
after(() => new Promise(resolve => server.close(resolve)));
const routes = [['GET', '/manage'], ['PATCH', ''], ['PATCH', '/cohosts'], ['PUT', '/attendance'], ['POST', '/mass-rsvp'], ['POST', '/manage-members'], ['DELETE', '']];
async function request(method, suffix, token, extra = {}) {
  return fetch(base + suffix, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...extra }, ...(method === 'GET' ? {} : { body: '{}' }) });
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
