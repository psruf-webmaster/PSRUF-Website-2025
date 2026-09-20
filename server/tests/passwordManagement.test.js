const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

process.env.JWT_SECRET = 'test-only-secret';
process.env.FRONTEND_URL = 'https://example.com';
let sentLink;
require.cache[require.resolve('../utils/email')] = { exports: {
  sendPasswordResetEmail: async (_email, link) => { sentLink = link; },
} };
require.cache[require.resolve('../utils/cloudinaryConfig')] = { loaded: true, exports: {
  storage: undefined, getCloudinaryFileUrl: () => null,
} };
const { issueToken } = require('../middleware/requireJwt');
let server, base, user;
before(async () => {
  user = { _id: '507f1f77bcf86cd799439011', personalEmail: 'member@example.com', isApproved: true,
    personalPassword: await bcrypt.hash('old-password', 10) };
  User.findById = async id => String(id) === user._id ? { ...user } : null;
  User.findOne = async query => query.personalEmail === user.personalEmail ? { ...user } : null;
  User.updateOne = async (query, update) => {
    if (query.personalPassword && query.personalPassword !== user.personalPassword) return { modifiedCount: 0 };
    Object.assign(user, update.$set);
    for (const [key, value] of Object.entries(update.$inc || {})) user[key] = (user[key] || 0) + value;
    for (const key of Object.keys(update.$unset || {})) delete user[key];
    return { modifiedCount: 1 };
  };
  User.findOneAndUpdate = async (query, update) => {
    if (query.resetPasswordToken !== user.resetPasswordToken || !(user.resetPasswordExpires > query.resetPasswordExpires.$gt)) return null;
    await User.updateOne({}, update);
    return { ...user };
  };
  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../routes/auth'));
  app.use('/api/users', require('../routes/users'));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));
async function request(path, body, token, method = 'POST') {
  const response = await fetch(base + path, { method, headers: {
    'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}

test('login issues a signed JWT; change requires JWT and the current password', async () => {
  const login = await request('/api/auth/login', { email: user.personalEmail, password: 'old-password' });
  assert.equal(jwt.verify(login.body.token, process.env.JWT_SECRET).sub, user._id);
  const body = { currentPassword: 'old-password', newPassword: 'new-password', confirmPassword: 'new-password' };
  for (const token of [undefined, user._id, 'invalid', jwt.sign({ sub: user._id }, process.env.JWT_SECRET, { expiresIn: -1 })]) {
    assert.equal((await request('/api/users/me/password', body, token, 'PATCH')).status, 401);
  }
  assert.equal((await request('/api/users/me/password', { ...body, currentPassword: 'wrong' }, login.body.token, 'PATCH')).status, 400);
  assert.equal((await request('/api/users/me/password', { ...body, confirmPassword: 'different' }, login.body.token, 'PATCH')).status, 400);
  user.resetPasswordToken = 'outstanding';
  assert.equal((await request('/api/users/me/password', body, login.body.token, 'PATCH')).status, 200);
  assert.equal(await bcrypt.compare('new-password', user.personalPassword), true);
  assert.equal(user.resetPasswordToken, undefined);
});

test('request is generic, stores a digest and one-hour expiry; reset tokens are single-use', async () => {
  const absent = await request('/api/auth/forgot-password', { personalEmail: 'absent@example.com' });
  const existing = await request('/api/auth/forgot-password', { personalEmail: user.personalEmail });
  assert.deepEqual(existing, absent);
  const token = new URL(sentLink).searchParams.get('token');
  assert.equal(new URL(sentLink).pathname, '/reset-password');
  assert.equal(user.resetPasswordToken, crypto.createHash('sha256').update(token).digest('hex'));
  assert.ok(user.resetPasswordExpires - Date.now() > 3590000);
  assert.equal((await request('/api/auth/reset-password', { token, newPassword: 'short' })).status, 400);
  const results = await Promise.all([1, 2].map(() => request('/api/auth/reset-password', { token, newPassword: 'reset-password' })));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 400]);
  assert.equal(await bcrypt.compare('reset-password', user.personalPassword), true);
  assert.equal(user.resetPasswordToken, undefined);
  assert.equal(user.resetPasswordExpires, undefined);
});

test('expired and malformed tokens cannot change the password', async () => {
  const token = 'a'.repeat(64);
  user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  user.resetPasswordExpires = new Date(Date.now() - 1);
  const hash = user.personalPassword;
  for (const invalid of [token, 'bad', { $ne: null }]) {
    assert.equal((await request('/api/auth/reset-password', { token: invalid, newPassword: 'another-password' })).status, 400);
  }
  assert.equal(user.personalPassword, hash);
});
