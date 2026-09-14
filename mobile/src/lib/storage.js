import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const USER_STORAGE_KEY = 'psruf-mobile-user';

function canUseWebStorage() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && !!window.localStorage;
}

async function getStoredValue() {
  if (canUseWebStorage()) {
    return window.localStorage.getItem(USER_STORAGE_KEY);
  }

  try {
    return await SecureStore.getItemAsync(USER_STORAGE_KEY);
  } catch (_error) {
    return null;
  }
}

async function setStoredValue(value) {
  if (canUseWebStorage()) {
    window.localStorage.setItem(USER_STORAGE_KEY, value);
    return;
  }

  try {
    await SecureStore.setItemAsync(USER_STORAGE_KEY, value);
  } catch (_error) {
  }
}

async function removeStoredValue() {
  if (canUseWebStorage()) {
    window.localStorage.removeItem(USER_STORAGE_KEY);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(USER_STORAGE_KEY);
  } catch (_error) {
  }
}

export async function readStoredUser() {
  const rawValue = await getStoredValue();
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (_error) {
    await removeStoredValue();
    return null;
  }
}

export function storeUser(user) {
  return setStoredValue(JSON.stringify(user));
}

export function clearStoredUser() {
  return removeStoredValue();
}
