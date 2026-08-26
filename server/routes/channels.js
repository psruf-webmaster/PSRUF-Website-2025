const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Channel = require('../models/Channel');
const User = require('../models/User');
const Post = require('../models/Post');
const { POSITIONS } = require('../constants/positions');
const { MEMBER_STATUS_ENUM } = require('../constants/memberOptions');
const { normalizeAssetUrl } = require('../utils/assetUrls');

const ROLE_ENUM = [
  'pending', 'pnm', 'candidate', 'candOfficer', 'member',
  'alumni', 'officer', 'exec', 'webmaster', 'webdev'
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

function getRoles(userLike) {
  return Array.isArray(userLike?.role) ? userLike.role : (userLike?.role ? [userLike.role] : []);
}

function getStatuses(userLike) {
  return Array.isArray(userLike?.memberStatus) ? userLike.memberStatus : (userLike?.memberStatus ? [userLike.memberStatus] : []);
}

function hasAnyRole(userLike, wanted) {
  const roles = getRoles(userLike).map(role => String(role).toLowerCase());
  return wanted.some(role => roles.includes(String(role).toLowerCase()));
}

function isApprovedUser(userLike) {
  return userLike?.isApproved === true;
}

function isBuiltinSlug(slug) {
  return ['chapterAnnouncements', 'penguinParties', 'officerFeed', 'alumniFeed'].includes(String(slug || ''));
}

function builtinMembershipMatch(channel, userLike) {
  const slug = String(channel?.slug || '');
  const roles = getRoles(userLike);
  const statuses = getStatuses(userLike);

  if (!isApprovedUser(userLike)) return false;

  if (slug === 'chapterAnnouncements') {
    return statuses.includes('active');
  }
  if (slug === 'alumniFeed') {
    return roles.some(role => ['member', 'alumni', 'officer', 'exec', 'webmaster', 'webdev'].includes(role));
  }
  if (slug === 'penguinParties') {
    return true;
  }
  if (slug === 'officerFeed') {
    return roles.some(role => ['officer', 'exec', 'webmaster', 'webdev', 'candOfficer'].includes(role));
  }

  return null;
}

async function ensureBuiltins() {
  const builtins = [
    {
      name: 'Chapter Announcements',
      slug: 'chapterAnnouncements',
      includeRoles: ['member', 'officer', 'exec', 'webmaster', 'webdev'],
      includeMemberStatuses: ['active'],
    },
    {
      name: 'Penguin Parties',
      slug: 'penguinParties',
      includeRoles: [],
      includeMemberStatuses: [],
    },
    {
      name: 'Officer Feed',
      slug: 'officerFeed',
      includeRoles: ['officer', 'exec', 'webmaster', 'webdev', 'candOfficer'],
      includeMemberStatuses: [],
    },
    {
      name: 'Alumni Feed',
      slug: 'alumniFeed',
      includeRoles: ['member', 'alumni', 'officer', 'exec', 'webmaster', 'webdev'],
      includeMemberStatuses: [],
    },
  ];
  for (const c of builtins) {
    await Channel.findOneAndUpdate(
      { slug: c.slug },
      {
        $set: {
          name: c.name,
          slug: c.slug,
          includeRoles: c.includeRoles,
          includeMemberStatuses: c.includeMemberStatuses,
        },
        $setOnInsert: { isArchived: false },
      },
      { upsert: true, new: true }
    );
  }
}

function resolveEffectiveMembers(channel, users) {
  const manual = new Set((channel.manualMembers || []).map(id => String(id)));
  const excluded = new Set((channel.excludedMembers || []).map(id => String(id)));

  const fromRules = users.filter(u => {
    const builtinMatch = builtinMembershipMatch(channel, u);
    if (builtinMatch != null) return builtinMatch;

    if (!isApprovedUser(u)) return false;

    const roles = getRoles(u);
    const statuses = getStatuses(u);
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
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const channels = await Channel.find({});
    const users = await User.find({ isApproved: true }).select('_id role memberStatus isApproved');
    const rows = await Promise.all(channels.map(async (c) => {
      const postCount = await Post.countDocuments({ feed: c.slug });
      const memberIds = resolveEffectiveMembers(c, users);
      const canView = isExec(user) || isWebTeam(user) || memberIds.includes(String(user._id));
      return {
        _id: c._id,
        name: c.name,
        slug: c.slug,
        isArchived: c.isArchived,
        createdByUserId: c.createdByUserId,
        manualMembers: c.manualMembers || [],
        excludedMembers: c.excludedMembers || [],
        includeRoles: c.includeRoles || [],
        includeMemberStatuses: c.includeMemberStatuses || [],
        manualCount: (c.manualMembers || []).length,
        memberCount: memberIds.length,
        postCount,
        hasPosts: postCount > 0,
        canView,
      };
    }));
    return res.json(rows.filter(row => row.canView || isExec(user) || isWebTeam(user)));
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
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'A channel with that slug already exists.' });
    }
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

      if (!user) {
        return res.status(401).json({ message: 'User required' });
      }

      const channel = await Channel.findById(req.params.id);

      if (!channel) {
        return res.status(404).json({ message: 'Not found' });
      }

      if (!canManageMembers(user, channel)) {
        return res.status(403).json({ message: 'Not allowed' });
      }

      const requestedRoles = normalizeArray(req.body?.includeRoles);
      const requestedStatuses = normalizeArray(req.body?.includeMemberStatuses);

      const invalidRoles = requestedRoles.filter(
        role => !ROLE_ENUM.includes(role)
      );

      const invalidStatuses = requestedStatuses.filter(
        status => !MEMBER_STATUS_ENUM.includes(status)
      );

      if (invalidRoles.length > 0 || invalidStatuses.length > 0) {
        return res.status(400).json({
          message: 'Invalid channel rules',
          invalidRoles,
          invalidStatuses,
          allowedRoles: ROLE_ENUM,
          allowedMemberStatuses: MEMBER_STATUS_ENUM,
        });
      }

      channel.includeRoles = requestedRoles;
      channel.includeMemberStatuses = requestedStatuses;

      await channel.save();

      return res.json({
        ...channel.toObject(),
        message: 'Rules updated successfully',
      });
    } catch (err) {
      console.error('channel rules error:', err);
      return res.status(500).json({
        message: 'Server error',
      });
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

    const users = await User.find({ isApproved: true }).select('_id firstName lastName role memberStatus isApproved profilePicUrl');
    const ids = resolveEffectiveMembers(channel, users);
    const members = users.filter(u => ids.includes(String(u._id))).map(u => ({
      _id: u._id,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      memberStatus: u.memberStatus,
      profilePicUrl: normalizeAssetUrl(u.profilePicUrl),
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
