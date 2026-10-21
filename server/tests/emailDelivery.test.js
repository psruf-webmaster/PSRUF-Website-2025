const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createEmailDelivery } = require('../utils/emailDelivery');
const env = { EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'test-secret', EMAIL_FROM: 'PSR <mail@example.com>' };

test('HTTPS delivery uses the verified sender, API authentication and a bounded timeout', async () => {
  const calls = [];
  const delivery = createEmailDelivery(env, async (...args) => {
    calls.push(args);
    return { ok: true, json: async () => ({ id: 'message-123' }) };
  });
  await delivery.verify();
  for (const subject of ['Your PSR account is approved', 'Reset your PSR password']) {
    assert.deepEqual(await delivery.sendMail({ from: 'legacy@gmail.com', to: 'member@example.com', subject, text: 'content' }), { messageId: 'message-123' });
  }
  assert.equal(calls.length, 2);
  for (const [url, options] of calls) {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer test-secret');
    assert.equal(options.signal instanceof AbortSignal, true);
    assert.deepEqual(JSON.parse(options.body), {
      from: env.EMAIL_FROM, to: ['member@example.com'], subject: JSON.parse(options.body).subject, text: 'content',
    });
  }
});

test('missing API configuration fails without attempting delivery or SMTP fallback', async () => {
  for (const missing of ['RESEND_API_KEY', 'EMAIL_FROM']) {
    const config = { ...env, [missing]: '' };
    const delivery = createEmailDelivery(config, () => assert.fail('must not send'));
    await assert.rejects(delivery.verify(), { code: 'EMAIL_CONFIG' });
    await assert.rejects(delivery.sendMail({}), { code: 'EMAIL_CONFIG' });
  }
});

test('provider rejections and connection failures do not expose sensitive responses', async () => {
  for (const status of [401, 403, 429, 500]) {
    const delivery = createEmailDelivery(env, async () => ({ ok: false, status, json: () => assert.fail('must not read error body') }));
    await assert.rejects(delivery.sendMail({}), { code: 'EMAIL_API', responseCode: status, message: 'Email API rejected delivery.' });
  }
  const delivery = createEmailDelivery(env, async () => { throw new Error('secret response'); });
  await assert.rejects(delivery.sendMail({}), { code: 'EMAIL_CONNECTION', message: 'Email API connection failed.' });
});

test('API key selects HTTPS automatically and unsupported providers fail explicitly', async () => {
  const delivery = createEmailDelivery({ ...env, EMAIL_PROVIDER: undefined }, async () => ({ ok: true, json: async () => ({ id: 'api' }) }));
  assert.deepEqual(await delivery.sendMail({}), { messageId: 'api' });
  assert.throws(() => createEmailDelivery({ EMAIL_PROVIDER: 'invalid' }), /EMAIL_PROVIDER/);
});

test('SMTP remains available when HTTPS is not configured', () => {
  const delivery = createEmailDelivery({ SMTP_HOST: 'localhost', SMTP_USER: 'test', SMTP_PASS: 'test' });
  assert.equal(delivery.options.host, 'localhost');
  assert.equal(delivery.options.port, 587);
  delivery.close();
});
