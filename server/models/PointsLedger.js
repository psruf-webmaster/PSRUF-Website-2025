const mongoose = require('mongoose');

const POINT_CATEGORIES = ['phi', 'sigma', 'rho', 'tau'];
const SOURCES = ['attendance', 'manual'];

const PointsLedgerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, enum: POINT_CATEGORIES, required: true },
  points: { type: Number, required: true }, // may be negative
  source: { type: String, enum: SOURCES, required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' }, // attendance-linked
  status: { type: String }, // attendance status
  note: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

PointsLedgerSchema.index({ user: 1, event: 1, source: 1 }, { unique: true, partialFilterExpression: { source: 'attendance' } });

module.exports = mongoose.model('PointsLedger', PointsLedgerSchema);
