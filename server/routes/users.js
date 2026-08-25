const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const multer = require('multer');
const { storage, getCloudinaryFileUrl } = require('../utils/cloudinaryConfig');
const { sanitizeMemberStatuses } = require('../constants/memberOptions');

const fileFilter = (_req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
  ];
  if (allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid profile photo file type. Only images are allowed.'), false);
  }
};

const profileUploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const profileUpload = profileUploadMiddleware.single('profilePhoto');

const handleProfileUpload = (req, res, next) => {
  profileUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Profile photo too large. Maximum size is 5MB.' });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

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

function toSafeUser(user) {
  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber || '',
    personalEmail: user.personalEmail,
    ufEmail: user.ufEmail,
    major: user.major,
    year: user.year,
    profilePicUrl: user.profilePicUrl || '',
    role: user.role || [],
    memberStatus: sanitizeMemberStatuses(user.memberStatus),
    positions: user.positions || [],
    permissions: user.permissions || [],
  };
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
    return res.json(users.map(current => ({
      ...current.toObject(),
      memberStatus: sanitizeMemberStatuses(current.memberStatus),
    })));
  } catch (err) {
    console.error('Users approved error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    return res.json({ user: toSafeUser(user) });
  } catch (err) {
    console.error('Users me error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/me', handleProfileUpload, async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const {
      firstName,
      lastName,
      phoneNumber,
      personalEmail,
      ufEmail,
      major,
      year,
    } = req.body || {};

    const nextPersonalEmail = typeof personalEmail === 'string' ? personalEmail.trim() : user.personalEmail;
    const nextUfEmail = typeof ufEmail === 'string' ? ufEmail.trim() : user.ufEmail;

    if (nextPersonalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextPersonalEmail)) {
      return res.status(400).json({ message: 'Invalid personal email format.' });
    }

    if (nextUfEmail && !nextUfEmail.endsWith('@ufl.edu')) {
      return res.status(400).json({ message: 'UF email must end with @ufl.edu.' });
    }

    if (typeof phoneNumber === 'string') {
      const normalizedPhone = phoneNumber.replace(/\D/g, '');
      if (normalizedPhone.length > 0 && normalizedPhone.length !== 10) {
        return res.status(400).json({ message: 'Phone number must be 10 digits.' });
      }
    }

    if (nextPersonalEmail !== user.personalEmail) {
      const duplicatePersonal = await User.findOne({
        personalEmail: nextPersonalEmail,
        _id: { $ne: user._id },
      });

      if (duplicatePersonal) {
        return res.status(409).json({ message: 'This personal email is already registered.' });
      }
    }

    if (nextUfEmail !== user.ufEmail) {
      const duplicateUf = await User.findOne({
        ufEmail: nextUfEmail,
        _id: { $ne: user._id },
      });

      if (duplicateUf) {
        return res.status(409).json({ message: 'This UF email is already registered.' });
      }
    }

    const uploadedFile = getCloudinaryFileUrl(req.file);

    if (typeof firstName === 'string') user.firstName = firstName.trim();
    if (typeof lastName === 'string') user.lastName = lastName.trim();
    if (typeof phoneNumber === 'string') user.phoneNumber = phoneNumber.replace(/\D/g, '');
    if (typeof personalEmail === 'string') user.personalEmail = nextPersonalEmail;
    if (typeof ufEmail === 'string') user.ufEmail = nextUfEmail;
    if (typeof major === 'string') user.major = major;
    if (typeof year === 'string') user.year = year;
    if (uploadedFile) user.profilePicUrl = uploadedFile;

    await user.save();

    return res.json({ message: 'Profile updated successfully.', user: toSafeUser(user) });
  } catch (err) {
    console.error('Users me update error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/me/password', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body || {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All password fields are required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New passwords do not match.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    const matches = await bcrypt.compare(currentPassword, user.personalPassword || '');
    if (!matches) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    user.personalPassword = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Users me password update error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;