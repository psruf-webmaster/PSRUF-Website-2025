export function normalizeAssetUrl(value) {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (parsed.pathname.startsWith('/uploads/')) {
      return '';
    }
  } catch (_err) {
    return '';
  }

  return trimmed;
}

export function normalizeUserAssets(user) {
  if (!user || typeof user !== 'object') return user;
  return {
    ...user,
    profilePicUrl: normalizeAssetUrl(user.profilePicUrl || ''),
  };
}