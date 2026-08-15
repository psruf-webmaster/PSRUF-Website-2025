// server/models/Post.js
const mongoose = require('mongoose');

const ReactionSchema = new mongoose.Schema({
  emoji: String,
  count: { type: Number, default: 0 },
}, { _id: false });

const ReplySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  avatarUrl: String,
  text: String,
  replyToId: { type: mongoose.Schema.Types.ObjectId, default: null },
  replyToName: { type: String, default: '' },
  reactions: { type: [ReactionSchema], default: [] },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const CommentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  avatarUrl: String,
  text: String,
  reactions: { type: [ReactionSchema], default: [] },
  replies: { type: [ReplySchema], default: [] },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const AttachmentItemSchema = new mongoose.Schema({
  id: String,
  name: String,
  type: String,
  url: String,
}, { _id: false });

const PostSchema = new mongoose.Schema({
  feed: { type: String, required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: String,
  authorAvatar: String,
  authorRole: [String],
  content: { type: String, default: '' },
  imageURL: String,
  attachments: { type: [AttachmentItemSchema], default: [] },
  sendTextBlast: { type: Boolean, default: false },
  blastAudience: {
    scope: { type: String, enum: ['ALL','GROUPS','INDIVIDUALS','CHANNEL','ROLE_STATUS'], default: 'ALL' },
    channelSlug: String,
    includeRoles: [String],
    includeMemberStatuses: [String],
    groups: [String],
    userIds: [String],
  },
  createdAt: { type: Date, default: Date.now },
  comments: [CommentSchema],
});

module.exports = mongoose.model('Post', PostSchema);
