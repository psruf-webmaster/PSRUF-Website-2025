const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { sendApprovalEmail } = require('../utils/email');
const { POSITIONS, EXEC_POSITIONS, EXEC } = require('../constants/positions');

// TODO: replace with real auth (require webmaster/webdev)
const allowAllTemporarily = (req, res, next) => next();

const ALLOWED_ROLES = [
  'pending', 'pnm', 'candidate', 'candOfficer', 'member',
  'alumni', 'officer', 'exec', 'webmaster', 'webdev'
];
const ALLOWED_MEMBER_STATUS = [
  'active', 'inactive', 'probation', 'seniorStatus',
  'scholarship', 'co-op', 'dropped'
];

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
router.get('/pending', allowAllTemporarily, async (req, res) => {
  try {
    const pendingUsers = await User.find({ approvalState: 'pending' }).select('-personalPassword');
    res.json(pendingUsers);
  } catch (err) {
    console.error('Pending users error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/admin/users?state=pending|approved|rejected
 * List users by approval state (omit to list all)
 */
router.get('/users', allowAllTemporarily, async (req, res) => {
  try {
    const { state } = req.query;
    const q = state ? { approvalState: state } : {};
    const users = await User.find(q).select('-personalPassword');
    res.json(users);
  } catch (err) {
    console.error('Users list error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PATCH /api/admin/approve/:id
 * Body: { role?: string|string[], memberStatus?: string|string[], positions?: string|string[] }
 */
router.patch('/approve/:id', allowAllTemporarily, async (req, res) => {
  try {
    let { role, memberStatus, positions } = req.body;

    const roles = role == null ? undefined : (Array.isArray(role) ? role : [role]);
    const statuses = memberStatus == null ? undefined : (Array.isArray(memberStatus) ? memberStatus : [memberStatus]);
    const posKeys = positions == null ? undefined : (Array.isArray(positions) ? positions : [positions]);

    if (roles && !roles.every(r => ALLOWED_ROLES.includes(r))) {
      return res.status(400).json({ message: 'Invalid role(s).' });
    }
    if (statuses && !statuses.every(s => ALLOWED_MEMBER_STATUS.includes(s))) {
      return res.status(400).json({ message: 'Invalid memberStatus value(s).' });
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
    if (statuses) update.memberStatus = statuses;
    if (posObjects) update.positions = posObjects;

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

    res.json({ message: 'Approved', user });
  } catch (err) {
    console.error('Approve error:', err);
    res.status(400).json({ message: err.message || 'Server error' });
  }
});

/**
 * DELETE /api/admin/reject/:id?reason=...
 * Archive as rejected (do NOT delete)
 */
router.delete('/reject/:id', allowAllTemporarily, async (req, res) => {
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
router.patch('/users/:id/roles-status', allowAllTemporarily, async (req, res) => {
  try {
    let { role, memberStatus } = req.body;
    if (role && !Array.isArray(role)) role = [role];
    if (memberStatus && !Array.isArray(memberStatus)) memberStatus = [memberStatus];

    if (role && !role.every(r => ALLOWED_ROLES.includes(r))) {
      return res.status(400).json({ message: 'Invalid role(s).' });
    }
    if (memberStatus && !memberStatus.every(s => ALLOWED_MEMBER_STATUS.includes(s))) {
      return res.status(400).json({ message: 'Invalid memberStatus value(s).' });
    }

    const now = new Date();
    const updateOps = { $set: {}, $push: {} };

    if (role) {
      updateOps.$set.role = role;
      updateOps.$push.roleHistory = { values: role, at: now, by: null }; // add req.user?._id when auth lands
    }

    if (memberStatus) {
      updateOps.$set.memberStatus = memberStatus;
      updateOps.$push.memberStatusHistory = { values: memberStatus, at: now, by: null };
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

    res.json({ message: 'Updated', user });
  } catch (err) {
    console.error('roles-status update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});



/**
 * PATCH /api/admin/users/:id/positions
 * Body: { add?: string[], remove?: string[] }
 * Moves removed positions to positionsHistory with endDate.
 * Adds new positions with startDate = now.
 */
router.patch('/users/:id/positions', allowAllTemporarily, async (req, res) => {
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
router.get('/people', allowAllTemporarily, async (req, res) => {
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
