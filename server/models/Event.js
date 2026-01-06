const mongoose = require('mongoose');

const ROLE_ENUM = [
  'pending', 'pnm', 'candidate', 'candOfficer', 'member',
  'alumni', 'officer', 'exec', 'webmaster', 'webdev'
];

const MEMBER_STATUS_ENUM = [
  'active', 'inactive', 'probation', 'seniorStatus',
  'scholarship', 'co-op', 'dropped'
];

const POINT_CATEGORIES = ['phi', 'sigma', 'rho', 'tau'];

const VisibilitySchema = new mongoose.Schema({
  rolesAllowed: {
    type: [String],
    enum: ROLE_ENUM,
    default: []
  },
  memberStatusesAllowed: {
    type: [String],
    enum: MEMBER_STATUS_ENUM,
    default: undefined
  },
}, { _id: false });

const PointsSchema = new mongoose.Schema({
  category: { type: String, enum: POINT_CATEGORIES, required: true },
  defaultRatePerHour: { type: Number, default: 10 },
  overrideTotalPoints: { type: Number, default: undefined },
}, { _id: false });

const RsvpSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['going', 'maybe', 'notGoing'], required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const AttendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['present', 'absent', 'excused'], required: true },
  pointsAwarded: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  location: { type: String },
  capacityMax: { type: Number, default: undefined },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isPublished: { type: Boolean, default: true },
  coHosts: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
  visibility: { type: VisibilitySchema, default: {} },
  points: { type: PointsSchema, required: true },
  rsvps: { type: [RsvpSchema], default: [] },
  attendance: { type: [AttendanceSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
