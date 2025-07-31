const mongoose = require('mongoose');

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
  memberStatus: {
    type: String,
    enum: ['candidate', 'active', 'inactive', 'probation', 'senior', 'scholarship'],
    default: 'active'
  },
  role: {
    type: String,
    enum: ['pending', 'member', 'alumni', 'officer', 'exec', 'webmaster', 'webdev'],
    default: 'pending'
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
