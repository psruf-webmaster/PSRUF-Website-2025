import Constants from 'expo-constants';
import axios from 'axios';
import { Platform } from 'react-native';

const PROD_ORIGIN = 'https://psruf-website-2026.onrender.com';

function stripTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function resolveDevOrigin() {
  if (!__DEV__) {
    return PROD_ORIGIN;
  }

  const explicit = stripTrailingSlash(process.env.EXPO_PUBLIC_API_URL);
  if (explicit) {
    return explicit;
  }

  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoClient?.hostUri || '';
  const host = String(debuggerHost).split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:5000`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }

  return 'http://localhost:5000';
}

export function getApiOrigin() {
  const explicit = stripTrailingSlash(process.env.EXPO_PUBLIC_API_URL);
  if (explicit) {
    return explicit;
  }

  return resolveDevOrigin();
}

export function getSocketOrigin() {
  const explicit = stripTrailingSlash(process.env.EXPO_PUBLIC_SOCKET_URL);
  if (explicit) {
    return explicit;
  }

  return getApiOrigin();
}

export function getApiBaseUrl() {
  return `${getApiOrigin()}/api`;
}

export function getUserId(user) {
  return user?._id || user?.id || '';
}

export function authHeaders(user) {
  const userId = getUserId(user);
  return userId ? { Authorization: `Bearer ${userId}` } : {};
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
});
