const { sendSMS } = require('../utils/sms');
const { recipientsWithPhones, dedupeIds } = require('../utils/recipients');

/**
 * Send SMS sequentially to explicit userIds.
 * @param {Object} params
 * @param {string} params.message
 * @param {string[]} params.selectedUserIds
 */
async function sendSmsBlast({ message, selectedUserIds = [] }) {
  const ids = dedupeIds(selectedUserIds);
  if (!ids.length) return { attempted: 0, sent: 0, failed: 0, failures: [] };

  const recipients = await recipientsWithPhones(ids);
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

module.exports = { sendSmsBlast };
