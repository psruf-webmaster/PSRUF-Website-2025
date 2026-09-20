const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { issueToken } = require('../middleware/requireJwt');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
let user, server, base, links, mailFailure, dbFailure;
require.cache[require.resolve('../utils/email')] = { loaded: true, exports: {
  sendPasswordResetEmail: async (_to, link) => {
    if (mailFailure) throw new Error('Simulated SMTP failure');
    links.push(link);
  },
} };
require.cache[require.resolve('../utils/cloudinaryConfig')] = { loaded: true, exports: {
  storage: undefined, getCloudinaryFileUrl: () => null,
} };
const copy = () => ({ ...user, save: async function () { Object.assign(user, this); } });
beforeEach(async () => {
  process.env.JWT_SECRET = 'adversarial-test-secret';
  process.env.FRONTEND_URL = 'https://phisigmarhouf.com';
  links = []; mailFailure = false; dbFailure = false;
  user = { _id: '507f1f77bcf86cd799439011', personalEmail: 'member@example.com',
    isApproved: true, personalPassword: await bcrypt.hash('original-password', 10) };
  User.findById = async id => String(id) === user._id ? copy() : null;
  User.findOne = async query => {
    if (dbFailure) throw new Error('Simulated database failure');
    return query.personalEmail === user.personalEmail ? copy() : null;
  };
  User.updateOne = async (query, update) => {
    if (Object.entries(query).some(([key, value]) => user[key] !== value)) return { modifiedCount: 0 };
    Object.assign(user, update.$set);
    for (const [key, value] of Object.entries(update.$inc || {})) user[key] = (user[key] || 0) + value;
    for (const key of Object.keys(update.$unset || {})) delete user[key];
    return { modifiedCount: 1 };
  };
  User.findOneAndUpdate = async (query, update) => {
    if (query.resetPasswordToken !== user.resetPasswordToken || !(user.resetPasswordExpires > query.resetPasswordExpires.$gt)) return null;
    await User.updateOne({}, update);
    return copy();
  };
  // Each test gets fresh real rate-limit middleware, never a bypass.
  delete require.cache[require.resolve('../routes/auth')];
  delete require.cache[require.resolve('../routes/users')];
  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../routes/auth'));
  app.use('/api/users', require('../routes/users'));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterEach(() => new Promise(resolve => server.close(resolve)));
async function request(path, body, { token, method = 'POST', headers = {} } = {}) {
  const response = await fetch(base + path, { method, headers: {
    'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers,
  }, body: JSON.stringify(body) });
  const text = await response.text();
  let result;
  try { result = JSON.parse(text); } catch { result = text; }
  return { status: response.status, body: result };
}
const forgot = email => request('/api/auth/forgot-password', { personalEmail: email });
const reset = (token, newPassword = 'replacement-password') => request('/api/auth/reset-password', { token, newPassword });
const change = (body, token = issueToken(user)) => request('/api/users/me/password', body, { token, method: 'PATCH' });
const passwordBody = { currentPassword: 'original-password', newPassword: 'replacement-password', confirmPassword: 'replacement-password' };

test('SECURITY: a raw user ID cannot replace the recovery email', async () => {
  const result = await request('/api/users/me', { personalEmail: 'attacker@example.com' }, { token: user._id, method: 'PATCH' });
  assert.equal(result.status, 401);
  assert.equal(user.personalEmail, 'member@example.com');
});

test('SECURITY: body and x-user-id cannot replace the recovery email', async () => {
  for (const headers of [{}, { 'x-user-id': user._id }]) {
    const result = await request('/api/users/me', { userId: user._id, personalEmail: 'attacker@example.com' }, { method: 'PATCH', headers });
    assert.equal(result.status, 401);
  }
});

test('forged, wrong-algorithm, expired, future, and unknown-user JWTs fail closed', async () => {
  const tokens = [
    jwt.sign({ sub: user._id }, 'wrong-secret'),
    jwt.sign({ sub: user._id }, process.env.JWT_SECRET, { algorithm: 'HS384' }),
    jwt.sign({ sub: user._id }, process.env.JWT_SECRET, { expiresIn: -1 }),
    jwt.sign({ sub: user._id }, process.env.JWT_SECRET, { notBefore: '1h' }),
    jwt.sign({ sub: '507f1f77bcf86cd799439012' }, process.env.JWT_SECRET),
    jwt.sign({ sub: user._id }, null, { algorithm: 'none' }),
    jwt.sign({ sub: { $ne: null } }, process.env.JWT_SECRET),
  ];
  for (const token of tokens) assert.equal((await change(passwordBody, token)).status, 401);
});

test('unapproved accounts and missing signing secret cannot change passwords', async () => {
  const token = issueToken(user);
  user.isApproved = false;
  assert.equal((await change(passwordBody, token)).status, 401);
  delete process.env.JWT_SECRET;
  assert.equal((await change(passwordBody, token)).status, 503);
});

test('password change rejects malformed fields without mutation', async () => {
  const hash = user.personalPassword;
  for (const value of [null, {}, [], 5, '', true]) {
    for (const field of Object.keys(passwordBody)) {
      assert.equal((await change({ ...passwordBody, [field]: value })).status, 400);
    }
  }
  assert.equal(user.personalPassword, hash);
});

test('bcrypt byte limit rejects multibyte and long passwords without truncation', async () => {
  for (const value of ['a'.repeat(73), '🔒'.repeat(19)]) {
    assert.equal((await reset('a'.repeat(64), value)).status, 400);
    assert.equal((await change({ ...passwordBody, newPassword: value, confirmPassword: value })).status, 400);
  }
  const value = 'a'.repeat(72);
  assert.equal((await change({ ...passwordBody, newPassword: value, confirmPassword: value })).status, 200);
  assert.equal(await bcrypt.compare(value, user.personalPassword), true);
});

test('email and token operator injection, arrays, nulls, and malformed strings fail', async () => {
  for (const email of [{ $ne: null }, [], null, 5, '', 'bad', 'a@b.com\r\nBcc:x@y.com']) {
    assert.equal((await forgot(email)).status, 400);
  }
  assert.equal(links.length, 0);
});

test('token payload fuzzing cannot mutate a password', async () => {
  const hash = user.personalPassword;
  for (const token of [undefined, null, {}, [], 42, 'a'.repeat(63), 'a'.repeat(65), 'G'.repeat(64), 'a'.repeat(64) + '\n']) {
    assert.equal((await reset(token)).status, 400);
  }
  assert.equal(user.personalPassword, hash);
});

test('new requests supersede old tokens and stored digests cannot be redeemed', async () => {
  await forgot(user.personalEmail);
  const first = new URL(links[0]).searchParams.get('token');
  await forgot(user.personalEmail);
  const second = new URL(links[1]).searchParams.get('token');
  assert.notEqual(first, second);
  assert.equal((await reset(first)).status, 400);
  assert.equal((await reset(user.resetPasswordToken)).status, 400);
  assert.equal((await reset(second)).status, 200);
  assert.equal((await reset(second)).status, 400);
});

test('eight concurrent reset submissions produce exactly one winner', async () => {
  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = digest(token);
  user.resetPasswordExpires = new Date(Date.now() + 60000);
  const results = await Promise.all(Array.from({ length: 8 }, (_, i) => reset(token, `password-${i}`)));
  assert.equal(results.filter(result => result.status === 200).length, 1);
  assert.equal(results.filter(result => result.status === 400).length, 7);
});

test('concurrent password changes cannot overwrite a completed change', async () => {
  const results = await Promise.all(Array.from({ length: 4 }, () => change(passwordBody)));
  assert.equal(results.filter(result => result.status === 200).length, 1);
  assert.equal(results.filter(result => result.status === 400).length, 3);
});

test('reset expiration at the present and in the past is rejected', async () => {
  const token = 'a'.repeat(64);
  for (const offset of [0, -1, -3600000]) {
    user.resetPasswordToken = digest(token);
    user.resetPasswordExpires = new Date(Date.now() + offset);
    assert.equal((await reset(token)).status, 400);
  }
});

test('SMTP failure stays generic and clears the failed token', async () => {
  const absent = await forgot('absent@example.com');
  mailFailure = true;
  assert.deepEqual(await forgot(user.personalEmail), absent);
  assert.equal(user.resetPasswordToken, undefined);
  assert.equal(user.resetPasswordExpires, undefined);
});

test('invalid frontend configuration fails before writing tokens or sending mail', async () => {
  for (const url of ['', 'not-a-url', 'javascript:alert(1)']) {
    process.env.FRONTEND_URL = url;
    assert.equal((await forgot(user.personalEmail)).status, 503);
    assert.equal(user.resetPasswordToken, undefined);
  }
  assert.equal(links.length, 0);
});

test('reset emails use the configured public domain, never request host headers', async () => {
  assert.equal((await request('/api/auth/forgot-password', { personalEmail: user.personalEmail }, {
    headers: { Host: 'attacker.example', 'X-Forwarded-Host': 'attacker.example' },
  })).status, 200);
  const link = new URL(links[0]);
  assert.equal(link.origin, 'https://phisigmarhouf.com');
  assert.equal(link.pathname, '/reset-password');
  assert.match(link.searchParams.get('token'), /^[a-f0-9]{64}$/);
});

test('rate limit blocks the eleventh request with a JSON error', async () => {
  for (let i = 0; i < 10; i++) assert.equal((await forgot('absent@example.com')).status, 200);
  const result = await forgot('absent@example.com');
  assert.equal(result.status, 429);
  assert.match(result.body.message, /Too many/);
});

test('database failures do not expose internal errors', async () => {
  dbFailure = true;
  const result = await forgot(user.personalEmail);
  assert.equal(result.status, 500);
  assert.doesNotMatch(JSON.stringify(result.body), /Simulated|stack|mongo/i);
});

test('reset invalidates old JWTs, including access to the recovery email', async () => {
  const oldJwt = issueToken(user);
  await forgot(user.personalEmail);
  assert.equal((await reset(new URL(links[0]).searchParams.get('token'))).status, 200);
  const result = await request('/api/users/me', { personalEmail: 'attacker@example.com' }, { token: oldJwt, method: 'PATCH' });
  assert.equal(result.status, 401);
  assert.equal(user.personalEmail, 'member@example.com');
  assert.equal((await request('/api/users/me', {}, { token: issueToken(user), method: 'PATCH' })).status, 200);
});

test('password change rotates JWT, rejects old JWT, and invalidates pending reset links', async () => {
  const oldJwt = issueToken(user);
  await forgot(user.personalEmail);
  const token = new URL(links[0]).searchParams.get('token');
  const result = await change(passwordBody, oldJwt);
  assert.equal(result.status, 200);
  assert.equal(jwt.verify(result.body.token, process.env.JWT_SECRET).passwordVersion, 1);
  assert.equal((await change(passwordBody, oldJwt)).status, 401);
  assert.equal((await reset(token)).status, 400);
  assert.equal((await request('/api/users/me', {}, { token: result.body.token, method: 'PATCH' })).status, 200);
});
