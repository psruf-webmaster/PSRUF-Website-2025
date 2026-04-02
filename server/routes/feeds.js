// server/routes/feeds.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const User = require('../models/User');
const { sendSmsBlastToRecipients } = require('../services/smsBlast');
const { resolveRecipientPhones } = require('../services/audienceResolver');
const { canUserSendSms } = require('../utils/smsPermissions');
const Channel = require('../models/Channel');

const ALLOWED_FEEDS = ['chapterAnnouncements', 'penguinParties', 'officerFeed'];

function bad(res, code, message) {
  return res.status(code).json({ message });
}

// TEMP auth: infer user from header "x-user-id"
async function getUser(req) {
  const id = req.header('x-user-id');
  if (!id) return null;
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return await User.findById(id);
}

// Normalize role checks (supports string or array, mixed case)
function hasAnyRole(user, wanted) {
  if (!user) return false;
  const roles = Array.isArray(user.role)
    ? user.role
    : (user.role ? [user.role] : []);
  const lower = roles.map(r => String(r).toLowerCase());
  return wanted.some(w => lower.includes(w));
}

const CAN = {
  VIEW_FEED: (user, feed) => {
    if (feed === 'officerFeed') {
      return !!user && hasAnyRole(user, ['officer','exec','webmaster']);
    }
    // other feeds viewable by any logged-in user (adjust if needed)
    return !!user;
  },
  POST_CREATE: (user, feed) => {
    if (!user) return false;
    if (feed === 'penguinParties') return true;
    if (feed === 'officerFeed') return hasAnyRole(user, ['officer','exec','webmaster']);
    if (feed === 'chapterAnnouncements') return hasAnyRole(user, ['officer','exec','webmaster']);
    return false;
  },
  TEXTBLAST_SEND: (user) => Array.isArray(user?.permissions) && user.permissions.includes('sms.send'),
};

function normalizeAudienceType(rawAudienceType, rawScope) {
  if (rawAudienceType === 'channel' || rawAudienceType === 'roleStatus' || rawAudienceType === 'specific') {
    return rawAudienceType;
  }
  if (rawScope === 'specific' || rawScope === 'INDIVIDUALS') return 'specific';
  if (rawScope === 'GROUPS' || rawScope === 'ROLE_STATUS') return 'roleStatus';
  return 'channel';
}

function buildBlastAudience({ audienceType, channelSlug, includeRoles, includeMemberStatuses, selectedUserIds }) {
  if (audienceType === 'specific') {
    return {
      scope: 'INDIVIDUALS',
      userIds: Array.isArray(selectedUserIds) ? selectedUserIds : [],
    };
  }
  if (audienceType === 'roleStatus') {
    return {
      scope: 'ROLE_STATUS',
      includeRoles: Array.isArray(includeRoles) ? includeRoles : [],
      includeMemberStatuses: Array.isArray(includeMemberStatuses) ? includeMemberStatuses : [],
    };
  }
  return {
    scope: 'CHANNEL',
    channelSlug,
  };
}

// ---------- List posts (newest first) ----------
router.get('/:feed/posts', async (req, res) => {
  try {
    const user = await getUser(req);
    const { feed } = req.params;

    if (!ALLOWED_FEEDS.includes(feed)) return bad(res, 400, 'Unknown feed');
    if (!CAN.VIEW_FEED(user, feed)) return bad(res, 403, 'Not allowed to view this feed');

    const posts = await Post.find({ feed }).sort({ createdAt: -1 }).limit(100);
    return res.json(posts);
  } catch (e) {
    console.error('List posts error:', e);
    return bad(res, 500, `Server error: ${e.message}`);
  }
});

// ---------- Create post (optional text blast) ----------
router.post('/:feed/posts', async (req, res) => {
  try {
    const user = await getUser(req);
    const { feed } = req.params;
    const {
      content,
      imageURL,
      sendTextBlast,
      blastAudience,
      sendAsText,
      audienceType,
      selectedUserIds,
      channelSlug,
      includeRoles,
      includeMemberStatuses,
    } = req.body || {};

    if (!user) return bad(res, 401, 'No user (x-user-id missing or invalid)');
    if (!ALLOWED_FEEDS.includes(feed)) return bad(res, 400, 'Unknown feed');
    if (!CAN.POST_CREATE(user, feed)) return bad(res, 403, 'Not allowed to post to this feed');
    if (!content || !String(content).trim()) return bad(res, 400, 'Content is required');

    const channel = await Channel.findOne({ slug: feed });
    if (channel && channel.isArchived) return bad(res, 400, 'Channel is archived; posting is locked');

    const sendAsTextNormalized = sendAsText === true || sendTextBlast === true;
    const audienceTypeNormalized = normalizeAudienceType(audienceType, blastAudience?.scope);
    const channelSlugNormalized = channelSlug || feed;

    const validAudienceTypes = ['channel', 'roleStatus', 'specific'];
    if (sendAsTextNormalized === true && !validAudienceTypes.includes(audienceTypeNormalized)) {
      return bad(res, 400, 'Invalid audienceType');
    }

    const post = await Post.create({
      feed,
      authorId: user._id,
      authorName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      authorRole: Array.isArray(user.role) ? user.role : (user.role ? [user.role] : []),
      content: String(content).trim(),
      imageURL,
      sendTextBlast: sendAsTextNormalized,
      blastAudience: sendAsTextNormalized
        ? buildBlastAudience({
            audienceType: audienceTypeNormalized,
            channelSlug: channelSlugNormalized,
            includeRoles,
            includeMemberStatuses,
            selectedUserIds,
          })
        : undefined,
    });

    let smsResult;
    const shouldSendSms = sendAsTextNormalized === true;

    if (shouldSendSms) {
      if (!canUserSendSms(user)) {
        smsResult = { attempted: 0, sent: 0, failed: 0, failures: [], error: 'Not authorized to send SMS' };
      } else {
        try {
          const resolverInput = {
            audienceType: audienceTypeNormalized,
            channelSlug: audienceTypeNormalized === 'channel' ? channelSlugNormalized : undefined,
            channelId: req.body?.channelId,
            includeRoles,
            includeMemberStatuses,
            selectedUserIds,
          };
          const recipients = await resolveRecipientPhones(resolverInput);
          if (!recipients.length) {
            smsResult = { attempted: 0, sent: 0, failed: 0, failures: [] };
          } else {
            smsResult = await sendSmsBlastToRecipients({
              message: String(content).trim(),
              recipients,
            });
          }
        } catch (err) {
          const status = err.status || 500;
          if (status === 400 || status === 404) {
            return bad(res, status, err.message || 'Invalid SMS audience');
          }
          smsResult = { attempted: 0, sent: 0, failed: 0, failures: [{ userId: null, reason: err.message || 'sms failed' }] };
        }
      }
    }

    if (smsResult) {
      return res.status(201).json({ ...post.toObject(), sendAsText: sendAsTextNormalized, smsResult });
    }
    return res.status(201).json({ ...post.toObject(), sendAsText: sendAsTextNormalized });
  } catch (e) {
    console.error('Create post error:', e);
    return bad(res, 500, `Server error: ${e.message}`);
  }
});

// ---------- Comment on a post ----------
router.post('/posts/:id/comments', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return bad(res, 401, 'No user (x-user-id missing or invalid)');

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return bad(res, 400, 'Invalid post id');

    const post = await Post.findById(id);
    if (!post) return bad(res, 404, 'Post not found');
    if (!CAN.VIEW_FEED(user, post.feed)) return bad(res, 403, 'Not allowed to view this feed');

    const { text } = req.body || {};
    if (!text || !String(text).trim()) return bad(res, 400, 'Comment text required');

    post.comments.push({
      userId: user._id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      text: String(text).trim(),
    });
    await post.save();
    return res.json(post);
  } catch (e) {
    console.error('Add comment error:', e);
    return bad(res, 500, `Server error: ${e.message}`);
  }
});

module.exports = router;
