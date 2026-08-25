const mongoose = require('mongoose');
const { MEMBER_STATUS_ENUM } = require('../constants/memberOptions');

const ROLE_ENUM = [
  'pending', 'pnm', 'candidate', 'candOfficer', 'member',
  'alumni', 'officer', 'exec', 'webmaster', 'webdev'
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

const AttachmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  mimeType: { type: String, default: '' },
  size: { type: Number, default: 0 },
}, { _id: false });

const ShiftSchema = new mongoose.Schema({
  shiftId: { type: String, required: true },
  label: { type: String, required: true },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  capacityMax: { type: Number, default: undefined },
}, { _id: false });

const RecurrenceSchema = new mongoose.Schema({
  frequency: {
    type: String,
    enum: ['none', 'daily', 'weekly', 'biweekly', 'monthly'],
    default: 'none',
  },
  endDate: { type: Date, default: undefined },
  seriesId: { type: String, default: undefined },
  generatedFromEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: undefined },
}, { _id: false });

const RsvpSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['going', 'maybe', 'notGoing'], required: true },
  shiftId: { type: String, default: undefined },
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
  imageUrl: { type: String, default: '' },
  attachments: { type: [AttachmentSchema], default: [] },
  isMandatory: { type: Boolean, default: false },
  shiftBasedRegistration: { type: Boolean, default: false },
  shifts: { type: [ShiftSchema], default: [] },
  recurrence: { type: RecurrenceSchema, default: () => ({ frequency: 'none' }) },
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
