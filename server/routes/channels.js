const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Channel = require('../models/Channel');
const User = require('../models/User');
const Post = require('../models/Post');
const { POSITIONS } = require('../constants/positions');

const ROLE_ENUM = [
  'pending', 'pnm', 'candidate', 'candOfficer', 'member',
  'alumni', 'officer', 'exec', 'webmaster', 'webdev'
];
const MEMBER_STATUS_ENUM = [
  'active', 'inactive', 'probation', 'seniorStatus',
  'scholarship', 'co-op', 'dropped'
];

function normalizeArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

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
  const xid = req.header('x-user-id');
  if (xid && mongoose.Types.ObjectId.isValid(xid)) {
    const u = await User.findById(xid);
    if (u) return u;
  }
  return null;
}

function hasPosition(user, key) {
  return Array.isArray(user?.positions)?.some(p => p?.key === key);
}

function isExec(user) {
  const roles = Array.isArray(user?.role) ? user.role : (user?.role ? [user.role] : []);
  return roles.includes('exec');
}

function isWebTeam(user) {
  const roles = Array.isArray(user?.role) ? user.role : (user?.role ? [user.role] : []);
  return roles.includes('webmaster') || roles.includes('webdev');
}

function canCreate(user) {
  return isExec(user) || isWebTeam(user);
}

function canManageMembers(user, channel) {
  if (isExec(user) || isWebTeam(user)) return true;
  const isCandidateChannel = channel.slug?.startsWith('candidates-');
  if (isCandidateChannel && hasPosition(user, POSITIONS.MEM_ED.key)) return true;
  return false;
}

function canArchive(user, channel) {
  if (isWebTeam(user)) return true;
  if (isExec(user) && String(channel.createdByUserId || '') === String(user?._id || '')) return true;
  const isCandidateChannel = channel.slug?.startsWith('candidates-');
  if (isCandidateChannel && hasPosition(user, POSITIONS.MEM_ED.key)) return true;
  return false;
}

function canDelete(user, channel) {
  if (isWebTeam(user)) return true;
  if (isExec(user) && String(channel.createdByUserId || '') === String(user?._id || '')) return true;
  return false;
}

async function ensureBuiltins() {
  const builtins = [
    { name: 'Chapter Announcements', slug: 'chapterAnnouncements', includeRoles: ['member','officer','exec','webmaster','webdev'] },
    { name: 'Penguin Parties', slug: 'penguinParties', includeRoles: ['member','officer','exec','webmaster','webdev','alumni'] },
    { name: 'Officer Feed', slug: 'officerFeed', includeRoles: ['officer','exec','webmaster','webdev','candOfficer'] },
  ];
  for (const c of builtins) {
    await Channel.findOneAndUpdate(
      { slug: c.slug },
      { $setOnInsert: { name: c.name, slug: c.slug, includeRoles: c.includeRoles, isArchived: false } },
      { upsert: true, new: true }
    );
  }
}

function resolveEffectiveMembers(channel, users) {
  const manual = new Set((channel.manualMembers || []).map(id => String(id)));
  const excluded = new Set((channel.excludedMembers || []).map(id => String(id)));

  const fromRules = users.filter(u => {
    const roles = Array.isArray(u.role) ? u.role : (u.role ? [u.role] : []);
    const statuses = Array.isArray(u.memberStatus) ? u.memberStatus : (u.memberStatus ? [u.memberStatus] : []);
    const roleHit = (channel.includeRoles || []).length === 0 || roles.some(r => (channel.includeRoles || []).includes(r));
    const statusHit = (channel.includeMemberStatuses || []).length === 0 || statuses.some(s => (channel.includeMemberStatuses || []).includes(s));
    return roleHit && statusHit;
  }).map(u => String(u._id));

  const effective = new Set([...manual, ...fromRules]);
  excluded.forEach(id => effective.delete(id));
  return [...effective];
}

// List channels
router.get('/', async (req, res) => {
  try {
    await ensureBuiltins();
    const channels = await Channel.find({});
    const rows = await Promise.all(channels.map(async (c) => {
      const postCount = await Post.countDocuments({ feed: c.slug });
      return {
      _id: c._id,
      name: c.name,
      slug: c.slug,
      isArchived: c.isArchived,
      createdByUserId: c.createdByUserId,
      manualCount: (c.manualMembers || []).length,
      postCount,
      hasPosts: postCount > 0,
      };
    }));
    return res.json(rows);
  } catch (err) {
    console.error('channels list error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Create channel
router.post('/', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });
    if (!canCreate(user)) return res.status(403).json({ message: 'Not allowed' });

    const { name, slug, includeRoles, includeMemberStatuses } = req.body || {};
    if (!name || !slug) return res.status(400).json({ message: 'name and slug required' });

    await ensureBuiltins();

    const channel = await Channel.create({
      name,
      slug,
      createdByUserId: user._id,
      includeRoles: normalizeArray(includeRoles).filter(r => ROLE_ENUM.includes(r)),
      includeMemberStatuses: normalizeArray(includeMemberStatuses).filter(s => MEMBER_STATUS_ENUM.includes(s)),
    });
    return res.status(201).json(channel);
  } catch (err) {
    console.error('channel create error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Archive / unarchive
router.patch('/:id/archive', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ message: 'Not found' });
    if (!canArchive(user, channel)) return res.status(403).json({ message: 'Not allowed' });

    const { isArchived } = req.body || {};
    channel.isArchived = !!isArchived;
    await channel.save();
    return res.json(channel);
  } catch (err) {
    console.error('channel archive error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Update rules (includeRoles/memberStatuses)
router.patch('/:id/rules', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ message: 'Not found' });
    if (!canManageMembers(user, channel)) return res.status(403).json({ message: 'Not allowed' });

    const includeRoles = normalizeArray(req.body?.includeRoles).filter(r => ROLE_ENUM.includes(r));
    const includeMemberStatuses = normalizeArray(req.body?.includeMemberStatuses).filter(s => MEMBER_STATUS_ENUM.includes(s));

    channel.includeRoles = includeRoles;
    channel.includeMemberStatuses = includeMemberStatuses;
    await channel.save();
    return res.json(channel);
  } catch (err) {
    console.error('channel rules error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Add/remove manual members
router.post('/:id/manual-members', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ message: 'Not found' });
    if (!canManageMembers(user, channel)) return res.status(403).json({ message: 'Not allowed' });

    const add = normalizeArray(req.body?.add).filter(id => mongoose.Types.ObjectId.isValid(id));
    const remove = normalizeArray(req.body?.remove).filter(id => mongoose.Types.ObjectId.isValid(id));
    const set = new Set((channel.manualMembers || []).map(id => String(id)));
    add.forEach(id => set.add(String(id)));
    remove.forEach(id => set.delete(String(id)));
    channel.manualMembers = Array.from(set);
    await channel.save();
    return res.json({ manualMembers: channel.manualMembers });
  } catch (err) {
    console.error('channel manual members error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Add/remove excluded members
router.post('/:id/excluded-members', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ message: 'Not found' });
    if (!canManageMembers(user, channel)) return res.status(403).json({ message: 'Not allowed' });

    const add = normalizeArray(req.body?.add).filter(id => mongoose.Types.ObjectId.isValid(id));
    const remove = normalizeArray(req.body?.remove).filter(id => mongoose.Types.ObjectId.isValid(id));
    const set = new Set((channel.excludedMembers || []).map(id => String(id)));
    add.forEach(id => set.add(String(id)));
    remove.forEach(id => set.delete(String(id)));
    channel.excludedMembers = Array.from(set);
    await channel.save();
    return res.json({ excludedMembers: channel.excludedMembers });
  } catch (err) {
    console.error('channel excluded members error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Members list (effective)
router.get('/:id/members', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ message: 'Not found' });

    const users = await User.find({}).select('_id firstName lastName role memberStatus');
    const ids = resolveEffectiveMembers(channel, users);
    const members = users.filter(u => ids.includes(String(u._id))).map(u => ({
      _id: u._id,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      memberStatus: u.memberStatus,
    }));
    return res.json(members);
  } catch (err) {
    console.error('channel members error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Delete channel (with optional safety)
router.delete('/:id', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ message: 'Not found' });
    if (!canDelete(user, channel)) return res.status(403).json({ message: 'Not allowed' });

    const postCount = await Post.countDocuments({ feed: channel.slug });
    if (postCount > 0 && !isWebTeam(user)) {
      return res.status(409).json({ message: 'Channel has posts; archive instead.' });
    }

    await Channel.deleteOne({ _id: channel._id });
    return res.json({
      message: 'Deleted',
      ...(postCount > 0 ? { warning: 'This removed the channel; existing posts for this feed slug may become orphaned unless handled.' } : {}),
    });
  } catch (err) {
    console.error('channel delete error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
