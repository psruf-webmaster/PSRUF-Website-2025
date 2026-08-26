const { normalizeScholarship, sanitizeMemberStatuses } = require('../constants/memberOptions');

const POINT_CATEGORIES = ['phi', 'sigma', 'rho', 'tau'];
const BASE_MIN_PER_BUCKET = 50;

/**
 * Returns the scholarship bucket point requirement for a given tier.
 */
function getScholarshipRequirement(tier) {
  const normalizedTier = normalizeScholarship(tier);
  switch (normalizedTier) {
    case 25: return 40;
    case 50: return 80;
    case 75: return 120;
    case 100: return 160;
    default: return normalizedTier || 0;
  }
}

/**
 * Calculates excess points across all categories above the base category minimum.
 */
function computeAny(catTotals = {}, minPerCategory = BASE_MIN_PER_BUCKET) {
  return POINT_CATEGORIES.reduce((sum, cat) => {
    return sum + Math.max(0, (catTotals[cat] || 0) - minPerCategory);
  }, 0);
}

/**
 * Calculates extra Rho and Sigma points above the base category minimum (50)
 * that flow into the scholarship bucket.
 */
function computeScholarshipExtra(catTotals = {}, minPerCategory = BASE_MIN_PER_BUCKET) {
  const extraRho = Math.max(0, (catTotals.rho || 0) - minPerCategory);
  const extraSigma = Math.max(0, (catTotals.sigma || 0) - minPerCategory);
  return extraRho + extraSigma;
}

function buildNoRequirement(catTotals = {}, scholarship) {
  const normalizedScholarship = normalizeScholarship(scholarship);
  const buckets = {};

  POINT_CATEGORIES.forEach(cat => {
    const have = catTotals[cat] || 0;
    buckets[cat] = { have, need: 0, met: true };
  });

  return {
    scholarship: normalizedScholarship,
    minPerCategory: 0,
    buckets,
    any: { have: 0, need: 0, met: true },
    scholarshipBucket: { required: 0, have: 0, need: 0, met: true },
    metAll: true,
    totalRequired: 0,
    rule: 'none',
  };
}

function buildAnywhereRequirement(catTotals = {}, scholarship, requiredTotal = BASE_MIN_PER_BUCKET) {
  const normalizedScholarship = normalizeScholarship(scholarship);
  const scholarshipRequired = getScholarshipRequirement(normalizedScholarship);
  const totalHave = POINT_CATEGORIES.reduce((sum, cat) => sum + (catTotals[cat] || 0), 0);
  const buckets = {};

  POINT_CATEGORIES.forEach(cat => {
    const have = catTotals[cat] || 0;
    buckets[cat] = { have, need: 0, met: true };
  });

  const anyNeed = Math.max(0, requiredTotal - totalHave);

  const scholarshipHave = computeScholarshipExtra(catTotals, BASE_MIN_PER_BUCKET);
  const scholarshipNeed = Math.max(0, scholarshipRequired - scholarshipHave);
  const scholarshipMet = scholarshipRequired === 0 || scholarshipNeed === 0;

  if (scholarshipRequired > 0) {
    buckets.scholarship = {
      have: scholarshipHave,
      need: scholarshipNeed,
      required: scholarshipRequired,
      met: scholarshipMet,
    };
  }

  return {
    scholarship: normalizedScholarship,
    minPerCategory: 0,
    buckets,
    any: { have: totalHave, need: anyNeed, met: anyNeed === 0 },
    scholarshipBucket: {
      required: scholarshipRequired,
      have: scholarshipHave,
      need: scholarshipNeed,
      met: scholarshipMet,
    },
    metAll: anyNeed === 0 && scholarshipMet,
    totalRequired: requiredTotal + scholarshipRequired,
    rule: 'anywhere',
  };
}

function buildRequirements(catTotals = {}, scholarship, memberStatus) {
  const normalizedScholarship = normalizeScholarship(scholarship);
  const statuses = sanitizeMemberStatuses(memberStatus);

  if (statuses.includes('co-op')) {
    return buildNoRequirement(catTotals, normalizedScholarship);
  }

  if (statuses.includes('inactive') || statuses.includes('seniorStatus') || statuses.includes('earlyAlumni')) {
    return buildAnywhereRequirement(catTotals, normalizedScholarship, BASE_MIN_PER_BUCKET);
  }

  const minPerCategory = BASE_MIN_PER_BUCKET;
  const scholarshipRequired = getScholarshipRequirement(normalizedScholarship);
  const buckets = {};

  POINT_CATEGORIES.forEach(cat => {
    const have = catTotals[cat] || 0;
    const need = Math.max(0, minPerCategory - have);
    buckets[cat] = { have, need, met: need === 0 };
  });

  const anyHave = computeAny(catTotals, minPerCategory);
  const anyNeed = Math.max(0, minPerCategory - anyHave);

  const scholarshipHave = computeScholarshipExtra(catTotals, minPerCategory);
  const scholarshipNeed = Math.max(0, scholarshipRequired - scholarshipHave);
  const scholarshipMet = scholarshipRequired === 0 || scholarshipNeed === 0;

  if (scholarshipRequired > 0) {
    buckets.scholarship = {
      have: scholarshipHave,
      need: scholarshipNeed,
      required: scholarshipRequired,
      met: scholarshipMet,
    };
  }

  const baseBucketsMet = POINT_CATEGORIES.every(cat => buckets[cat].met);
  const metAll = baseBucketsMet && anyNeed === 0 && scholarshipMet;

  return {
    scholarship: normalizedScholarship,
    minPerCategory,
    buckets,
    any: { have: anyHave, need: anyNeed, met: anyNeed === 0 },
    scholarshipBucket: {
      required: scholarshipRequired,
      have: scholarshipHave,
      need: scholarshipNeed,
      met: scholarshipMet,
    },
    metAll,
    totalRequired: minPerCategory * (POINT_CATEGORIES.length + 1) + scholarshipRequired,
    rule: 'per-category',
  };
}

module.exports = {
  POINT_CATEGORIES,
  BASE_MIN_PER_BUCKET,
  getScholarshipRequirement,
  getMinPerCategoryForScholarship: getScholarshipRequirement,
  buildRequirements,
};