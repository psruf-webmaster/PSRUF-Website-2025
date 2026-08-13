// server/routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');

function toSafeUser(user) {
  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    personalEmail: user.personalEmail,
    ufEmail: user.ufEmail,
    major: user.major,
    year: user.year,
    profilePicUrl: user.profilePicUrl || '',
    role: user.role || [],
    memberStatus: user.memberStatus || [],
    positions: user.positions || [],
    permissions: user.permissions || [],
  };
}

/**
 * POST /api/auth/signup
 * Creates a new (unapproved) user
 */
router.post('/signup', async (req, res) => {
  const {
    firstName,
    lastName,
    phoneNumber,
    phoneServiceProvider,
    personalEmail,
    personalPassword,
    ufEmail,
    birthday,
    major,
    year,
  } = req.body;

  if (
    !firstName || !lastName || !phoneNumber || !phoneServiceProvider ||
    !personalEmail || !personalPassword || !ufEmail || !birthday ||
    !major || !year
  ) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  if (!/^\d{10}$/.test(phoneNumber)) {
    return res.status(400).json({ message: 'Phone number must be 10 digits.' });
  }

  if (!ufEmail.endsWith('@ufl.edu')) {
    return res.status(400).json({ message: 'UF email must end with @ufl.edu.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalEmail)) {
    return res.status(400).json({ message: 'Invalid personal email format.' });
  }

  if (personalPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  try {
    const [emailExists, ufEmailExists] = await Promise.all([
      User.findOne({ personalEmail }),
      User.findOne({ ufEmail }),
    ]);
    if (emailExists || ufEmailExists) {
      return res.status(409).json({
        message: emailExists
          ? 'This personal email is already registered.'
          : 'This UF email is already registered.',
      });
    }

    const hashedPassword = await bcrypt.hash(personalPassword, 10);

    const newUser = new User({
      firstName,
      lastName,
      phoneNumber,
      phoneServiceProvider,
      personalEmail,
      personalPassword: hashedPassword,
      ufEmail,
      birthday,
      major,
      year,
      // role default: ['pending']
      isApproved: false,
      createdAt: new Date(),
    });

    await newUser.save();

    return res.status(201).json({
      message: 'Signup successful! Your account is under review by the webmaster.',
      userId: newUser._id,
    });
  } catch (err) {
    console.error('❌ Signup error:', err);
    return res.status(500).json({ message: err.message || 'Server error. Please try again later.' });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Authenticates with personalEmail & personalPassword; enforces approval.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body; // email = personalEmail
    if (!email || !password) {
      return res.status(400).json({ message: 'Missing credentials.' });
    }

    const user = await User.findOne({ personalEmail: email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials.' });

    const ok = await bcrypt.compare(password, user.personalPassword || '');
    if (!ok) return res.status(400).json({ message: 'Invalid credentials.' });

    if (!user.isApproved) {
      return res.status(403).json({ message: 'Account pending approval.' });
    }

    return res.json({ message: 'Login successful', user: toSafeUser(user) });
  } catch (err) {
    console.error('❌ Login error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});


/**
 * GET /api/auth/me
 * Optional: Used to check current logged-in user (future session/JWT support)
 */
router.get('/me', async (req, res) => {
  // For now, no session-based auth — just a placeholder.
  // Later, verify req.user from a token or cookie
  return res.json({ ok: true, message: 'Auth check route working.' });
});

module.exports = router;
