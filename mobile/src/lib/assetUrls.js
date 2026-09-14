import { getApiOrigin } from './api';

export function normalizeAssetUrl(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('/uploads/')) {
    return `${getApiOrigin()}${trimmed}`;
  }

  return '';
}

export function normalizeUserAssets(user) {
  if (!user || typeof user !== 'object') {
    return user;
  }

  return {
    ...user,
    profilePicUrl: normalizeAssetUrl(user.profilePicUrl || ''),
  };
}
