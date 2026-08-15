const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const PointsLedger = require('../models/PointsLedger');
const User = require('../models/User');
const Event = require('../models/Event');
const { EXEC, POSITIONS } = require('../constants/positions');
const { buildRequirements } = require('../utils/pointRequirements');
const { sanitizeMemberStatuses } = require('../constants/memberOptions');

const OFFICER_ROLES = ['officer', 'exec', 'webmaster', 'webdev'];
const POINT_CATEGORIES = ['phi', 'sigma', 'rho', 'tau'];

const MANUAL_CATEGORY_BY_EXEC = {
  [EXEC.VP_SOCIAL]: 'phi',
  [EXEC.VP_SCHOLARSHIP]: 'sigma',
  [EXEC.VP_SERVICE]: 'rho',
  [EXEC.VP_FINANCE]: 'tau',
};

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

function isOfficer(user) {
  if (!user) return false;
  const roles = Array.isArray(user.role) ? user.role : (user.role ? [user.role] : []);
  return roles.some(r => OFFICER_ROLES.includes(r));
}

function getAllowedManualCategories(user) {
  if (!user) return [];

  const roles = Array.isArray(user.role) ? user.role : (user.role ? [user.role] : []);
  const positions = Array.isArray(user.positions) ? user.positions : [];
  const positionKeys = new Set(positions.map(position => position?.key).filter(Boolean));

  if (
    roles.includes('webmaster') ||
    positionKeys.has(POSITIONS.WEBMASTER.key) ||
    positionKeys.has(EXEC.PRESIDENT) ||
    positionKeys.has(EXEC.VP_STANDARDS)
  ) {
    return [...POINT_CATEGORIES];
  }

  const allowed = new Set();
  Object.entries(MANUAL_CATEGORY_BY_EXEC).forEach(([positionKey, category]) => {
    if (positionKeys.has(positionKey)) {
      allowed.add(category);
    }
  });

  return [...allowed];
}

function buildDateFilter(from, to) {
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) range.$lte = new Date(to);
  return Object.keys(range).length ? range : null;
}

// GET /api/ledger/summary
router.get('/summary', async (req, res) => {
  try {
    const user = await getUser(req);
    const requestedUserId = req.query.userId && mongoose.Types.ObjectId.isValid(req.query.userId)
      ? req.query.userId
      : null;
    const isSelf = requestedUserId && String(requestedUserId) === String(user?._id);
    if (!isOfficer(user) && !isSelf) return res.status(403).json({ message: 'Not allowed' });

    const match = {};
    if (req.query.category && POINT_CATEGORIES.includes(req.query.category)) {
      match.category = req.query.category;
    }
    if (requestedUserId) {
      match.user = new mongoose.Types.ObjectId(requestedUserId);
    }
    const dateFilter = buildDateFilter(req.query.from, req.query.to);
    if (dateFilter) match.createdAt = dateFilter;

    const pipeline = [
      { $match: match },
      { $group: { _id: { user: '$user', category: '$category' }, points: { $sum: '$points' } } },
      {
        $group: {
          _id: '$_id.user',
          totalsByCategory: { $push: { k: '$_id.category', v: '$points' } },
          grandTotal: { $sum: '$points' },
        }
      },
      {
        $project: {
          userId: '$_id',
          totalsByCategory: { $arrayToObject: '$totalsByCategory' },
          grandTotal: 1,
          _id: 0,
        }
      }
    ];

    const totals = await PointsLedger.aggregate(pipeline);
    const users = await User.find({ _id: { $in: totals.map(t => t.userId) } }).select('firstName lastName');
    const userMap = new Map(users.map(u => [String(u._id), u]));

    const result = totals.map(t => ({
      ...t,
      firstName: userMap.get(String(t.userId))?.firstName || '',
      lastName: userMap.get(String(t.userId))?.lastName || '',
    }));

    return res.json({ totals: result });
  } catch (err) {
    console.error('Ledger summary error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/ledger/summary/self
router.get('/summary/self', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const match = { user: user._id };
    if (req.query.category && POINT_CATEGORIES.includes(req.query.category)) {
      match.category = req.query.category;
    }
    const dateFilter = buildDateFilter(req.query.from, req.query.to);
    if (dateFilter) match.createdAt = dateFilter;

    const pipeline = [
      { $match: match },
      { $group: { _id: { user: '$user', category: '$category' }, points: { $sum: '$points' } } },
      {
        $group: {
          _id: '$_id.user',
          totalsByCategory: { $push: { k: '$_id.category', v: '$points' } },
          grandTotal: { $sum: '$points' },
        }
      },
      {
        $project: {
          userId: '$_id',
          totalsByCategory: { $arrayToObject: '$totalsByCategory' },
          grandTotal: 1,
          _id: 0,
        }
      }
    ];

    const totals = await PointsLedger.aggregate(pipeline);
    return res.json({ totals });
  } catch (err) {
    console.error('Ledger self summary error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/ledger
router.get('/', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!isOfficer(user)) return res.status(403).json({ message: 'Not allowed' });

    const match = {};
    if (req.query.userId && mongoose.Types.ObjectId.isValid(req.query.userId)) {
      match.user = new mongoose.Types.ObjectId(req.query.userId);
    }
    if (req.query.category && POINT_CATEGORIES.includes(req.query.category)) {
      match.category = req.query.category;
    }
    if (req.query.source && ['attendance', 'manual'].includes(req.query.source)) {
      match.source = req.query.source;
    }
    const dateFilter = buildDateFilter(req.query.from, req.query.to);
    if (dateFilter) match.createdAt = dateFilter;

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 25));
    const skip = (page - 1) * limit;

    const [items, count] = await Promise.all([
      PointsLedger.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'firstName lastName role')
        .populate('event', 'title startAt'),
      PointsLedger.countDocuments(match),
    ]);

    return res.json({
      page,
      limit,
      total: count,
      entries: items,
    });
  } catch (err) {
    console.error('Ledger list error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/ledger/entries/self
router.get('/entries/self', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const match = { user: user._id };
    if (req.query.category && POINT_CATEGORIES.includes(req.query.category)) {
      match.category = req.query.category;
    }
    if (req.query.source && ['attendance', 'manual'].includes(req.query.source)) {
      match.source = req.query.source;
    }
    const dateFilter = buildDateFilter(req.query.from, req.query.to);
    if (dateFilter) match.createdAt = dateFilter;
    if (req.query.q) {
      match.note = { $regex: req.query.q, $options: 'i' };
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 25));
    const skip = (page - 1) * limit;

    const [items, count] = await Promise.all([
      PointsLedger.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('event', 'title startAt'),
      PointsLedger.countDocuments(match),
    ]);

    const mapped = items.map(e => ({
      _id: e._id,
      createdAt: e.createdAt,
      category: e.category,
      points: e.points,
      source: e.source,
      eventTitle: e.event ? e.event.title : null,
      note: e.note,
    }));

    return res.json({
      page,
      limit,
      total: count,
      entries: mapped,
    });
  } catch (err) {
    console.error('Ledger self entries error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/ledger/overview (admin)
router.get('/overview', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });
    const roles = Array.isArray(user.role) ? user.role : (user.role ? [user.role] : []);
    const isAllowed = roles.some(role => ['exec', 'webmaster'].includes(role));
    if (!isAllowed) return res.status(403).json({ message: 'Not allowed' });

    const matchUsers = { isApproved: req.query.approved === 'false' ? undefined : true };
    if (req.query.memberStatus) {
      matchUsers.memberStatus = req.query.memberStatus;
    }
    if (req.query.q) {
      const regex = new RegExp(req.query.q, 'i');
      matchUsers.$or = [{ firstName: regex }, { lastName: regex }];
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 25));
    const skip = (page - 1) * limit;

    const users = await User.find(matchUsers)
      .select('firstName lastName memberStatus role scholarship')
      .skip(skip)
      .limit(limit);
    const userIds = users.map(u => u._id);

    const ledger = await PointsLedger.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: { user: '$user', category: '$category' }, points: { $sum: '$points' } } },
      {
        $group: {
          _id: '$_id.user',
          totalsByCategory: { $push: { k: '$_id.category', v: '$points' } },
          grandTotal: { $sum: '$points' },
        }
      },
      { $project: { userId: '$_id', totalsByCategory: { $arrayToObject: '$totalsByCategory' }, grandTotal: 1, _id: 0 } }
    ]);
    const ledgerMap = new Map(ledger.map(l => [String(l.userId), l]));

    const rows = users.map(u => {
      const l = ledgerMap.get(String(u._id)) || {};
      const cat = l.totalsByCategory || {};
      const reqs = buildRequirements(cat, u.scholarship);
      return {
        userId: u._id,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        memberStatus: sanitizeMemberStatuses(u.memberStatus),
        totals: {
          phi: cat.phi || 0,
          sigma: cat.sigma || 0,
          rho: cat.rho || 0,
          tau: cat.tau || 0,
          any: reqs.any.have,
          total: l.grandTotal || 0,
        },
        any: reqs.any,
        requirements: {
          buckets: reqs.buckets,
          metAll: reqs.metAll,
          minPerCategory: reqs.minPerCategory,
          totalRequired: reqs.totalRequired,
        },
      };
    });

    const totalCount = await User.countDocuments(matchUsers);

    return res.json({ page, limit, total: totalCount, rows });
  } catch (err) {
    console.error('Ledger overview error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/ledger/manual
router.post('/manual', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!isOfficer(user)) return res.status(403).json({ message: 'Not allowed' });

    const allowedCategories = getAllowedManualCategories(user);
    if (allowedCategories.length === 0) {
      return res.status(403).json({ message: 'You are not allowed to add manual point adjustments' });
    }

    const { userId, category, points, note } = req.body || {};
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'userId required' });
    }
    if (!POINT_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }
    if (!allowedCategories.includes(category)) {
      return res.status(403).json({ message: `You are not allowed to add ${String(category).toUpperCase()} points` });
    }
    if (points == null || Number(points) === 0 || Number.isNaN(Number(points))) {
      return res.status(400).json({ message: 'points must be a non-zero number' });
    }
    if (!note || !String(note).trim()) {
      return res.status(400).json({ message: 'note required' });
    }

    const entry = await PointsLedger.create({
      user: userId,
      category,
      points: Number(points),
      source: 'manual',
      note: String(note).trim(),
      createdBy: user._id,
    });

    return res.status(201).json(entry);
  } catch (err) {
    console.error('Ledger manual error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/ledger/manual/:id
router.delete('/manual/:id', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!isOfficer(user)) return res.status(403).json({ message: 'Not allowed' });

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const entry = await PointsLedger.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Not found' });
    if (entry.source !== 'manual') return res.status(400).json({ message: 'Only manual entries can be deleted' });

    return res.status(400).json({ message: 'Deletion disabled. Add a reversing manual entry instead.' });
  } catch (err) {
    console.error('Ledger delete error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
