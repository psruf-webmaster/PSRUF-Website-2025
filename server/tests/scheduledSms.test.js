const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const Channel = require('../models/Channel');
const { issueToken } = require('../middleware/requireJwt');
const sender = { _id: '507f1f77bcf86cd799439011', isApproved: true, role: ['exec'], positions: [{ key: 'VP_COMMUNICATIONS' }] };
const id = '507f1f77bcf86cd799439012';
let stored, calls, resolveCalls, providerFailure, partial, archived, server, base, now;
require.cache[require.resolve('../utils/cloudinaryConfig')] = { exports: { upload: { array: () => (_req, _res, next) => next() }, getCloudinaryFileUrl: () => null } };
require.cache[require.resolve('../services/smsBlast')] = { exports: { sendSmsBlastToRecipients: async args => {
  calls.push(args);
  if (providerFailure) throw new Error('sensitive provider response');
  return { attempted: 2, sent: partial ? 1 : 2, failed: partial ? 1 : 0, failures: [] };
} } };
require.cache[require.resolve('../services/audienceResolver')] = { exports: { resolveRecipientPhones: async args => {
  resolveCalls.push(args);
  if (args.audienceType === 'specific' && !args.selectedUserIds.length) throw Object.assign(new Error('Select recipients'), { status: 400 });
  return [{ userId: 'recipient', phoneNumber: 'private' }];
} } };
const { runScheduledSms } = require('../services/scheduledSms');
before(async () => {
  process.env.JWT_SECRET = 'schedule-tests-only';
  User.findById = async () => sender;
  User.find = () => ({ select: async () => [sender] });
  Channel.findOne = async () => ({ slug: 'chapterAnnouncements', isArchived: archived });
  Post.create = async data => { stored = new Post({ ...data, _id: id }); return stored; };
  Post.findOneAndUpdate = async (query, update) => {
    if (!stored || stored.smsSchedule.status !== query['smsSchedule.status'] ||
        (query._id && String(query._id) !== String(stored._id)) ||
        (query['smsSchedule.sendAt'] && stored.smsSchedule.sendAt > query['smsSchedule.sendAt'].$lte)) return null;
    stored.smsSchedule.status = update.$set['smsSchedule.status'];
    return stored;
  };
  Post.updateOne = async (_query, update) => {
    for (const [key, value] of Object.entries(update.$set)) stored.smsSchedule[key.split('.')[1]] = value;
  };
  const app = express(); app.use(express.json()); app.use('/feeds', require('../routes/feeds'));
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/feeds`;
});
beforeEach(() => {
  stored = null; calls = []; resolveCalls = []; providerFailure = false; partial = false; archived = false;
  now = new Date(); sender.positions = [{ key: 'VP_COMMUNICATIONS' }]; sender.role = ['exec']; sender.isApproved = true;
});
after(() => new Promise(resolve => server.close(resolve)));
async function create(extra = {}, token = issueToken(sender)) {
  return fetch(`${base}/chapterAnnouncements/posts`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': sender._id, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content: 'Hello sisters', sendAsText: true, audienceType: 'specific', selectedUserIds: [id], smsSendAt: new Date(+now + 120000).toISOString(), ...extra }) });
}
test('C&R schedules without immediate SMS; due worker sends only once across scans', async () => {
  assert.equal((await create()).status, 201);
  assert.equal(calls.length, 0);
  assert.equal(stored.smsSchedule.status, 'pending');
  await runScheduledSms(now);
  assert.equal(calls.length, 0);
  await Promise.all([runScheduledSms(new Date(+now + 120000)), runScheduledSms(new Date(+now + 120000))]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].message, 'Hello sisters');
  assert.equal(stored.smsSchedule.status, 'sent');
  assert.equal(resolveCalls.length, 2);
});
test('webmaster may schedule; webdev and raw IDs cannot', async () => {
  sender.role = ['webmaster']; sender.positions = [];
  assert.equal((await create()).status, 201);
  stored = null;
  assert.equal((await create({}, sender._id)).status, 401);
  assert.equal(stored, null);
  sender.role = ['webdev'];
  assert.equal((await create()).status, 403);
  assert.equal(stored, null);
});
test('rejects invalid and past times before creating posts', async () => {
  for (const smsSendAt of ['bad', new Date(+now - 1000).toISOString(), new Date(+now + 91 * 86400000).toISOString()]) {
    assert.equal((await create({ smsSendAt })).status, 400);
    assert.equal(stored, null);
  }
});
test('pending cancellation is atomic and no SMS sends afterwards', async () => {
  await create();
  const response = await fetch(`${base}/scheduled-sms/${id}/cancel`, { method: 'POST', headers: { Authorization: `Bearer ${issueToken(sender)}` } });
  assert.equal(response.status, 200);
  await runScheduledSms(new Date(+now + 120000));
  assert.equal(calls.length, 0);
  const again = await fetch(`${base}/scheduled-sms/${id}/cancel`, { method: 'POST', headers: { Authorization: `Bearer ${issueToken(sender)}` } });
  assert.equal(again.status, 409);
});
test('revoked permissions and archived channels cancel scheduled delivery', async () => {
  await create(); sender.positions = [];
  await runScheduledSms(new Date(+now + 120000));
  assert.equal(stored.smsSchedule.status, 'cancelled');
  assert.equal(calls.length, 0);
  sender.positions = [{ key: 'VP_COMMUNICATIONS' }]; await create(); archived = true;
  await runScheduledSms(new Date(+now + 120000));
  assert.equal(stored.smsSchedule.status, 'cancelled');
});
test('failed or partial deliveries are recorded and never automatically replayed', async () => {
  await create(); partial = true;
  await runScheduledSms(new Date(+now + 120000));
  assert.equal(stored.smsSchedule.status, 'partial');
  assert.equal(stored.smsSchedule.sent, 1);
  await runScheduledSms(new Date(+now + 120000));
  assert.equal(calls.length, 1);
  await create(); providerFailure = true;
  const original = console.error; const logs = []; console.error = (...args) => logs.push(args);
  try { await runScheduledSms(new Date(+now + 120000)); } finally { console.error = original; }
  assert.equal(stored.smsSchedule.status, 'failed');
  assert.deepEqual(logs, [['Scheduled text blast failed.', { postId: id }]]);
});
test('immediate blast behavior is preserved', async () => {
  assert.equal((await create({ smsSendAt: undefined })).status, 201);
  assert.equal(calls.length, 1);
});

test('VP C&R sends immediately without a cached sms.send permission', async () => {
  sender.permissions = [];
  const response = await create({ smsSendAt: undefined });
  assert.equal(response.status, 201);
  const data = await response.json();
  assert.equal(data.smsResult.sent, 2);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].message, 'Hello sisters');
});
test('C&R position keys accept legacy formatting without granting access to subordinate positions', async () => {
  sender.positions = [{ key: 'vp_communications' }];
  assert.equal((await create({ smsSendAt: undefined })).status, 201);
  sender.positions = [{ key: 'PR_DIRECTOR', exec: 'VP_COMMUNICATIONS' }];
  stored = null;
  assert.equal((await create({ smsSendAt: undefined })).status, 403);
  assert.equal(stored, null);
  assert.equal(calls.length, 1);
});
