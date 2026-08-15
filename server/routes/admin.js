const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../models/User');
const { sendApprovalEmail } = require('../utils/email');
const { POSITIONS, EXEC_POSITIONS, EXEC } = require('../constants/positions');
const {
  MEMBER_STATUS_ENUM,
  sanitizeMemberStatuses,
  isValidScholarshipTier,
  normalizeScholarship,
} = require('../constants/memberOptions');

const ALLOWED_ROLES = [
  'pending', 'pnm', 'candidate', 'candOfficer', 'member',
  'alumni', 'officer', 'exec', 'webmaster', 'webdev'
];
const ALLOWED_MEMBER_STATUS = MEMBER_STATUS_ENUM;

const ADMIN_USERS_POSITION_KEYS = new Set([
  EXEC.PRESIDENT,
  EXEC.VP_STANDARDS,
  EXEC.VP_FINANCE,
  POSITIONS.WEBMASTER.key,
]);

async function getUser(req) {
  if (req.user) return req.user;
  const auth = req.header('authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    const id = auth.slice(7).trim();
    if (mongoose.Types.ObjectId.isValid(id)) {
      const user = await User.findById(id);
      if (user) return user;
    }
  }
  return null;
}

function canAccessAdminUsers(user) {
  if (!user) return false;
  const roles = Array.isArray(user.role) ? user.role : (user.role ? [user.role] : []);
  const positions = Array.isArray(user.positions) ? user.positions : [];
  if (roles.includes('webmaster')) return true;
  return positions.some(position => ADMIN_USERS_POSITION_KEYS.has(position?.key));
}

function canManageScholarship(user) {
  if (!user) return false;
  const positions = Array.isArray(user.positions) ? user.positions : [];
  return positions.some(position => position?.key === EXEC.VP_FINANCE);
}

function serializeAdminUser(user, viewer) {
  const source = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  const serialized = {
    ...source,
    memberStatus: sanitizeMemberStatuses(source.memberStatus),
  };

  if (canManageScholarship(viewer)) {
    serialized.scholarship = normalizeScholarship(source.scholarship);
  } else {
    delete serialized.scholarship;
  }

  return serialized;
}

async function requireAdminUsersAccess(req, res, next) {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });
    if (!canAccessAdminUsers(user)) {
      return res.status(403).json({ message: 'Not allowed to manage admin users' });
    }
    req.user = user;
    return next();
  } catch (err) {
    console.error('Admin access error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// derive permission flags based on roles/positions
function derivePermissions({ roles = [], positions = [] }) {
  const perms = new Set();

  // Webmaster can send texts
  if (roles.includes('webmaster')) perms.add('sms.send');

  // VP of Communications (exec or positions under that exec) can send texts
  const byKey = new Set(positions.map(p => p.key));
  const byExec = new Set(positions.map(p => p.exec));
  if (byKey.has(EXEC.VP_COMMUNICATIONS) || byExec.has(EXEC.VP_COMMUNICATIONS)) {
    perms.add('sms.send');
  }

  return Array.from(perms);
}

/**
 * GET /api/admin/pending
 * legacy convenience (same as /users?state=pending)
 */
router.get('/pending', requireAdminUsersAccess, async (req, res) => {
  try {
    const pendingUsers = await User.find({ approvalState: 'pending' }).select('-personalPassword');
    res.json(pendingUsers.map(current => serializeAdminUser(current, req.user)));
  } catch (err) {
    console.error('Pending users error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/admin/users?state=pending|approved|rejected
 * List users by approval state (omit to list all)
 */
router.get('/users', requireAdminUsersAccess, async (req, res) => {
  try {
    const { state } = req.query;
    const q = state ? { approvalState: state } : {};
    const users = await User.find(q).select('-personalPassword');
    res.json(users.map(current => serializeAdminUser(current, req.user)));
  } catch (err) {
    console.error('Users list error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PATCH /api/admin/approve/:id
 * Body: { role?: string|string[], memberStatus?: string|string[], positions?: string|string[] }
 */
router.patch('/approve/:id', requireAdminUsersAccess, async (req, res) => {
  try {
    let { role, memberStatus, positions, scholarship } = req.body;

    const roles = role == null ? undefined : (Array.isArray(role) ? role : [role]);
    const statuses = memberStatus == null ? undefined : (Array.isArray(memberStatus) ? memberStatus : [memberStatus]);
    const posKeys = positions == null ? undefined : (Array.isArray(positions) ? positions : [positions]);

    if (roles && !roles.every(r => ALLOWED_ROLES.includes(r))) {
      return res.status(400).json({ message: 'Invalid role(s).' });
    }
    if (statuses && !statuses.every(s => ALLOWED_MEMBER_STATUS.includes(s))) {
      return res.status(400).json({ message: 'Invalid memberStatus value(s).' });
    }
    if (scholarship != null && !canManageScholarship(req.user)) {
      return res.status(403).json({ message: 'Only VP Finance can manage scholarships.' });
    }
    if (scholarship != null && !isValidScholarshipTier(scholarship)) {
      return res.status(400).json({ message: 'Invalid scholarship tier.' });
    }

    // Expand position keys into objects
    let posObjects;
    if (posKeys) {
      const catalog = { ...POSITIONS, ...EXEC_POSITIONS };
      posObjects = posKeys.map(k => {
        const meta = catalog[k];
        if (!meta) throw new Error(`Unknown position key: ${k}`);
        return { key: meta.key, exec: meta.exec || null, title: meta.title, startDate: new Date() };
      });
    }

    const update = {
      isApproved: true,
      approvalState: 'approved',
      approvedAt: new Date(),
    };
    if (roles) update.role = roles;
    if (statuses) update.memberStatus = sanitizeMemberStatuses(statuses);
    if (posObjects) update.positions = posObjects;
    if (scholarship != null) update.scholarship = normalizeScholarship(scholarship);

    // compute permissions for storage
    const future = {
      roles: roles || [],
      positions: posObjects || [],
    };
    update.permissions = derivePermissions(future);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    ).select('-personalPassword');

    if (!user) return res.status(404).json({ message: 'User not found' });

    try {
      await sendApprovalEmail(user.personalEmail, user.firstName || 'there');
    } catch (e) {
      console.error('Approval email error:', e.message);
    }

    res.json({ message: 'Approved', user: serializeAdminUser(user, req.user) });
  } catch (err) {
    console.error('Approve error:', err);
    res.status(400).json({ message: err.message || 'Server error' });
  }
});

/**
 * DELETE /api/admin/reject/:id?reason=...
 * Archive as rejected (do NOT delete)
 */
router.delete('/reject/:id', requireAdminUsersAccess, async (req, res) => {
  try {
    const { reason } = req.query;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          isApproved: false,
          approvalState: 'rejected',
          rejectedAt: new Date(),
          rejectionReason: reason || null,
        }
      },
      { new: true }
    ).select('-personalPassword');

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User rejected', user });
  } catch (err) {
    console.error('Reject error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PATCH /api/admin/users/:id/roles-status
 * Body: { role?: string[], memberStatus?: string[] }
 * (For editing approved users later)
 */
router.patch('/users/:id/roles-status', requireAdminUsersAccess, async (req, res) => {
  try {
    let { role, memberStatus, scholarship } = req.body;
    if (role && !Array.isArray(role)) role = [role];
    if (memberStatus && !Array.isArray(memberStatus)) memberStatus = [memberStatus];

    if (role && !role.every(r => ALLOWED_ROLES.includes(r))) {
      return res.status(400).json({ message: 'Invalid role(s).' });
    }
    if (memberStatus && !memberStatus.every(s => ALLOWED_MEMBER_STATUS.includes(s))) {
      return res.status(400).json({ message: 'Invalid memberStatus value(s).' });
    }
    if (scholarship != null && !canManageScholarship(req.user)) {
      return res.status(403).json({ message: 'Only VP Finance can manage scholarships.' });
    }
    if (scholarship != null && !isValidScholarshipTier(scholarship)) {
      return res.status(400).json({ message: 'Invalid scholarship tier.' });
    }

    const now = new Date();
    const updateOps = { $set: {}, $push: {} };

    if (role) {
      updateOps.$set.role = role;
      updateOps.$push.roleHistory = { values: role, at: now, by: null }; // add req.user?._id when auth lands
    }

    if (memberStatus) {
      const sanitizedStatuses = sanitizeMemberStatuses(memberStatus);
      updateOps.$set.memberStatus = sanitizedStatuses;
      updateOps.$push.memberStatusHistory = { values: sanitizedStatuses, at: now, by: null };
    }

    if (scholarship != null) {
      updateOps.$set.scholarship = normalizeScholarship(scholarship);
    }

    // refresh permissions if roles changed
    if (role) {
      const current = await User.findById(req.params.id);
      const positions = current?.positions || [];
      updateOps.$set.permissions = derivePermissions({ roles: role, positions });
    }

    // prune empty operators (Mongo dislikes empty $push/$set)
    if (Object.keys(updateOps.$set).length === 0) delete updateOps.$set;
    if (Object.keys(updateOps.$push).length === 0) delete updateOps.$push;

    const user = await User.findByIdAndUpdate(req.params.id, updateOps, { new: true })
      .select('-personalPassword');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'Updated', user: serializeAdminUser(user, req.user) });
  } catch (err) {
    console.error('roles-status update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/users/:id/scholarship', requireAdminUsersAccess, async (req, res) => {
  try {
    const { scholarship } = req.body || {};

    if (!canManageScholarship(req.user)) {
      return res.status(403).json({ message: 'Only VP Finance can manage scholarships.' });
    }
    if (!isValidScholarshipTier(scholarship)) {
      return res.status(400).json({ message: 'Invalid scholarship tier.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { scholarship: normalizeScholarship(scholarship) } },
      { new: true }
    ).select('-personalPassword');

    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.json({
      message: 'Scholarship updated',
      user: serializeAdminUser(user, req.user),
    });
  } catch (err) {
    console.error('Scholarship update error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});



/**
 * PATCH /api/admin/users/:id/positions
 * Body: { add?: string[], remove?: string[] }
 * Moves removed positions to positionsHistory with endDate.
 * Adds new positions with startDate = now.
 */
router.patch('/users/:id/positions', requireAdminUsersAccess, async (req, res) => {
  try {
    const { add = [], remove = [] } = req.body; // arrays of keys
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const catalog = { ...POSITIONS, ...EXEC_POSITIONS };

    // remove -> move to history with endDate
    const remaining = [];
    (user.positions || []).forEach(p => {
      if (remove.includes(p.key)) {
        user.positionsHistory.push({ ...p.toObject(), endDate: new Date() });
      } else {
        remaining.push(p);
      }
    });
    user.positions = remaining;

    // add new
    add.forEach(k => {
      const meta = catalog[k];
      if (meta) {
        user.positions.push({
          key: meta.key,
          exec: meta.exec || null,
          title: meta.title,
          startDate: new Date(),
        });
      }
    });

    // refresh permissions
    user.permissions = derivePermissions({ roles: user.role || [], positions: user.positions || [] });

    await user.save();
    res.json({
      message: 'Positions updated',
      positions: user.positions,
      positionsHistory: user.positionsHistory
    });
  } catch (err) {
    console.error('Update positions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Helper: audience search for texting later
 * GET /api/admin/people?role=member&position=WEBMASTER
 */
router.get('/people', requireAdminUsersAccess, async (req, res) => {
  try {
    const { role, position } = req.query;
    const q = { approvalState: 'approved' };
    if (role) q.role = role;
    if (position) q['positions.key'] = position;
    const users = await User.find(q).select('firstName lastName personalEmail phoneNumber role positions permissions');
    res.json(users);
  } catch (err) {
    console.error('People query error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
