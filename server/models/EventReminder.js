const mongoose = require('mongoose');

// Deterministic IDs make claiming a reminder atomic across processes/restarts.
const schema = new mongoose.Schema({
  _id: String,
  eventId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  startsAt: Date,
  offsetHours: Number,
  state: { type: String, enum: ['claimed', 'sent', 'failed', 'skipped'], default: 'claimed' },
  expiresAt: { type: Date, index: { expires: 0 } },
}, { timestamps: true });
module.exports = mongoose.model('EventReminder', schema);
