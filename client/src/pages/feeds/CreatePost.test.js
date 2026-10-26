import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CreatePost } from './FeedPage';

jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }));

jest.mock('../../context/AuthContext', () => {
  const user = { _id: '507f1f77bcf86cd799439011', firstName: 'Sender', isApproved: true, role: ['webmaster'], positions: [{ key: 'WEBMASTER' }] };
  return { useAuth: () => ({ user }) };
});
jest.mock('./ScheduledTexts', () => ({ ...jest.requireActual('./ScheduledTexts'), __esModule: true, default: () => null }));

beforeEach(() => { localStorage.clear(); global.fetch = jest.fn(); });
function setup() {
  const onPosted = jest.fn();
  render(<CreatePost feed="chapterAnnouncements" canPost onPosted={onPosted} />);
  fireEvent.change(screen.getByPlaceholderText('Message the channel...'), { target: { value: 'Hello sisters' } });
  return onPosted;
}
const ok = () => ({ ok: true, json: async () => ({ _id: 'new-post' }) });

test('pressing Send posts the actual composer message and clears it on success', async () => {
  fetch.mockResolvedValue(ok());
  const onPosted = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  await waitFor(() => expect(onPosted).toHaveBeenCalledTimes(1));
  expect(fetch).toHaveBeenCalledWith('/api/feeds/chapterAnnouncements/posts', expect.objectContaining({ method: 'POST', body: expect.any(FormData) }));
  expect(fetch.mock.calls[0][1].body.get('content')).toBe('Hello sisters');
  expect(screen.getByPlaceholderText('Message the channel...')).toHaveValue('');
});

test('network failure shows an inline error, preserves the draft and lets Send retry', async () => {
  fetch.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(ok());
  const onPosted = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server');
  expect(screen.getByPlaceholderText('Message the channel...')).toHaveValue('Hello sisters');
  expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  await waitFor(() => expect(onPosted).toHaveBeenCalledTimes(1));
});

test('missing specific recipients explains why Send cannot submit', async () => {
  fetch.mockResolvedValue({ ok: true, json: async () => [] });
  setup();
  fireEvent.click(screen.getByRole('switch', { name: 'Also send as text blast' }));
  fireEvent.change(screen.getByLabelText('Send to'), { target: { value: 'specific' } });
  await screen.findByText('No users available.');
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Select at least one person');
  expect(fetch.mock.calls.every(([url]) => !url.endsWith('/posts'))).toBe(true);
});

test('scheduled Send submits UTC time with JWT and does not silently fail for a missing session', async () => {
  fetch.mockResolvedValue(ok());
  const onPosted = setup();
  fireEvent.click(screen.getByRole('switch', { name: 'Also send as text blast' }));
  fireEvent.click(screen.getByRole('radio', { name: /Schedule for later/ }));
  const date = new Date(Date.now() + 10 * 60000);
  const localTime = new Date(+date - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  fireEvent.change(screen.getByLabelText('Send text at'), { target: { value: localTime } });
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  expect(screen.getByRole('alert')).toHaveTextContent('sign out and sign in again');
  expect(fetch).not.toHaveBeenCalled();
  localStorage.setItem('psr_token', 'signed-token');
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  await waitFor(() => expect(onPosted).toHaveBeenCalledTimes(1));
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer signed-token');
  expect(fetch.mock.calls[0][1].body.get('smsSendAt')).toBe(new Date(localTime).toISOString());
});

test('server errors stay visible in the composer and preserve the draft', async () => {
  fetch.mockResolvedValue({ ok: false, json: async () => ({ message: 'Channel is archived; posting is locked' }) });
  setup();
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Channel is archived');
  expect(screen.getByPlaceholderText('Message the channel...')).toHaveValue('Hello sisters');
  expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
});


test('rapid Send presses do not create duplicate requests', async () => {
  let finish;
  fetch.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const onPosted = setup();
  const send = screen.getByRole('button', { name: 'Send' });
  fireEvent.click(send); fireEvent.click(send);
  expect(fetch).toHaveBeenCalledTimes(1);
  finish(ok());
  await waitFor(() => expect(onPosted).toHaveBeenCalledTimes(1));
});

test('unexpected server response does not discard the draft', async () => {
  fetch.mockResolvedValue({ ok: true, json: async () => { throw new Error('HTML instead of JSON'); } });
  setup();
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('unexpected response');
  expect(screen.getByPlaceholderText('Message the channel...')).toHaveValue('Hello sisters');
  expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
});

test.each([
  [{ error: 'Not authorized to send SMS', attempted: 0 }, 'Not authorized'],
  [{ attempted: 0, sent: 0, failed: 0 }, 'No recipients'],
  [{ attempted: 2, sent: 1, failed: 1 }, '1 sent; 1 failed'],
  [{ attempted: 0, failures: [{ reason: 'private provider details' }] }, 'text service'],
])('a published post with failed SMS shows delivery feedback without keeping a duplicate draft', async (smsResult, detail) => {
  fetch.mockResolvedValue({ ok: true, json: async () => ({ _id: 'post', smsResult }) });
  const onPosted = setup();
  fireEvent.click(screen.getByRole('switch', { name: 'Also send as text blast' }));
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('feed post was published');
  expect(screen.getByRole('alert')).toHaveTextContent(detail);
  expect(screen.getByRole('alert')).not.toHaveTextContent('private provider details');
  expect(screen.getByPlaceholderText('Message the channel...')).toHaveValue('');
  expect(onPosted).toHaveBeenCalledTimes(1);
});
