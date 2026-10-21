import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScheduledTexts, { canScheduleTexts, TextScheduleFields } from './ScheduledTexts';

test('only approved Webmaster and C&R accounts can schedule', () => {
  expect(canScheduleTexts({ isApproved: true, role: ['webmaster'] })).toBe(true);
  expect(canScheduleTexts({ isApproved: true, positions: [{ key: 'VP_COMMUNICATIONS' }] })).toBe(true);
  expect(canScheduleTexts({ isApproved: true, positions: [{ key: 'WEBMASTER' }] })).toBe(true);
  expect(canScheduleTexts({ isApproved: true, role: ['webdev'] })).toBe(false);
  expect(canScheduleTexts({ isApproved: true, positions: [{ key: 'PR_DIRECTOR', exec: 'VP_COMMUNICATIONS' }] })).toBe(false);
  expect(canScheduleTexts({ isApproved: false, role: ['webmaster'] })).toBe(false);
});

test('later delivery exposes local time and returning to now clears the schedule', () => {
  function Fields() {
    const [later, setLater] = useState(false); const [value, setValue] = useState('');
    return <TextScheduleFields later={later} onModeChange={setLater} value={value} onChange={setValue} />;
  }
  render(<Fields />);
  expect(screen.queryByLabelText('Send text at')).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'later' } });
  fireEvent.change(screen.getByLabelText('Send text at'), { target: { value: '2027-01-01T12:30' } });
  expect(screen.getByText(/feed post appears now/)).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'now' } });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'later' } });
  expect(screen.getByLabelText('Send text at')).toHaveValue('');
});

test('scheduled list uses JWT authentication and cancels pending texts', async () => {
  localStorage.setItem('psr_token', 'test-token');
  const item = { _id: 'post', feed: 'chapterAnnouncements', authorName: 'Sender', smsSchedule: { status: 'pending', message: 'Hello sisters', sendAt: '2027-01-01T17:00:00Z' } };
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => [item] })
    .mockResolvedValueOnce({ ok: true })
    .mockResolvedValueOnce({ ok: true, json: async () => [{ ...item, smsSchedule: { ...item.smsSchedule, status: 'cancelled' } }] });
  render(<ScheduledTexts />);
  fireEvent.click(screen.getByText('Scheduled text blasts'));
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel scheduled text' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Cancel scheduled text' })).not.toBeInTheDocument());
  expect(fetch).toHaveBeenCalledWith('/api/feeds/scheduled-sms/post/cancel', { method: 'POST', headers: { Authorization: 'Bearer test-token' } });
});
