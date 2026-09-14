const { sanitizeMemberStatuses } = require('../constants/memberOptions');

const BUILTIN_CHANNELS = [
  {
    name: 'Chapter Announcements',
    slug: 'chapterAnnouncements',
    includeRoles: ['member', 'officer', 'exec', 'webmaster', 'webdev'],
    includeMemberStatuses: ['active'],
  },
  {
    name: 'Penguin Parties',
    slug: 'penguinParties',
    includeRoles: [],
    includeMemberStatuses: [],
  },
  {
    name: 'Officer Feed',
    slug: 'officerFeed',
    includeRoles: ['officer', 'exec', 'webmaster', 'webdev', 'candOfficer'],
    includeMemberStatuses: [],
  },
  {
    name: 'Alumni Feed',
    slug: 'alumniFeed',
    includeRoles: ['member', 'alumni', 'officer', 'exec', 'webmaster', 'webdev'],
    includeMemberStatuses: [],
  },
];

function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getRoles(userLike) {
  return normalizeArray(userLike?.role);
}

function getStatuses(userLike) {
  return sanitizeMemberStatuses(userLike?.memberStatus);
}

function isApprovedUser(userLike) {
  return userLike?.isApproved === true;
}

function isBuiltinSlug(slug) {
  return BUILTIN_CHANNELS.some((channel) => channel.slug === String(slug || ''));
}

function builtinMembershipMatch(channelOrSlug, userLike) {
  const slug = typeof channelOrSlug === 'string'
    ? String(channelOrSlug || '')
    : String(channelOrSlug?.slug || '');
  const roles = getRoles(userLike);
  const statuses = getStatuses(userLike);

  if (!isApprovedUser(userLike)) return false;

  if (slug === 'chapterAnnouncements') {
    return statuses.includes('active')
      || statuses.includes('inactive')
      || statuses.includes('seniorStatus')
      || statuses.includes('earlyAlumni');
  }
  if (slug === 'alumniFeed') {
    return statuses.includes('active')
      || statuses.includes('inactive')
      || statuses.includes('seniorStatus')
      || statuses.includes('earlyAlumni')
      || statuses.includes('co-op');
  }
  if (slug === 'penguinParties') {
    return true;
  }
  if (slug === 'officerFeed') {
    return roles.some((role) => ['officer', 'exec', 'webmaster', 'webdev', 'candOfficer'].includes(role));
  }

  return null;
}

function matchesRuleAccess(channel, userLike) {
  if (!isApprovedUser(userLike)) return false;

  const roles = getRoles(userLike);
  const statuses = getStatuses(userLike);
  const roleHit = (channel.includeRoles || []).length === 0 || roles.some((role) => (channel.includeRoles || []).includes(role));
  const statusHit = (channel.includeMemberStatuses || []).length === 0 || statuses.some((status) => (channel.includeMemberStatuses || []).includes(status));

  return roleHit && statusHit;
}

function canUserAccessChannel(channel, userLike) {
  const builtinMatch = builtinMembershipMatch(channel, userLike);
  if (builtinMatch != null) return builtinMatch;

  const excludedIds = new Set((channel?.excludedMembers || []).map((id) => String(id)));
  if (excludedIds.has(String(userLike?._id || userLike?.id || ''))) {
    return false;
  }

  const manualIds = new Set((channel?.manualMembers || []).map((id) => String(id)));
  if (manualIds.has(String(userLike?._id || userLike?.id || ''))) {
    return isApprovedUser(userLike);
  }

  return matchesRuleAccess(channel, userLike);
}

function resolveEffectiveMembers(channel, users) {
  const manual = new Set((channel.manualMembers || []).map((id) => String(id)));
  const excluded = new Set((channel.excludedMembers || []).map((id) => String(id)));

  const fromRules = users
    .filter((user) => {
      const builtinMatch = builtinMembershipMatch(channel, user);
      if (builtinMatch != null) return builtinMatch;
      return matchesRuleAccess(channel, user);
    })
    .map((user) => String(user._id));

  const effective = new Set([...manual, ...fromRules]);
  excluded.forEach((id) => effective.delete(id));
  return [...effective];
}

module.exports = {
  BUILTIN_CHANNELS,
  canUserAccessChannel,
  builtinMembershipMatch,
  getRoles,
  getStatuses,
  isApprovedUser,
  isBuiltinSlug,
  normalizeArray,
  resolveEffectiveMembers,
};