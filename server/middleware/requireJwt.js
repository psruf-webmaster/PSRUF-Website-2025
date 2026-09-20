const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

function issueToken(user) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
  return jwt.sign({ passwordVersion: user.passwordVersion || 0 }, process.env.JWT_SECRET, {
    algorithm: 'HS256', subject: String(user._id), expiresIn: '1d',
  });
}

async function requireJwt(req, res, next) {
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ message: 'Authentication is unavailable.' });
  }
  const match = /^Bearer (\S+)$/i.exec(req.get('authorization') || '');
  let payload;
  try {
    payload = jwt.verify(match?.[1] || '', process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!mongoose.Types.ObjectId.isValid(payload.sub)) throw new Error('Invalid subject');
  } catch {
    return res.status(401).json({ message: 'Please log in again.' });
  }
  try {
    req.user = await User.findById(payload.sub);
    if (!req.user || !req.user.isApproved || payload.passwordVersion !== (req.user.passwordVersion || 0)) {
      return res.status(401).json({ message: 'Please log in again.' });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { issueToken, requireJwt };
