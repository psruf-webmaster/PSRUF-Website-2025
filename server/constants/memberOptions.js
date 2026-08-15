const MEMBER_STATUS_ENUM = [
  'active',
  'inactive',
  'probation',
  'seniorStatus',
  'co-op',
  'dropped',
];

const SCHOLARSHIP_TIERS = [0, 25, 50, 75, 100];
const DEFAULT_SCHOLARSHIP = 0;

function sanitizeMemberStatuses(statuses) {
  const values = Array.isArray(statuses) ? statuses : (statuses ? [statuses] : []);
  return values.filter(status => MEMBER_STATUS_ENUM.includes(status));
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
  sanitizeMemberStatuses,
  isValidScholarshipTier,
  normalizeScholarship,
};