const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Only allow users with webmaster/webdev roles to access these (TODO: add middleware for real security!)
router.get('/pending', async (req, res) => {
  const pendingUsers = await User.find({ isApproved: false });
  res.json(pendingUsers);
});

// Approve a user and assign role
router.post('/approve/:id', async (req, res) => {
  const { role } = req.body; // e.g., "member", "candidate", etc.
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isApproved: true, role: role || 'member' },
    { new: true }
  );
  // -- Notify user via email + text here (see next section) --
  res.json({ message: "User approved!", user });
});

// Reject a user
router.post('/reject/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "User rejected and deleted." });
});

module.exports = router;
