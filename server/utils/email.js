// server/utils/email.js
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true', // true only for 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Optional: verify on import (comment out if too noisy)
transporter
  .verify()
  .then(() => console.log('✅ SMTP connection OK'))
  .catch((err) => console.error('❌ SMTP error:', err.message));

async function sendApprovalEmail(to, name = 'there') {
  const fromName = process.env.SMTP_FROM_NAME || 'PSR Webmaster';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  return transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to, // user’s personalEmail from DB
    subject: 'Your PSR account is approved',
    text: `Hi ${name}, your PSR website account is approved. You can now log in.`,
    html: `<p>Hi ${name},</p><p>Your PSR website account is <b>approved</b>. You can now log in.</p>`,
  });
}

module.exports = { transporter, sendApprovalEmail };

/** ---- one-off manual test runner (optional) ----
 * Run: node utils/email.js
 */
if (require.main === module) {
  (async () => {
    try {
      const info = await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
        to: process.env.SMTP_USER, // send to yourself for the test
        subject: 'PSR SMTP test',
        text: 'If you see this, SMTP works.',
      });
      console.log('✅ Test email sent:', info.messageId);
    } catch (e) {
      console.error('❌ Failed to send test email:', e.message);
    }
  })();
}
