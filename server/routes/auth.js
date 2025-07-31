const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');

// Signup route
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
    year
  } = req.body;

  // Basic presence check
  if (
    !firstName || !lastName || !phoneNumber || !phoneServiceProvider ||
    !personalEmail || !personalPassword || !ufEmail || !birthday ||
    !major || !year
  ) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  // Format validations
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
    // Check for duplicates
    const emailExists = await User.findOne({ personalEmail });
    const ufEmailExists = await User.findOne({ ufEmail });

    if (emailExists || ufEmailExists) {
      return res.status(409).json({
        message: emailExists
          ? 'This personal email is already registered.'
          : 'This UF email is already registered.'
      });
    }

    // Hash password
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
      year
    });

    await newUser.save();

    res.status(201).json({
      message: 'Signup successful! Your account is under review by the webmaster.',
      userId: newUser._id
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

module.exports = router;
