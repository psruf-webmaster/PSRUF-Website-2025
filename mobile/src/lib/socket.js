import { io } from 'socket.io-client';
import { getSocketOrigin } from './api';

export function createAppSocket(options = {}) {
  return io(getSocketOrigin(), {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    ...options,
  });
}
