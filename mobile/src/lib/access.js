export function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export function getRoles(user) {
  return normalizeList(user?.role).map((role) => String(role).toLowerCase());
}

export function isAlumniUser(user) {
  return getRoles(user).includes('alumni');
}

export function isOfficerLevel(user) {
  if (!user) {
    return false;
  }

  if (user.isOfficer || user.isExec || user.isWebmaster) {
    return true;
  }

  return getRoles(user).some((role) => (
    role.includes('officer')
    || role.includes('exec')
    || role.includes('webmaster')
    || role.includes('vp_comm')
    || role.includes('vp communications')
    || role.includes('vpcommunications')
  ));
}

export function getPositionKeys(user) {
  return new Set(normalizeList(user?.positions).map((position) => position?.key).filter(Boolean));
}

export function canAccessPointsOverview(user) {
  const positionKeys = getPositionKeys(user);
  return positionKeys.has('PRESIDENT')
    || positionKeys.has('VP_STANDARDS')
    || positionKeys.has('VP_FINANCE');
}

export function canAccessLedger(user) {
  if (getRoles(user).includes('exec')) {
    return true;
  }

  const positionKeys = getPositionKeys(user);
  return positionKeys.has('PRESIDENT') || positionKeys.has('VP_STANDARDS');
}

export function canAccessApprovals(user) {
  const roles = getRoles(user);
  const positionKeys = getPositionKeys(user);
  return roles.includes('webmaster')
    || roles.includes('webdev')
    || positionKeys.has('WEBMASTER')
    || positionKeys.has('WEBDEV');
}

export function canAccessAdminUsers(user) {
  const roles = getRoles(user);
  const positionKeys = getPositionKeys(user);
  return roles.includes('webmaster')
    || positionKeys.has('PRESIDENT')
    || positionKeys.has('VP_STANDARDS')
    || positionKeys.has('VP_FINANCE')
    || positionKeys.has('WEBMASTER');
}
