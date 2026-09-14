import { io } from 'socket.io-client';

function resolveSocketUrl() {
  if (typeof window === 'undefined') return undefined;

  const override = (process.env.REACT_APP_SOCKET_URL || '').trim();
  if (override) return override;

  const { protocol, hostname, port, origin } = window.location;
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocalHost && port === '3000') {
    return `${protocol}//${hostname}:5000`;
  }

  return origin;
}

export function createAppSocket(options = {}) {
  return io(resolveSocketUrl(), {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    ...options,
  });
}