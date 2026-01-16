import React, { useState, useEffect } from 'react';
import './Admin.css';
import { read_file, write_file } from '../../Api.js';

function AdminDashboard() {
  const [events, setEvents] = useState({});
  const [newEventName, setNewEventName] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      const response = await read_file('TKD.json');
      if (response.status === 'succeeded') {
        const data = JSON.parse(response.result);
        setEvents(data.events || {});
      }
    };
    fetchEvents();
  }, []);

  const handleAddEvent = async () => {
    if (!newEventName) {
      alert('Please enter an event name.');
      return;
    }

    const newEvent = {
      settings: {
        setupPassword: ''
      },
      courts: {},
      judgingQueue: {},
      matches: {}
    };

    const updatedEvents = { ...events, [newEventName]: newEvent };

    const response = await write_file('TKD.json', JSON.stringify({ events: updatedEvents }, null, 2));
    if (response.status === 'succeeded') {
      setEvents(updatedEvents);
      setNewEventName('');
    } else {
      alert('Failed to add event.');
    }
  };

  return (
    <div>
      <h2>Admin Dashboard</h2>
      <div>
        <h3>Events</h3>
        <ul>
          {Object.keys(events).map(eventName => (
            <li key={eventName}>{eventName}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3>Add New Event</h3>
        <input
          type="text"
          value={newEventName}
          onChange={(e) => setNewEventName(e.target.value)}
          placeholder="New Event Name"
        />
        <button onClick={handleAddEvent}>Add Event</button>
      </div>
    </div>
  );
}

export default AdminDashboard;
