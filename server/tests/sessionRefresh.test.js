const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
process.env.JWT_SECRET = 'session-refresh-test-secret';
require.cache[require.resolve('../utils/email')] = { loaded: true, exports: { sendPasswordResetEmail: async () => {} } };
const { issueToken } = require('../middleware/requireJwt');
const user = { _id: '507f1f77bcf86cd799439011', isApproved: true, positions: [], passwordVersion: 0 };
let server, base;
before(async () => {
  User.findById = async id => String(id) === user._id ? user : null;
  const app = express();
  app.use('/auth', require('../routes/auth'));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/auth/me`;
});
after(() => new Promise(resolve => server.close(resolve)));
async function refresh(token) {
  return fetch(base, { headers: { Authorization: `Bearer ${token}` } });
}
test('refresh renews a valid session and returns current positions', async () => {
  const token = jwt.sign({ passwordVersion: 0, iat: Math.floor(Date.now() / 1000) - 3600 }, process.env.JWT_SECRET,
    { subject: user._id, expiresIn: '1d' });
  user.positions = [{ key: 'VP_STANDARDS' }];
  const response = await refresh(token);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(data.user.positions, user.positions);
  assert.equal(jwt.verify(data.token, process.env.JWT_SECRET).sub, user._id);
  assert.ok(jwt.decode(data.token).exp > jwt.decode(token).exp);
});
test('refresh rejects expired, revoked, malformed and user-ID-only sessions', async () => {
  const revoked = issueToken(user);
  user.passwordVersion++;
  const expired = jwt.sign({ passwordVersion: user.passwordVersion }, process.env.JWT_SECRET,
    { subject: user._id, expiresIn: -1 });
  for (const token of [expired, revoked, user._id, 'invalid']) {
    assert.equal((await refresh(token)).status, 401);
  }
});
