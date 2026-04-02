const mongoose = require('mongoose');

const ROLE_ENUM = [
  'pending', 'pnm', 'candidate', 'candOfficer', 'member',
  'alumni', 'officer', 'exec', 'webmaster', 'webdev'
];

const MEMBER_STATUS_ENUM = [
  'active', 'inactive', 'probation', 'seniorStatus',
  'scholarship', 'co-op', 'dropped'
];

const channelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isArchived: { type: Boolean, default: false },

  manualMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  excludedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  includeRoles: [{ type: String, enum: ROLE_ENUM }],
  includeMemberStatuses: [{ type: String, enum: MEMBER_STATUS_ENUM }],
}, { timestamps: true });

module.exports = mongoose.model('Channel', channelSchema);
