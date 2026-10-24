import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MediaLightbox from './MediaLightbox';
const item = { name: 'photo.jpg', url: 'https://example.com/photo.jpg', type: 'image' };
test('shows metadata and supports all dismissal controls', () => {
  const onClose = jest.fn();
  render(<MediaLightbox item={item} authorName="Alex" timeLabel="10:30 AM" onClose={onClose} />);
  expect(screen.getByText('Alex')).toBeTruthy();
  expect(screen.getByText('10:30 AM')).toBeTruthy();
  fireEvent.click(screen.getByAltText('photo.jpg'));
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.keyDown(document, { key: 'Escape' });
  fireEvent.click(screen.getByRole('button', { name: 'Close media preview' }));
  fireEvent.click(screen.getByRole('dialog').parentElement);
  expect(onClose).toHaveBeenCalledTimes(3);
});
test('downloads original file', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['image']) });
  URL.createObjectURL = jest.fn(() => 'blob:download');
  URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  render(<MediaLightbox item={item} onClose={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Download Asset' }));
  await waitFor(() => expect(click).toHaveBeenCalled());
  expect(fetch).toHaveBeenCalledWith(item.url);
  click.mockRestore();
});
test('restores focus and scroll state on unmount', () => {
  const trigger = document.createElement('button');
  document.body.appendChild(trigger);
  trigger.focus();
  const { unmount } = render(<MediaLightbox item={item} onClose={() => {}} />);
  expect(document.body.style.overflow).toBe('hidden');
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close media preview' }));
  unmount();
  expect(document.activeElement).toBe(trigger);
  expect(document.body.style.overflow).toBe('');
  trigger.remove();
});
test('renders video controls and reports download failures', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
  const { container } = render(<MediaLightbox item={{ ...item, type: 'video' }} onClose={() => {}} />);
  expect(document.querySelector('video').controls).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Download Asset' }));
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  expect(screen.getByRole('link', { name: 'Open original file' }).getAttribute('href')).toBe(item.url);
  expect(container.querySelector('video')).toBeNull();
});
