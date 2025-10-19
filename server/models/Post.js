// server/models/Post.js
const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  text: String,
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const PostSchema = new mongoose.Schema({
  feed: { type: String, enum: ['chapterAnnouncements','penguinParties','officerFeed'], required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: String,
  authorRole: [String],
  content: { type: String, required: true },
  imageURL: String,
  sendTextBlast: { type: Boolean, default: false },
  blastAudience: {
    scope: { type: String, enum: ['ALL','GROUPS','INDIVIDUALS'], default: 'ALL' },
    groups: [String],
    userIds: [String],
  },
  createdAt: { type: Date, default: Date.now },
  comments: [CommentSchema],
});

module.exports = mongoose.model('Post', PostSchema);
