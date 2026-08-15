const { normalizeScholarship } = require('../constants/memberOptions');

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

function buildRequirements(catTotals = {}, scholarship) {
  const normalizedScholarship = normalizeScholarship(scholarship);
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
  };
}

module.exports = {
  POINT_CATEGORIES,
  BASE_MIN_PER_BUCKET,
  getMinPerCategoryForScholarship,
  buildRequirements,
};