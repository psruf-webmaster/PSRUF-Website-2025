const mongoose = require('mongoose');
const Channel = require('../models/Channel');
const User = require('../models/User');
const { dedupeIds } = require('../utils/recipients');
const { MEMBER_STATUS_ENUM, sanitizeMemberStatuses } = require('../constants/memberOptions');

const ROLE_ENUM = [
  'pending', 'pnm', 'candidate', 'candOfficer', 'member',
  'alumni', 'officer', 'exec', 'webmaster', 'webdev'
];
function normalizeArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function resolveEffectiveMembers(channel, users) {
  const manual = new Set((channel.manualMembers || []).map(id => String(id)));
  const excluded = new Set((channel.excludedMembers || []).map(id => String(id)));

  const fromRules = users.filter(u => {
    const roles = Array.isArray(u.role) ? u.role : (u.role ? [u.role] : []);
    const statuses = sanitizeMemberStatuses(u.memberStatus);
    const roleHit = (channel.includeRoles || []).length === 0 || roles.some(r => (channel.includeRoles || []).includes(r));
    const statusHit = (channel.includeMemberStatuses || []).length === 0 || statuses.some(s => (channel.includeMemberStatuses || []).includes(s));
    return roleHit && statusHit;
  }).map(u => String(u._id));

  const effective = new Set([...manual, ...fromRules]);
  excluded.forEach(id => effective.delete(id));
  return [...effective];
}

function toRecipient(u) {
  return {
    userId: u._id,
    displayName: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
    role: u.role,
    memberStatus: sanitizeMemberStatuses(u.memberStatus),
  };
}

async function resolveChannelRecipients({ channelSlug, channelId }) {
  const channel = channelSlug
    ? await Channel.findOne({ slug: channelSlug })
    : await Channel.findById(channelId);
  if (!channel) throw Object.assign(new Error('Channel not found'), { status: 404 });

  const users = await User.find({
    isApproved: true,
    phoneNumber: { $exists: true, $ne: '' },
  }).select('_id firstName lastName role memberStatus phoneNumber');

  const ids = resolveEffectiveMembers(channel, users);
  const deduped = new Set(ids);
  const recipients = users.filter(u => deduped.has(String(u._id))).map(toRecipient);
  return { recipients, counts: { total: recipients.length, deduped: recipients.length } };
}

async function resolveRoleStatusRecipients({ includeRoles = [], includeMemberStatuses = [] }) {
  const roles = normalizeArray(includeRoles).filter(r => ROLE_ENUM.includes(r));
  const statuses = normalizeArray(includeMemberStatuses).filter(s => MEMBER_STATUS_ENUM.includes(s));
  if (roles.length === 0 && statuses.length === 0) {
    throw Object.assign(new Error('At least one role or status required'), { status: 400 });
  }

  const query = {
    isApproved: true,
    phoneNumber: { $exists: true, $ne: '' },
  };
  if (roles.length) query.role = { $in: roles };
  if (statuses.length) query.memberStatus = { $in: statuses };

  const users = await User.find(query).select('_id firstName lastName role memberStatus phoneNumber');
  const ids = dedupeIds(users.map(u => u._id));
  const idSet = new Set(ids.map(String));
  const recipients = users.filter(u => idSet.has(String(u._id))).map(toRecipient);
  return { recipients, counts: { total: users.length, deduped: recipients.length } };
}

async function resolveSpecificRecipients({ selectedUserIds = [] }) {
  const ids = dedupeIds(selectedUserIds);
  if (!ids.length) throw Object.assign(new Error('selectedUserIds required'), { status: 400 });

  const users = await User.find({
    _id: { $in: ids },
    isApproved: true,
    phoneNumber: { $exists: true, $ne: '' },
  }).select('_id firstName lastName role memberStatus phoneNumber');

  const idSet = new Set(ids.map(String));
  const recipients = users.filter(u => idSet.has(String(u._id))).map(toRecipient);
  return { recipients, counts: { total: users.length, deduped: recipients.length } };
}

async function resolveRecipients(params = {}) {
  const { audienceType } = params;
  if (!audienceType) throw Object.assign(new Error('audienceType required'), { status: 400 });

  if (audienceType === 'channel') {
    if (!params.channelSlug && !params.channelId) throw Object.assign(new Error('channelSlug or channelId required'), { status: 400 });
    return resolveChannelRecipients(params);
  }

  if (audienceType === 'roleStatus') {
    return resolveRoleStatusRecipients(params);
  }

  if (audienceType === 'specific') {
    return resolveSpecificRecipients(params);
  }

  throw Object.assign(new Error('Invalid audienceType'), { status: 400 });
}

async function resolveRecipientPhones(params = {}) {
  const result = await resolveRecipients(params);
  const ids = result.recipients.map(r => r.userId);
  const idSet = new Set(ids.map(String));
  const users = await User.find({
    _id: { $in: Array.from(idSet) },
    phoneNumber: { $exists: true, $ne: '' },
  }).select('_id phoneNumber');
  return users.map(u => ({ userId: u._id, phoneNumber: u.phoneNumber }));
}

module.exports = {
  resolveRecipients,
  resolveRecipientPhones,
};
