const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * Resolve a list of recipients by explicit userIds.
 * Eligibility: user exists and has a phone number on file.
 * Returns metadata only (no phone numbers) for privacy.
 *
 * @param {string[]} userIds
 * @returns {Promise<Array<{userId: string, displayName: string, role: any, memberStatus: any}>>}
 */
function dedupeIds(ids = []) {
  const seen = new Set();
  const out = [];
  ids.forEach(id => {
    if (mongoose.Types.ObjectId.isValid(id)) {
      const s = String(id);
      if (!seen.has(s)) {
        seen.add(s);
        out.push(s);
      }
    }
  });
  return out;
}

async function recipientsByUserIds(userIds = []) {
  const validIds = dedupeIds(userIds);
  if (!validIds.length) return [];

  const users = await User.find({
    _id: { $in: validIds },
    phoneNumber: { $exists: true, $ne: '' },
  }).select('firstName lastName role memberStatus');

  return users.map(u => ({
    userId: u._id,
    displayName: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
    role: u.role,
    memberStatus: u.memberStatus,
  }));
}

async function recipientsWithPhones(userIds = []) {
  const validIds = (userIds || []).filter(id => mongoose.Types.ObjectId.isValid(id));
  if (!validIds.length) return [];

  const users = await User.find({
    _id: { $in: validIds },
    phoneNumber: { $exists: true, $ne: '' },
  }).select('firstName lastName role memberStatus phoneNumber');

  return users.map(u => ({
    userId: u._id,
    displayName: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
    role: u.role,
    memberStatus: u.memberStatus,
    phoneNumber: u.phoneNumber,
  }));
}

module.exports = { recipientsByUserIds, recipientsWithPhones, dedupeIds };
