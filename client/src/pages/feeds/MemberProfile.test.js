import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemberProfile, MemberProfilesProvider } from './MemberProfile';

const profile = { _id: '1', firstName: 'Alex', lastName: 'Smith', phoneNumber: '555-1234', personalEmail: 'private@example.com', ufEmail: 'alex@ufl.edu', major: 'Physics', year: '3', positions: [{ title: 'President' }], role: ['exec'], memberStatus: ['active'], privacy: { phoneNumber: false, personalEmail: false } };
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
const setup = (props = {}) => render(<MemberProfilesProvider value={new Map([['1', profile]])}><MemberProfile userId="1" {...props}>Alex</MemberProfile></MemberProfilesProvider>);

test('opens cached details only on click, omitting private contacts', () => {
  setup();
  const trigger = screen.getByRole('button', { name: "View Alex Smith's profile" });
  fireEvent.mouseEnter(trigger);
  expect(screen.queryByText('President')).not.toBeInTheDocument();
  expect(screen.queryByText('555-1234')).not.toBeInTheDocument();
  fireEvent.click(trigger);
  expect(screen.getByText('President')).toBeInTheDocument();
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByText('alex@ufl.edu')).toBeInTheDocument();
  expect(screen.getByText('Year 3')).toBeInTheDocument();
  expect(screen.queryByText('private@example.com')).not.toBeInTheDocument();
  expect(screen.queryByText('Phone number')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close profile' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

test('supports keyboard focus, Escape dismissal, and explicit prop restrictions', () => {
  setup({ visibility: { ufEmail: false } });
  const trigger = screen.getByRole('button');
  fireEvent.focus(trigger);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(trigger);
  expect(screen.queryByText('alex@ufl.edu')).not.toBeInTheDocument();
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('keeps the profile open after mouse leave and closes on backdrop click', () => {
  setup();
  const trigger = screen.getByRole('button');
  fireEvent.click(trigger);
  fireEvent.mouseLeave(trigger);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('dialog'));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

test('shows explicitly shared contacts and hides contacts without sharing flags', () => {
  const { rerender } = render(<MemberProfile profile={{ ...profile, privacy: { phoneNumber: true, personalEmail: true } }}>Alex</MemberProfile>);
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByText('555-1234')).toBeInTheDocument();
  expect(screen.getByText('private@example.com')).toBeInTheDocument();
  rerender(<MemberProfile profile={{ ...profile, privacy: undefined }}>Alex</MemberProfile>);
  expect(screen.queryByText('555-1234')).not.toBeInTheDocument();
  expect(screen.queryByText('private@example.com')).not.toBeInTheDocument();
});

test('chat hover shows a compact summary above the author and click opens details', () => {
  jest.useFakeTimers();
  setup({ hoverPreview: true });
  const trigger = screen.getByRole('button');
  trigger.getBoundingClientRect = () => ({ top: 200, left: 80, bottom: 230 });
  fireEvent.mouseEnter(trigger);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  act(() => jest.advanceTimersByTime(220));
  expect(screen.getByRole('tooltip')).toHaveStyle({ bottom: `${window.innerHeight - 200 + 6}px`, maxHeight: '104px' });
  expect(screen.getByText('President')).toBeInTheDocument();
  fireEvent.click(trigger);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  jest.useRealTimers();
});

