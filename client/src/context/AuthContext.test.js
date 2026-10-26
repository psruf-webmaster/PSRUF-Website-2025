import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import AuthProvider, { useAuth } from './AuthContext';
jest.mock('../lib/socket', () => ({ createAppSocket: () => ({ on: jest.fn(), disconnect: jest.fn() }) }));
const user = { id: 'member', positions: [] };
function Session() {
  const { user } = useAuth();
  return <div>{user ? user.positions.map(p => p.key).join(',') || 'signed in' : 'signed out'}</div>;
}
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('psr_user', JSON.stringify(user));
  localStorage.setItem('psr_token', 'valid-token');
});
afterEach(() => jest.restoreAllMocks());
test('startup refresh sends the session token and persists renewed token and permissions', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ token: 'renewed-token', user: { ...user, positions: [{ key: 'VP_STANDARDS' }] } }) });
  render(<AuthProvider><Session /></AuthProvider>);
  await screen.findByText('VP_STANDARDS');
  expect(fetch).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({ headers: { Authorization: 'Bearer valid-token' } }));
  expect(localStorage.getItem('psr_token')).toBe('renewed-token');
});
test('expired sessions clear the cached profile so management cannot appear signed in', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });
  render(<AuthProvider><Session /></AuthProvider>);
  await screen.findByText('signed out');
  expect(localStorage.getItem('psr_token')).toBeNull();
  expect(localStorage.getItem('psr_user')).toBeNull();
});
test('transient server failure preserves the session for retry', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });
  render(<AuthProvider><Session /></AuthProvider>);
  await waitFor(() => expect(console.error).toHaveBeenCalled());
  expect(screen.getByText('signed in')).toBeInTheDocument();
  expect(localStorage.getItem('psr_token')).toBe('valid-token');
});
test('an old refresh cannot clear a newer login', async () => {
  let resolve;
  global.fetch = jest.fn().mockReturnValue(new Promise(done => { resolve = done; }));
  render(<AuthProvider><Session /></AuthProvider>);
  localStorage.setItem('psr_token', 'new-login-token');
  await act(async () => resolve({ ok: false, status: 401 }));
  expect(localStorage.getItem('psr_token')).toBe('new-login-token');
  expect(screen.getByText('signed in')).toBeInTheDocument();
});
