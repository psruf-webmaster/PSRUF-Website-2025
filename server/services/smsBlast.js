const { sendSMS } = require('../utils/sms');
const { recipientsWithPhones, dedupeIds } = require('../utils/recipients');

/**
 * Send SMS sequentially to explicit userIds.
 * @param {Object} params
 * @param {string} params.message
 * @param {string[]} params.selectedUserIds
 */
async function sendSmsBlast({ message, selectedUserIds = [] }) {
  let recipients = [];
  if (Array.isArray(selectedUserIds) && selectedUserIds.length > 0) {
    const ids = dedupeIds(selectedUserIds);
    recipients = await recipientsWithPhones(ids);
  }
  const results = { attempted: recipients.length, sent: 0, failed: 0, failures: [] };

  for (const r of recipients) {
    try {
      await sendSMS({ phone: r.phoneNumber, message });
      results.sent += 1;
    } catch (err) {
      results.failed += 1;
      results.failures.push({ userId: r.userId, reason: err.message || 'send failed' });
    }
  }

  return results;
}

async function sendSmsBlastToRecipients({ message, recipients = [] }) {
  const results = { attempted: recipients.length, sent: 0, failed: 0, failures: [] };
  for (const r of recipients) {
    try {
      await sendSMS({ phone: r.phoneNumber, message });
      results.sent += 1;
    } catch (err) {
      results.failed += 1;
      results.failures.push({ userId: r.userId, reason: err.message || 'send failed' });
    }
  }
  return results;
}

module.exports = { sendSmsBlast, sendSmsBlastToRecipients };
