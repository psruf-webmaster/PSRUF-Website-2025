const { normalizeScholarship, sanitizeMemberStatuses } = require('../constants/memberOptions');

const POINT_CATEGORIES = ['phi', 'sigma', 'rho', 'tau'];
const BASE_MIN_PER_BUCKET = 50;

function getMinPerCategoryForScholarship(scholarship) {
  const tier = normalizeScholarship(scholarship);
  return Math.ceil(BASE_MIN_PER_BUCKET * (1 + (tier / 100)));
}

function computeAny(catTotals, minPerCategory) {
  return POINT_CATEGORIES.reduce((sum, cat) => {
    return sum + Math.max(0, (catTotals[cat] || 0) - minPerCategory);
  }, 0);
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
    metAll: true,
    totalRequired: 0,
    rule: 'none',
  };
}

function buildAnywhereRequirement(catTotals = {}, scholarship, requiredTotal) {
  const normalizedScholarship = normalizeScholarship(scholarship);
  const totalHave = POINT_CATEGORIES.reduce((sum, cat) => sum + (catTotals[cat] || 0), 0);
  const buckets = {};

  POINT_CATEGORIES.forEach(cat => {
    const have = catTotals[cat] || 0;
    buckets[cat] = { have, need: 0, met: true };
  });

  const anyNeed = Math.max(0, requiredTotal - totalHave);

  return {
    scholarship: normalizedScholarship,
    minPerCategory: 0,
    buckets,
    any: { have: totalHave, need: anyNeed, met: anyNeed === 0 },
    metAll: anyNeed === 0,
    totalRequired: requiredTotal,
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
    return buildAnywhereRequirement(catTotals, normalizedScholarship, 50);
  }

  const minPerCategory = getMinPerCategoryForScholarship(normalizedScholarship);
  const buckets = {};

  POINT_CATEGORIES.forEach(cat => {
    const have = catTotals[cat] || 0;
    const need = Math.max(0, minPerCategory - have);
    buckets[cat] = { have, need, met: need === 0 };
  });

  const anyHave = computeAny(catTotals, minPerCategory);
  const anyNeed = Math.max(0, minPerCategory - anyHave);
  const metAll = POINT_CATEGORIES.every(cat => buckets[cat].met) && anyNeed === 0;

  return {
    scholarship: normalizedScholarship,
    minPerCategory,
    buckets,
    any: { have: anyHave, need: anyNeed, met: anyNeed === 0 },
    metAll,
    totalRequired: minPerCategory * (POINT_CATEGORIES.length + 1),
    rule: 'per-category',
  };
}

module.exports = {
  POINT_CATEGORIES,
  BASE_MIN_PER_BUCKET,
  getMinPerCategoryForScholarship,
  buildRequirements,
};