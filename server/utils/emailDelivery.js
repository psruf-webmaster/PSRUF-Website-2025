const nodemailer = require('nodemailer');

function createEmailDelivery(env = process.env, request = (...args) => fetch(...args)) {
  const provider = env.EMAIL_PROVIDER || (env.RESEND_API_KEY ? 'resend' : 'smtp');
  if (provider === 'resend') {
    function validate() {
      if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
        throw Object.assign(new Error('Configure RESEND_API_KEY and EMAIL_FROM for Resend.'), { code: 'EMAIL_CONFIG' });
      }
    }
    return {
      async verify() { validate(); },
      async sendMail(message) {
        validate();
        let response;
        try {
          response = await request('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...message, from: env.EMAIL_FROM, to: Array.isArray(message.to) ? message.to : [message.to] }),
            signal: AbortSignal.timeout(15000),
          });
        } catch {
          throw Object.assign(new Error('Email API connection failed.'), { code: 'EMAIL_CONNECTION' });
        }
        // Provider responses may contain recipient addresses. Do not expose them in logs.
        if (!response.ok) {
          throw Object.assign(new Error('Email API rejected delivery.'), { code: 'EMAIL_API', responseCode: response.status });
        }
        const data = await response.json();
        if (!data.id) throw Object.assign(new Error('Email API returned no message ID.'), { code: 'EMAIL_API' });
        return { messageId: data.id };
      },
    };
  }
  if (provider !== 'smtp') throw new Error('EMAIL_PROVIDER must be resend or smtp.');
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    secure: String(env.SMTP_SECURE).toLowerCase() === 'true',
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
}

module.exports = { createEmailDelivery };
