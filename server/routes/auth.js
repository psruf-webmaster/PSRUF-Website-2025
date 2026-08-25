const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { sanitizeMemberStatuses } = require('../constants/memberOptions');

function toSafeUser(user) {
  return {
    id: user._id,
    _id: user._id,

    firstName: user.firstName,
    lastName: user.lastName,

    personalEmail: user.personalEmail,
    ufEmail: user.ufEmail,

    phoneNumber: user.phoneNumber,
    phoneServiceProvider: user.phoneServiceProvider,

    major: user.major,
    year: user.year,
    birthday: user.birthday,

    profilePicUrl: user.profilePicUrl || '',

    role: user.role || [],
    memberStatus: sanitizeMemberStatuses(user.memberStatus),

    // IMPORTANT:
    // This comes directly from MongoDB.
    positions: user.positions || [],
    positionsHistory: user.positionsHistory || [],

    roleHistory: user.roleHistory || [],
    memberStatusHistory: user.memberStatusHistory || [],

    permissions: user.permissions || [],

    scholarship: user.scholarship ?? 0,

    isApproved: user.isApproved,
    approvalState: user.approvalState,

    approvedAt: user.approvedAt,
    rejectedAt: user.rejectedAt,
    rejectionReason: user.rejectionReason,
  };
}

/**
 * Get a user from the Authorization header.
 *
 * Current system:
 * Authorization: Bearer <MongoDB user ID>
 *
 * This preserves your existing authentication setup.
 */
async function getAuthenticatedUser(req) {
  const auth = req.header('authorization') || '';

  if (!auth.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  const id = auth.slice(7).trim();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return User.findById(id);
}

/**
 * POST /api/auth/signup
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
    !firstName ||
    !lastName ||
    !phoneNumber ||
    !phoneServiceProvider ||
    !personalEmail ||
    !personalPassword ||
    !ufEmail ||
    !birthday ||
    !major ||
    !year
  ) {
    return res.status(400).json({
      message: 'All fields are required.',
    });
  }

  if (!/^\d{10}$/.test(phoneNumber)) {
    return res.status(400).json({
      message: 'Phone number must be 10 digits.',
    });
  }

  if (!ufEmail.endsWith('@ufl.edu')) {
    return res.status(400).json({
      message: 'UF email must end with @ufl.edu.',
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalEmail)) {
    return res.status(400).json({
      message: 'Invalid personal email format.',
    });
  }

  if (personalPassword.length < 6) {
    return res.status(400).json({
      message: 'Password must be at least 6 characters long.',
    });
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

      role: ['pending'],
      memberStatus: ['active'],

      positions: [],
      positionsHistory: [],

      permissions: [],

      isApproved: false,
      approvalState: 'pending',

      createdAt: new Date(),
    });

    await newUser.save();

    return res.status(201).json({
      message:
        'Signup successful! Your account is under review by the webmaster.',
      userId: newUser._id,
    });
  } catch (err) {
    console.error('❌ Signup error:', err);

    return res.status(500).json({
      message: err.message || 'Server error. Please try again later.',
    });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Missing credentials.',
      });
    }

    const user = await User.findOne({
      personalEmail: email,
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid credentials.',
      });
    }

    const ok = await bcrypt.compare(
      password,
      user.personalPassword || ''
    );

    if (!ok) {
      return res.status(400).json({
        message: 'Invalid credentials.',
      });
    }

    if (!user.isApproved) {
      return res.status(403).json({
        message: 'Account pending approval.',
      });
    }

    return res.json({
      message: 'Login successful',
      user: toSafeUser(user),
    });
  } catch (err) {
    console.error('❌ Login error:', err);

    return res.status(500).json({
      message: 'Server error.',
    });
  }
});

/**
 * GET /api/auth/me
 *
 * Returns the CURRENT database version of the logged-in user.
 *
 * This is important because localStorage can become stale after
 * an admin changes someone's roles/positions.
 */
router.get('/me', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return res.status(401).json({
        message: 'User required.',
      });
    }

    if (!user.isApproved) {
      return res.status(403).json({
        message: 'Account is not approved.',
      });
    }

    return res.json({
      ok: true,
      user: toSafeUser(user),
    });
  } catch (err) {
    console.error('❌ /me error:', err);

    return res.status(500).json({
      message: 'Server error.',
    });
  }
});

module.exports = router;