const MEMBER_STATUS_ENUM = [
  'active',
  'inactive',
  'earlyAlumni',
  'seniorStatus',
  'co-op',
  'dropped',
];

const SCHOLARSHIP_TIERS = [0, 25, 50, 75, 100];
const DEFAULT_SCHOLARSHIP = 0;

const MEMBER_STATUS_ALIASES = {
  active: 'active',
  inactive: 'inactive',
  earlyalumni: 'earlyAlumni',
  senior: 'seniorStatus',
  seniorstatus: 'seniorStatus',
  coop: 'co-op',
  'co-op': 'co-op',
  dropped: 'dropped',
};

function normalizeMemberStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  const compact = normalized.replace(/[^a-z0-9]+/g, '');
  return MEMBER_STATUS_ALIASES[compact] || MEMBER_STATUS_ALIASES[normalized] || null;
}

function sanitizeMemberStatuses(statuses) {
  const values = Array.isArray(statuses) ? statuses : (statuses ? [statuses] : []);
  return [...new Set(values
    .map(normalizeMemberStatus)
    .filter(status => MEMBER_STATUS_ENUM.includes(status)))];
}

function isValidScholarshipTier(value) {
  return SCHOLARSHIP_TIERS.includes(Number(value));
}

function normalizeScholarship(value) {
  return isValidScholarshipTier(value) ? Number(value) : DEFAULT_SCHOLARSHIP;
}

module.exports = {
  MEMBER_STATUS_ENUM,
  SCHOLARSHIP_TIERS,
  DEFAULT_SCHOLARSHIP,
  normalizeMemberStatus,
  sanitizeMemberStatuses,
  isValidScholarshipTier,
  normalizeScholarship,
};