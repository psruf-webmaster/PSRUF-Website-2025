import React from 'react';
import './Calendar.css';

export default function Calendar() {
  return (
    <div className="calendar-container">
      <iframe
        src="https://calendar.google.com/calendar/embed?src=psruf.webmaster%40gmail.com&ctz=America%2FNew_York"
        style={{ border: 0 }}
        width="100%"
        height="100%"
        frameBorder="0"
        scrolling="no"
        title="Google Calendar"
      ></iframe>
    </div>
  );
}
