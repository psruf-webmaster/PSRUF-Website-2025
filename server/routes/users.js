const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../models/User');

async function getUser(req) {
  if (req.user) return req.user;
  const auth = req.header('authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    const id = auth.slice(7).trim();
    if (mongoose.Types.ObjectId.isValid(id)) {
      const u = await User.findById(id);
      if (u) return u;
    }
  }
  const xUser = req.header('x-user-id');
  if (xUser && mongoose.Types.ObjectId.isValid(xUser)) {
    const u = await User.findById(xUser);
    if (u) return u;
  }
  return null;
}

router.get('/cohosts', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const eligibleRoles = ['officer', 'exec', 'webmaster', 'webdev', 'candOfficer'];
    const users = await User.find({
      isApproved: true,
      role: { $in: eligibleRoles },
    }).select('_id firstName lastName role');

    return res.json(users);
  } catch (err) {
    console.error('Users cohosts error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Approved users list for dropdowns
router.get('/approved', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const users = await User.find({ isApproved: true }).select('_id firstName lastName role memberStatus');
    return res.json(users);
  } catch (err) {
    console.error('Users approved error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
