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
const { upload, getCloudinaryFileUrl } = require('../utils/cloudinaryConfig');

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

function getRoles(userLike) {
  return Array.isArray(userLike?.role) ? userLike.role : (userLike?.role ? [userLike.role] : []);
}

function getStatuses(userLike) {
  return Array.isArray(userLike?.memberStatus) ? userLike.memberStatus : (userLike?.memberStatus ? [userLike.memberStatus] : []);
}

function isApprovedUser(userLike) {
  return userLike?.isApproved === true;
}

function builtinMembershipMatch(feed, userLike) {
  const roles = getRoles(userLike);
  const statuses = getStatuses(userLike);

  if (!isApprovedUser(userLike)) return false;

  if (feed === 'chapterAnnouncements') return statuses.includes('active') || statuses.includes('inactive') || statuses.includes('seniorStatus') || statuses.includes('earlyAlumni');
  if (feed === 'alumniFeed') return statuses.includes('active') || statuses.includes('inactive') || statuses.includes('seniorStatus') || statuses.includes('earlyAlumni') || statuses.includes('co-op');
  if (feed === 'penguinParties') return true;
  if (feed === 'officerFeed') return roles.some(role => ['officer', 'exec', 'webmaster', 'web,dev', 'candOfficer'].includes(role));
  return null;
}

async function findChannelByFeed(feed) {
  return Channel.findOne({ slug: feed });
}

async function canUserViewFeed(user, feed) {
  if (!user) return false;

  const builtinMatch = builtinMembershipMatch(feed, user);
  if (builtinMatch != null) return builtinMatch;

  const channel = await findChannelByFeed(feed);
  if (!channel) return false;
  if (hasAnyRole(user, ['exec', 'webmaster', 'webdev'])) return true;

  const roles = getRoles(user);
  const statuses = getStatuses(user);
  const manualIds = new Set((channel.manualMembers || []).map(id => String(id)));
  const excludedIds = new Set((channel.excludedMembers || []).map(id => String(id)));
  const isManual = manualIds.has(String(user._id || ''));
  const roleHit = (channel.includeRoles || []).length === 0 || roles.some(role => (channel.includeRoles || []).includes(role));
  const statusHit = (channel.includeMemberStatuses || []).length === 0 || statuses.some(status => (channel.includeMemberStatuses || []).includes(status));
  const allowed = isApprovedUser(user) && (isManual || (roleHit && statusHit));
  return allowed && !excludedIds.has(String(user._id || ''));
}

async function canUserPostToFeed(user, feed) {
  if (!user) return false;
  if (feed === 'chapterAnnouncements') return hasAnyRole(user, ['officer', 'exec', 'webmaster']);
  return canUserViewFeed(user, feed);
}

const CAN = {
  VIEW_FEED: canUserViewFeed,
  POST_CREATE: canUserPostToFeed,
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

function parseJsonField(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (_err) {
      return fallback;
    }
  }
  return value;
}

function normalizeAttachmentItem(item) {
  if (!item) return null;
  if (typeof item === 'string') {
    const parsed = parseJsonField(item, null);
    if (parsed && parsed !== item) return normalizeAttachmentItem(parsed);
    return null;
  }
  const url = item.url || item.src || item.link || '';
  if (!url) return null;
  return {
    id: item.id || item._id || `${Date.now()}-${Math.random()}`,
    name: item.name || 'Attachment',
    type: item.type || 'file',
    url,
  };
}

function coerceBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
}

function canModifyPost(user, post) {
  if (!user || !post) return false;
  return String(post.authorId || '') === String(user._id || '');
}

function canModifyComment(user, comment) {
  if (!user || !comment) return false;
  return String(comment.userId || '') === String(user._id || '');
}

function canUserSeePost(user, post) {
  if (!user || !post) return false;
  if (String(post.authorId || '') === String(user._id || '')) return true;
  if (!post.sendTextBlast || !post.blastAudience?.scope) return true;

  const scope = String(post.blastAudience.scope || 'ALL').toUpperCase();
  if (scope === 'ALL' || scope === 'CHANNEL') return true;

  const roles = Array.isArray(user.role) ? user.role : (user.role ? [user.role] : []);
  const statuses = Array.isArray(user.memberStatus) ? user.memberStatus : (user.memberStatus ? [user.memberStatus] : []);

  if (scope === 'ROLE_STATUS' || scope === 'GROUPS') {
    const targetRoles = Array.isArray(post.blastAudience.includeRoles) ? post.blastAudience.includeRoles : [];
    const targetStatuses = Array.isArray(post.blastAudience.includeMemberStatuses) ? post.blastAudience.includeMemberStatuses : [];
    const roleHit = targetRoles.length > 0 && roles.some(role => targetRoles.includes(role));
    const statusHit = targetStatuses.length > 0 && statuses.some(status => targetStatuses.includes(status));
    return roleHit || statusHit;
  }

  if (scope === 'INDIVIDUALS') {
    const targetUsers = Array.isArray(post.blastAudience.userIds) ? post.blastAudience.userIds.map(String) : [];
    return targetUsers.includes(String(user._id || ''));
  }

  return true;
}

function currentUserView(userLike) {
  if (!userLike) return null;
  return {
    _id: userLike._id,
    firstName: userLike.firstName || '',
    lastName: userLike.lastName || '',
    profilePicUrl: userLike.profilePicUrl || '',
    role: Array.isArray(userLike.role) ? userLike.role : (userLike.role ? [userLike.role] : []),
  };
}

function hydrateEntryWithCurrentProfile(entry, usersById) {
  if (!entry) return entry;
  const currentUser = usersById.get(String(entry.userId || ''));
  if (!currentUser) return entry;
  return {
    ...entry,
    avatarUrl: currentUser.profilePicUrl || '',
    user: currentUserView(currentUser),
  };
}

function hydratePostWithCurrentProfiles(postDoc, usersById) {
  const post = typeof postDoc?.toObject === 'function' ? postDoc.toObject() : { ...postDoc };
  const currentAuthor = usersById.get(String(post.authorId || ''));

  if (currentAuthor) {
    post.authorAvatar = currentAuthor.profilePicUrl || '';
    post.author = currentUserView(currentAuthor);
  }

  post.comments = (Array.isArray(post.comments) ? post.comments : []).map(comment => {
    const nextComment = hydrateEntryWithCurrentProfile(comment, usersById);
    nextComment.replies = (Array.isArray(comment?.replies) ? comment.replies : []).map(reply => hydrateEntryWithCurrentProfile(reply, usersById));
    return nextComment;
  });

  return post;
}

// ---------- List posts (newest first) ----------
router.get('/:feed/posts', async (req, res) => {
  try {
    const user = await getUser(req);
    const { feed } = req.params;

    if (!await findChannelByFeed(feed) && builtinMembershipMatch(feed, user) == null) return bad(res, 400, 'Unknown feed');
    if (!await CAN.VIEW_FEED(user, feed)) return bad(res, 403, 'Not allowed to view this feed');

    const posts = await Post.find({ feed }).sort({ createdAt: 1 }).limit(100);
    const visiblePosts = posts.filter(post => canUserSeePost(user, post));

    const authorIds = new Set();
    visiblePosts.forEach(post => {
      if (post.authorId) authorIds.add(String(post.authorId));
      (Array.isArray(post.comments) ? post.comments : []).forEach(comment => {
        if (comment.userId) authorIds.add(String(comment.userId));
        (Array.isArray(comment.replies) ? comment.replies : []).forEach(reply => {
          if (reply.userId) authorIds.add(String(reply.userId));
        });
      });
    });

    const users = authorIds.size
      ? await User.find({ _id: { $in: Array.from(authorIds) } }).select('firstName lastName profilePicUrl role')
      : [];
    const usersById = new Map(users.map(item => [String(item._id), item]));
    const hydratedPosts = visiblePosts.map(post => hydratePostWithCurrentProfiles(post, usersById));

    return res.json(hydratedPosts);
  } catch (e) {
    console.error('List posts error:', e);
    return bad(res, 500, `Server error: ${e.message}`);
  }
});

router.get('/:feed/read-state', async (req, res) => {
  try {
    const user = await getUser(req);
    const { feed } = req.params;

    if (!user) return bad(res, 401, 'No user (x-user-id missing or invalid)');
    if (!await findChannelByFeed(feed) && builtinMembershipMatch(feed, user) == null) return bad(res, 400, 'Unknown feed');
    if (!await CAN.VIEW_FEED(user, feed)) return bad(res, 403, 'Not allowed to view this feed');

    const readState = user.feedReadState?.get?.(feed) || user.feedReadState?.[feed] || null;
    return res.json({ lastReadAt: readState?.lastReadAt || null });
  } catch (e) {
    console.error('Read state error:', e);
    return bad(res, 500, `Server error: ${e.message}`);
  }
});

router.patch('/:feed/read-state', async (req, res) => {
  try {
    const user = await getUser(req);
    const { feed } = req.params;

    if (!user) return bad(res, 401, 'No user (x-user-id missing or invalid)');
    if (!await findChannelByFeed(feed) && builtinMembershipMatch(feed, user) == null) return bad(res, 400, 'Unknown feed');
    if (!await CAN.VIEW_FEED(user, feed)) return bad(res, 403, 'Not allowed to view this feed');

    const incomingValue = req.body?.lastReadAt;
    const nextDate = incomingValue ? new Date(incomingValue) : new Date();
    if (Number.isNaN(nextDate.getTime())) return bad(res, 400, 'Invalid lastReadAt');

    user.feedReadState.set(feed, { lastReadAt: nextDate });
    await user.save();

    return res.json({ ok: true, lastReadAt: nextDate });
  } catch (e) {
    console.error('Update read state error:', e);
    return bad(res, 500, `Server error: ${e.message}`);
  }
});

// ---------- Create post (optional text blast & Cloudinary uploads) ----------
router.post('/:feed/posts', upload.array('attachments', 10), async (req, res) => {
  try {
    const user = await getUser(req);
    const { feed } = req.params;
    const rawBody = req.body || {};
    const body = typeof rawBody === 'object' ? rawBody : {};
    const parsedAttachments = parseJsonField(body.attachments, []);
    const content = body.content ?? '';
    const imageURL = body.imageURL ?? '';
    const sendTextBlast = coerceBoolean(body.sendTextBlast, false);
    const blastAudience = parseJsonField(body.blastAudience, undefined);
    const sendAsText = coerceBoolean(body.sendAsText, false);
    const audienceType = body.audienceType;
    const selectedUserIds = parseJsonField(body.selectedUserIds, []);
    const channelSlug = body.channelSlug ?? feed;
    const includeRoles = parseJsonField(body.includeRoles, []);
    const includeMemberStatuses = parseJsonField(body.includeMemberStatuses, []);

    if (!user) return bad(res, 401, 'No user (x-user-id missing or invalid)');
    if (!await findChannelByFeed(feed) && builtinMembershipMatch(feed, user) == null) return bad(res, 400, 'Unknown feed');
    if (!await CAN.POST_CREATE(user, feed)) return bad(res, 403, 'Not allowed to post to this feed');
    if (!content || !String(content).trim()) {
      const uploadedCount = Array.isArray(req.files) ? req.files.length : 0;
      if (uploadedCount === 0) return bad(res, 400, 'Content is required');
    }

    const channel = await Channel.findOne({ slug: feed });
    if (channel && channel.isArchived) return bad(res, 400, 'Channel is archived; posting is locked');

    const uploadedFiles = Array.isArray(req.files) ? req.files : [];
    const generatedAttachments = uploadedFiles
      .map((file, index) => ({
        id: `${Date.now()}-${index}`,
        name: file.originalname,
        type: file.mimetype || 'application/octet-stream',
        url: getCloudinaryFileUrl(file),
      }))
      .filter(file => file.url);

    const existingAttachments = Array.isArray(parsedAttachments)
      ? parsedAttachments.flatMap(item => {
          if (Array.isArray(item)) return item;
          if (typeof item === 'string') {
            const parsed = parseJsonField(item, null);
            return Array.isArray(parsed) ? parsed : [parsed || item];
          }
          return [item];
        })
      : [];
    const finalAttachments = [...generatedAttachments, ...existingAttachments]
      .map(normalizeAttachmentItem)
      .filter(Boolean);

    const firstAttachment = finalAttachments[0]?.url || imageURL || '';

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
      authorAvatar: user.profilePicUrl || '',
      authorRole: Array.isArray(user.role) ? user.role : (user.role ? [user.role] : []),
      content: String(content || '').trim(),
      imageURL: firstAttachment,
      attachments: finalAttachments,
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
    if (!await CAN.VIEW_FEED(user, post.feed)) return bad(res, 403, 'Not allowed to view this feed');

    const { text } = req.body || {};
    if (!text || !String(text).trim()) return bad(res, 400, 'Comment text required');

    post.comments.push({
      userId: user._id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      avatarUrl: user.profilePicUrl || '',
      text: String(text).trim(),
    });
    await post.save();
    return res.json(post);
  } catch (e) {
    console.error('Add comment error:', e);
    return bad(res, 500, `Server error: ${e.message}`);
  }
});

router.post('/posts/:id/comments/:commentId/replies', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return bad(res, 401, 'No user (x-user-id missing or invalid)');

    const { id, commentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return bad(res, 400, 'Invalid post id');
    if (!mongoose.Types.ObjectId.isValid(commentId)) return bad(res, 400, 'Invalid comment id');

    const post = await Post.findById(id);
    if (!post) return bad(res, 404, 'Post not found');
    if (!await CAN.VIEW_FEED(user, post.feed)) return bad(res, 403, 'Not allowed to view this feed');

    const comment = post.comments.id(commentId);
    if (!comment) return bad(res, 404, 'Comment not found');

    const { text, replyToId, replyToName } = req.body || {};
    if (!text || !String(text).trim()) return bad(res, 400, 'Reply text required');

    comment.replies.push({
      userId: user._id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      avatarUrl: user.profilePicUrl || '',
      text: String(text).trim(),
      replyToId: mongoose.Types.ObjectId.isValid(replyToId) ? replyToId : null,
      replyToName: String(replyToName || '').trim(),
    });
    await post.save();
    return res.json(post);
  } catch (e) {
    console.error('Add reply error:', e);
    return bad(res, 500, `Server error: ${e.message}`);
  }
});

router.patch('/posts/:id/comments/:commentId', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return bad(res, 401, 'No user (x-user-id missing or invalid)');

    const { id, commentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return bad(res, 400, 'Invalid post id');
    if (!mongoose.Types.ObjectId.isValid(commentId)) return bad(res, 400, 'Invalid comment id');

    const post = await Post.findById(id);
    if (!post) return bad(res, 404, 'Post not found');
    if (!await CAN.VIEW_FEED(user, post.feed)) return bad(res, 403, 'Not allowed to view this feed');

    const comment = post.comments.id(commentId);
    if (!comment) return bad(res, 404, 'Comment not found');
    if (!canModifyComment(user, comment)) return bad(res, 403, 'You can only edit your own comments'); // Fixed error message mismatch

    const nextText = String(req.body?.text || '').trim();
    if (!nextText) return bad(res, 400, 'Comment text required'); // Fixed error message mismatch

    comment.text = nextText;
    await post.save();
    return res.json(post);
  } catch (e) {
    console.error('Edit comment error:', e);
    return bad(res, 500, `Server error: ${e.message}`);
  }
});

router.delete('/posts/:id/comments/:commentId', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return bad(res, 401, 'No user (x-user-id missing or invalid)');

    const { id, commentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return bad(res, 400, 'Invalid post id');
    if (!mongoose.Types.ObjectId.isValid(commentId)) return bad(res, 400, 'Invalid comment id');

    const post = await Post.findById(id);
    if (!post) return bad(res, 404, 'Post not found');
    if (!await CAN.VIEW_FEED(user, post.feed)) return bad(res, 403, 'Not allowed to view this feed');

    const comment = post.comments.id(commentId);
    if (!comment) return bad(res, 404, 'Comment not found');
    if (!canModifyComment(user, comment)) return bad(res, 403, 'You can only delete your own comments'); // Fixed error message mismatch

    post.comments.pull(commentId);
    await post.save();
    return res.json(post);
  } catch (e) {
    console.error('Delete comment error:', e);
    return bad(res, 500, `Server error: ${e.message}`);
  }
});

router.patch('/posts/:id/comments/:commentId/replies/:replyId', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return bad(res, 401, 'No user (x-user-id missing or invalid)');

    const { id, commentId, replyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return bad(res, 400, 'Invalid post id');
    if (!mongoose.Types.ObjectId.isValid(commentId)) return bad(res, 400, 'Invalid comment id');
    if (!mongoose.Types.ObjectId.isValid(replyId)) return bad(res, 400, 'Invalid reply id');

    const post = await Post.findById(id);
    if (!post) return bad(res, 404, 'Post not found');
    if (!await CAN.VIEW_FEED(user, post.feed)) return bad(res, 403, 'Not allowed to view this feed');

    const comment = post.comments.id(commentId);
    if (!comment) return bad(res, 404, 'Comment not found');
    const reply = comment.replies.id(replyId);
    if (!reply) return bad(res, 404, 'Reply not found');
    if (!canModifyComment(user, reply)) return bad(res, 403, 'You can only edit your own replies');

    const nextText = String(req.body?.text || '').trim();
    if (!nextText) return bad(res, 400, 'Reply text required');

    reply.text = nextText;
    await post.save();
    return res.json(post);
  } catch (e) {
    console.error('Edit reply error:', e);
    return bad(res, 500, `Server error: ${e.message}`);
  }
});

router.delete('/posts/:id/comments/:commentId/replies/:replyId', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return bad(res, 401, 'No user (x-user-id missing or invalid)');

    const { id, commentId, replyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return bad(res, 400, 'Invalid post id');
    if (!mongoose.Types.ObjectId.isValid(commentId)) return bad(res, 400, 'Invalid comment id');
    if (!mongoose.Types.ObjectId.isValid(replyId)) return bad(res, 400, 'Invalid reply id');

    const post = await Post.findById(id);
    if (!post) return bad(res, 404, 'Post not found');
    if (!await CAN.VIEW_FEED(user, post.feed)) return bad(res, 403, 'Not allowed to view this feed');

    const comment = post.comments.id(commentId);
    if (!comment) return bad(res, 404, 'Comment not found');
    const reply = comment.replies.id(replyId);
    if (!reply) return bad(res, 404, 'Reply not found');
    if (!canModifyComment(user, reply)) return bad(res, 403, 'You can only delete your own replies');

    comment.replies.pull(replyId);
    await post.save();
    return res.json(post);
  } catch (e) {
    console.error('Delete reply error:', e);
    return bad(res, 500, `Server error: ${e.message}`);
  }
});

router.patch('/posts/:id', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return bad(res, 401, 'No user (x-user-id missing or invalid)');

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return bad(res, 400, 'Invalid post id');

    const post = await Post.findById(id);
    if (!post) return bad(res, 404, 'Post not found');
    if (!canModifyPost(user, post)) return bad(res, 403, 'You can only edit your own messages');

    const nextContent = String(req.body?.content || '').trim();
    if (!nextContent) return bad(res, 400, 'Message content required');

    post.content = nextContent;
    await post.save();
    return res.json(post);
  } catch (e) {
    console.error('Edit post error:', e);
    return bad(res, 500, `Server error: ${e.message}`);
  }
});

router.delete('/posts/:id', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return bad(res, 401, 'No user (x-user-id missing or invalid)');

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return bad(res, 400, 'Invalid post id');

    const post = await Post.findById(id);
    if (!post) return bad(res, 404, 'Post not found');
    if (!canModifyPost(user, post)) return bad(res, 403, 'You can only delete your own messages');

    await Post.deleteOne({ _id: post._id });
    return res.json({ ok: true, id: String(post._id) });
  } catch (e) {
    console.error('Delete post error:', e);
    return bad(res, 500, `Server error: ${e.message}`);
  }
});

module.exports = router;