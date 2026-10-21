// server/utils/email.js
require('dotenv').config();
const { createEmailDelivery } = require('./emailDelivery');

const transporter = createEmailDelivery();

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

async function sendPasswordResetEmail(to, link) {
  return transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || 'PSR Webmaster'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to,
    subject: 'Reset your PSR password',
    text: `Hello! Reset your password using this link:\n\n${link}\n\nThis link expires in one hour and can only be used once. If you did not request this, you can ignore this email and let the webmaster know :).`,
  });
}

async function sendRsvpChangeEmail(to, message) {
  return transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || 'PSR Webmaster'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to,
    ...message,
  });
}

module.exports = { transporter, sendApprovalEmail, sendPasswordResetEmail, sendRsvpChangeEmail };

/** ---- one-off manual test runner (optional) ----
 * Run: node utils/email.js
 */
if (require.main === module) {
  (async () => {
    try {
      const info = await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'PSR Webmaster'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER, // send to yourself for the test
        subject: 'PSR email delivery test',
        text: 'If you see this, email delivery works.',
      });
      console.log('Test email sent:', info.messageId);
    } catch (e) {
      console.error('Failed to send test email:', e.message);
    }
  })();
}
