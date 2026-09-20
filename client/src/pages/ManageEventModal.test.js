import React, { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ManageEventModal } from './Events';

jest.mock('react-router-dom', () => ({ Link: ({ children }) => <a>{children}</a> }));
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({}) }));
jest.mock('motion/react', () => ({
  AnimatePresence: ({ children }) => children,
  motion: { div: ({ initial, animate, exit, transition, children, ...props }) => <div {...props}>{children}</div> },
}));

const event = { title: 'Chapter meeting', startAt: '2026-08-31T18:13:00', endAt: '2026-09-01T18:13:00' };
const options = Array.from({ length: 8 }, (_, i) => ({ _id: String(i), firstName: `Member ${i}`, lastName: 'Test', role: ['member'] }));
function Modal({ tab = 'rsvps', ...props }) {
  const [selection, setSelection] = useState([]);
  return <ManageEventModal manageId="event" manageData={{ event, eligibleMembers: options }} manageTab={tab}
    cohostOptions={options} cohostSelection={selection} setCohostSelection={setSelection}
    attendanceEdits={{}} {...props} />;
}

test('co-host selection caps at seven and allows deselection to free a slot', () => {
  render(<Modal />);
  const boxes = within(screen.getByRole('group', { name: 'Co-hosts' })).getAllByRole('checkbox');
  boxes.slice(0, 7).forEach(box => fireEvent.click(box));
  expect(boxes[7]).toBeDisabled();
  expect(screen.getByText('7 of 7 selected')).toBeInTheDocument();
  fireEvent.click(boxes[0]);
  expect(boxes[7]).toBeEnabled();
  fireEvent.click(boxes[7]);
  expect(boxes[7]).toBeChecked();
  expect(boxes[0]).not.toBeChecked();
});

test('RSVP headings and both dates are readable without seconds', () => {
  render(<Modal />);
  expect(screen.getByRole('heading', { name: 'Not Going' })).toBeInTheDocument();
  const header = screen.getByRole('heading', { name: event.title }).parentElement;
  expect(header.textContent).toContain('Aug 31, 2026');
  expect(header.textContent).toContain('Sep 1, 2026');
  expect(header.textContent).not.toContain(':00');
  expect(screen.getByRole('button', { name: 'RSVPs' })).toHaveAttribute('aria-pressed', 'true');
});

test('empty attendance table and member action preserve their behavior', () => {
  const addManagedMember = jest.fn();
  const saveAttendance = jest.fn();
  render(<Modal tab="attendance" addManagedMember={addManagedMember} saveAttendance={saveAttendance} />);
  expect(within(screen.getByRole('table')).getByText('No attendance records yet.')).toBeInTheDocument();
  const add = screen.getByRole('button', { name: 'Add Member' });
  expect(add).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Member'), { target: { value: '0' } });
  fireEvent.click(add);
  expect(addManagedMember).toHaveBeenCalledWith(expect.objectContaining({ userId: '0', rsvpStatus: 'going', attendanceStatus: 'present' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save Attendance' }));
  expect(saveAttendance).toHaveBeenCalledTimes(1);
});
