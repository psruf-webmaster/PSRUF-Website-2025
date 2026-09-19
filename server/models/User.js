const mongoose = require('mongoose');

const {
  MEMBER_STATUS_ENUM,
  SCHOLARSHIP_TIERS,
  DEFAULT_SCHOLARSHIP,
} = require('../constants/memberOptions');

const ROLE_ENUM = [
  'pending',
  'pnm',
  'candidate',
  'candOfficer',
  'member',
  'alumni',
  'officer',
  'exec',
  'webmaster',
  'webdev',
];

const PERMISSION_ENUM = [
  'sms.send',
];

const PositionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
    },
    exec: {
      type: String,
      default: null,
    },
    title: {
      type: String,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
  },
  { _id: false }
);

const FeedReadStateSchema = new mongoose.Schema(
  {
    lastReadAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,

  phoneNumber: String,
  phoneServiceProvider: String,

  personalEmail: {
    type: String,
    unique: true,
  },

  personalPassword: String,

  ufEmail: {
    type: String,
    unique: true,
  },

  birthday: Date,
  major: String,
  year: String,

  profilePicUrl: String,

  // False restricts a field in member profile cards and directory responses.
  privacy: {
    phoneNumber: { type: Boolean, default: false },
    personalEmail: { type: Boolean, default: false },
    ufEmail: { type: Boolean, default: true },
    major: { type: Boolean, default: true },
    year: { type: Boolean, default: true },
  },

  feedReadState: {
    type: Map,
    of: FeedReadStateSchema,
    default: () => ({}),
  },

  memberStatus: {
    type: [String],
    enum: MEMBER_STATUS_ENUM,
    default: ['active'],
  },

  scholarship: {
    type: Number,
    enum: SCHOLARSHIP_TIERS,
    default: DEFAULT_SCHOLARSHIP,
  },

  role: {
    type: [String],
    enum: ROLE_ENUM,
    default: ['pending'],
  },

  // ============================================================
  // CURRENT / ACTIVE POSITIONS
  // ============================================================
  positions: {
    type: [PositionSchema],
    default: [],
  },

  // ============================================================
  // DERIVED PERMISSIONS
  // ============================================================
  permissions: {
    type: [String],
    enum: PERMISSION_ENUM,
    default: [],
  },

  // ============================================================
  // APPROVAL LIFECYCLE
  // ============================================================
  isApproved: {
    type: Boolean,
    default: false,
  },

  approvalState: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },

  approvedAt: {
    type: Date,
  },

  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  rejectedAt: {
    type: Date,
  },

  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  rejectionReason: {
    type: String,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', userSchema);