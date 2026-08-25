const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const PointsLedger = require('../models/PointsLedger');
const User = require('../models/User');
const { EXEC } = require('../constants/positions');
const { buildRequirements } = require('../utils/pointRequirements');
const { sanitizeMemberStatuses } = require('../constants/memberOptions');

async function getUser(req) {
  if (req.user) return req.user;
  const auth = req.header('authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    const id = auth.slice(7).trim();
    if (mongoose.Types.ObjectId.isValid(id)) {
      const u = await User.findById(id);
      if (u) return u;
    }
  }
  return null;
}

function isOverviewAllowed(user) {
  const positions = Array.isArray(user?.positions) ? user.positions : [];
  const positionKeys = new Set(positions.map(position => position?.key).filter(Boolean));
  return positionKeys.has(EXEC.PRESIDENT)
    || positionKeys.has(EXEC.VP_STANDARDS)
    || positionKeys.has(EXEC.VP_FINANCE);
}

// GET /api/requirements/active/self
router.get('/active/self', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const totalsAgg = await PointsLedger.aggregate([
      { $match: { user: user._id } },
      { $group: { _id: '$category', points: { $sum: '$points' } } }
    ]);
    const catTotals = {};
    totalsAgg.forEach(row => { catTotals[row._id] = row.points; });
    const total = Object.values(catTotals).reduce((a, b) => a + b, 0);
    const reqs = buildRequirements(catTotals, user.scholarship, user.memberStatus);

    return res.json({
      userId: user._id,
      totals: {
        phi: catTotals.phi || 0,
        sigma: catTotals.sigma || 0,
        rho: catTotals.rho || 0,
        tau: catTotals.tau || 0,
        total,
      },
      any: reqs.any,
      requirements: {
        minPerCategory: reqs.minPerCategory,
        buckets: reqs.buckets,
        metAll: reqs.metAll,
        totalRequired: reqs.totalRequired,
        rule: reqs.rule,
      }
    });
  } catch (err) {
    console.error('requirements self error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/requirements/active/overview
router.get('/active/overview', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });
    if (!isOverviewAllowed(user)) return res.status(403).json({ message: 'Not allowed' });

    const matchUsers = { isApproved: true };
    if (req.query.status) {
      matchUsers.memberStatus = req.query.status;
    }
    if (req.query.search) {
      const regex = new RegExp(req.query.search, 'i');
      matchUsers.$or = [{ firstName: regex }, { lastName: regex }];
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 25));
    const skip = (page - 1) * limit;

    const users = await User.find(matchUsers)
      .select('firstName lastName memberStatus role scholarship positions')
      .skip(skip)
      .limit(limit);
    const userIds = users.map(u => u._id);

    const ledger = await PointsLedger.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: { user: '$user', category: '$category' }, points: { $sum: '$points' } } },
      { $group: {
        _id: '$_id.user',
        totalsByCategory: { $push: { k: '$_id.category', v: '$points' } },
        grandTotal: { $sum: '$points' },
      }},
      { $project: { userId: '$_id', totalsByCategory: { $arrayToObject: '$totalsByCategory' }, grandTotal: 1, _id: 0 } }
    ]);
    const ledgerMap = new Map(ledger.map(l => [String(l.userId), l]));

    const rows = users.map(u => {
      const l = ledgerMap.get(String(u._id)) || {};
      const cat = l.totalsByCategory || {};
      const totals = {
        phi: cat.phi || 0,
        sigma: cat.sigma || 0,
        rho: cat.rho || 0,
        tau: cat.tau || 0,
        total: l.grandTotal || 0,
      };
      const reqs = buildRequirements(cat, u.scholarship, u.memberStatus);
      return {
        userId: u._id,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        memberStatus: sanitizeMemberStatuses(u.memberStatus),
        totals: { ...totals, any: reqs.any.have },
        any: reqs.any,
        requirements: {
          buckets: reqs.buckets,
          metAll: reqs.metAll,
          minPerCategory: reqs.minPerCategory,
          totalRequired: reqs.totalRequired,
          rule: reqs.rule,
        },
      };
    });

    const totalCount = await User.countDocuments(matchUsers);

    return res.json({ page, limit, total: totalCount, rows });
  } catch (err) {
    console.error('requirements overview error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
