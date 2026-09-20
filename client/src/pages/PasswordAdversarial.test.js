import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import PasswordReset from './PasswordReset';
import ProfileSettings from './ProfileSettings';

// Load the same router implementation through a path CRA's older Jest understands.
jest.mock('react-router-dom', () => {
  global.TextEncoder = require('util').TextEncoder;
  global.TextDecoder = require('util').TextDecoder;
  return jest.requireActual('react-router/dist/development/index.js');
});
jest.mock('../context/AuthContext', () => {
  const auth = { user: { id: 'user-id', firstName: 'Test' }, updateUser: jest.fn() };
  return { useAuth: () => auth };
});
jest.mock('motion/react', () => {
  const React = require('react');
  const component = tag => ({ initial, animate, transition, whileHover, whileTap, ...props }) => React.createElement(tag, props);
  return { motion: { div: component('div'), section: component('section'), button: component('button'), img: component('img'), aside: component('aside') } };
});
const token = 'a'.repeat(64);
const response = (ok, message) => ({ ok, json: async () => ({ message }) });
const change = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const renderReset = (value = token) => render(<MemoryRouter initialEntries={[`/reset-password?token=${value}`]}><PasswordReset reset /></MemoryRouter>);
beforeEach(() => { global.fetch = jest.fn(); localStorage.clear(); });
afterEach(() => jest.restoreAllMocks());

test.each(['', 'bad', '%3Cscript%3E', 'a'.repeat(65)])('malformed token %s blocks the form', value => {
  renderReset(value);
  expect(screen.getByRole('alert')).toHaveTextContent('invalid or missing');
  expect(screen.queryByRole('button')).toBeNull();
});

test('mismatched passwords never reach the server', () => {
  renderReset();
  change('New password', 'password-one'); change('Confirm new password', 'password-two');
  fireEvent.click(screen.getByRole('button'));
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('matching');
});

test('successful reset sends only token and password, then removes the form', async () => {
  fetch.mockResolvedValue(response(true, 'Password reset successfully.'));
  renderReset();
  change('New password', 'password-one'); change('Confirm new password', 'password-one');
  fireEvent.click(screen.getByRole('button'));
  expect(await screen.findByRole('status')).toHaveTextContent('successfully');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ token, newPassword: 'password-one' });
  expect(screen.queryByLabelText('New password')).toBeNull();
  expect(screen.getByRole('link', { name: 'Back to login' })).toHaveAttribute('href', '/login');
});

test('in-flight submission disables the button; network failure permits retry', async () => {
  let reject;
  fetch.mockImplementation(() => new Promise((_resolve, fail) => { reject = fail; }));
  renderReset();
  change('New password', 'password-one'); change('Confirm new password', 'password-one');
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByRole('button')).toBeDisabled();
  fireEvent.click(screen.getByRole('button'));
  expect(fetch).toHaveBeenCalledTimes(1);
  reject(new Error('Network unavailable'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable');
  expect(screen.getByRole('button')).not.toBeDisabled();
});

test('expired reset reports the error and offers a fresh link', async () => {
  fetch.mockResolvedValue(response(false, 'This reset link is invalid or expired.'));
  renderReset();
  change('New password', 'password-one'); change('Confirm new password', 'password-one');
  fireEvent.click(screen.getByRole('button'));
  expect(await screen.findByRole('alert')).toHaveTextContent('expired');
  expect(screen.getByRole('link', { name: 'Request a new reset link' })).toHaveAttribute('href', '/forgot-password');
});

test('forgot-password success uses the personal email and removes the form', async () => {
  fetch.mockResolvedValue(response(true, 'If an account exists for that email, a reset link has been sent.'));
  render(<MemoryRouter><PasswordReset /></MemoryRouter>);
  change('Registered personal email', 'member@example.com');
  fireEvent.click(screen.getByRole('button'));
  expect(await screen.findByRole('status')).toHaveTextContent('If an account exists');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ personalEmail: 'member@example.com' });
});

test('profile requires every password field and a matching confirmation', () => {
  render(<MemoryRouter><ProfileSettings /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
  expect(screen.getByText('All password fields are required.')).toBeInTheDocument();
  change('Current password', 'old-password'); change('New password', 'new-password'); change('Confirm new password', 'different');
  fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
  expect(screen.getByText('New passwords do not match.')).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});

test('profile sends JWT rather than ID for both profile and password updates', async () => {
  localStorage.setItem('psr_token', 'signed-jwt');
  fetch.mockResolvedValue({ ok: true, json: async () => ({ message: 'Saved', user: { id: 'user-id' }, token: 'rotated-jwt' }) });
  render(<MemoryRouter><ProfileSettings /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer signed-jwt');
  expect(fetch.mock.calls[0][1].body.has('userId')).toBe(false);
  change('Current password', 'old-password'); change('New password', 'new-password'); change('Confirm new password', 'new-password');
  fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer signed-jwt');
  await waitFor(() => expect(screen.getByLabelText('New password')).toHaveValue(''));
  expect(localStorage.getItem('psr_token')).toBe('rotated-jwt');
});

test('following a second reset link clears success and old password state', async () => {
  function NewLink() {
    const navigate = useNavigate();
    return <button onClick={() => navigate(`/reset-password?token=${'b'.repeat(64)}`)}>Open second link</button>;
  }
  fetch.mockResolvedValue(response(true, 'Password reset successfully.'));
  render(<MemoryRouter initialEntries={[`/reset-password?token=${token}`]}><PasswordReset reset /><NewLink /></MemoryRouter>);
  change('New password', 'password-one'); change('Confirm new password', 'password-one');
  fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
  await screen.findByRole('status');
  fireEvent.click(screen.getByRole('button', { name: 'Open second link' }));
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.getByLabelText('New password')).toHaveValue('');
});

test('legacy sessions cannot fall back to user-ID authentication', () => {
  render(<MemoryRouter><ProfileSettings /></MemoryRouter>);
  change('Current password', 'old-password'); change('New password', 'new-password'); change('Confirm new password', 'new-password');
  fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
  expect(screen.getByText('Please log out and log in again to change your password.')).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});
