const { POSITIONS, EXEC } = require('../constants/positions');

function hasPosition(user, key) {
  const normalizeKey = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return Array.isArray(user?.positions) && user.positions.some(p =>
    normalizeKey(p?.key || p) === normalizeKey(key));
}

function canUserSendSms(user) {
  if (!user) return false;
  const roles = Array.isArray(user.role) ? user.role : (user.role ? [user.role] : []);
  if (roles.includes('webmaster') || roles.includes('webdev')) return true;
  // VP Communications is allowed (exec position)
  return hasPosition(user, EXEC.VP_COMMUNICATIONS) || hasPosition(user, POSITIONS.WEBMASTER?.key) || hasPosition(user, POSITIONS.WEBDEV?.key);
}

function canScheduleSms(user) {
  const roles = Array.isArray(user?.role) ? user.role : [user?.role];
  return !!user?.isApproved && (roles.includes('webmaster') ||
    hasPosition(user, 'WEBMASTER') || hasPosition(user, 'VP_COMMUNICATIONS'));
}

module.exports = { canUserSendSms, canScheduleSms };
