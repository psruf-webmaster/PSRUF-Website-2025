const mongoose = require('mongoose');

const ROLE_ENUM = [
  'pending', 'pnm', 'candidate', 'candOfficer', 'member',
  'alumni', 'officer', 'exec', 'webmaster', 'webdev'
];

const MEMBER_STATUS_ENUM = [
  'active', 'inactive', 'probation', 'seniorStatus',
  'scholarship', 'co-op', 'dropped'
];

const PERMISSION_ENUM = [
  'sms.send'
];

const PositionSchema = new mongoose.Schema({
  key: { type: String, required: true },  // e.g., 'WEBMASTER'
  exec: { type: String, default: null },  // e.g., 'VP_COMMUNICATIONS'
  title: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
}, { _id: false });

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  phoneNumber: String,
  phoneServiceProvider: String,

  personalEmail: { type: String, unique: true },
  personalPassword: String,

  ufEmail: { type: String, unique: true },
  birthday: Date,
  major: String,
  year: String,
  profilePicUrl: String,

  memberStatus: {
    type: [String],
    enum: MEMBER_STATUS_ENUM,
    default: ['active'],
  },

  role: {
    type: [String],
    enum: ROLE_ENUM,
    default: ['pending'],
  },

  // Active positions
  positions: [PositionSchema],

  // History of past positions (when removed, they are copied here with endDate)
  positionsHistory: [PositionSchema],

  // Log-style history: every change creates a snapshot
roleHistory: [{
  values: [String],        // e.g. ["member","officer"]
  at: { type: Date, default: Date.now },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // optional
}],

// Same for member status
memberStatusHistory: [{
  values: [String],        // e.g. ["active","probation"]
  at: { type: Date, default: Date.now },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}],


  // Derived permissions (e.g., VP Comms / Webmaster => sms.send)
  permissions: {
    type: [String],
    enum: PERMISSION_ENUM,
    default: []
  },

  // Approval lifecycle
  isApproved: { type: Boolean, default: false },
  approvalState: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedAt: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  rejectedAt: { type: Date },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: { type: String },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
