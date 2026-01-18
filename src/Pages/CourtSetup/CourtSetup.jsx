import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { database } from '../../firebase';
import { ref, get } from "firebase/database";
import { useAuth } from '../../Context/AuthContext';

import './CourtSetup.css';
import Button from '../../Components/Button/Button';
import Squares from '../../Components/Squares/Squares';

function CourtSetup() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const eventsRef = ref(database, 'events');
    get(eventsRef).then((snapshot) => {
      if (snapshot.exists()) {
        const eventList = Object.keys(snapshot.val());
        setEvents(eventList);
        const lastEvent = localStorage.getItem('selectedEvent');
        if (lastEvent && eventList.includes(lastEvent)) {
          setSelectedEvent(lastEvent);
        }
      }
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedEvent) {
      setError('Please select an event.');
      return;
    }

    const settingsRef = ref(database, `events/${selectedEvent}/settings/setupPassword`);
    
    try {
        const snapshot = await get(settingsRef);
        if (snapshot.exists()) {
            const correctPassword = snapshot.val();
            if (password === correctPassword) {
                const courtId = 'court1'; // Hardcoded as per previous changes

                // 1. 告訴系統這個人登入成功了
                login({ 
                    courtId: courtId, 
                    eventId: selectedEvent,
                    role: 'admin' 
                });

                // 2. 跳轉到首頁 (現在首頁已經被保護，有通行證才能進)
                navigate('/'); 
            } else {
                setError('Incorrect password, please try again.');
            }
        } else {
            setError('Setup Password has not been configured for this event. Please contact an administrator.');
            console.error(`Setup password not found at 'events/${selectedEvent}/settings/setupPassword'`);
        }
    } catch (err) {
        setError('An error occurred while connecting to the database.');
        console.error("Error fetching password:", err);
    }
  };

  return (
    <div className="cs-container">
      <Squares
        speed={0.5}
        squareSize={100}
        direction="diagonal"
        borderColor="hsla(270, 50%, 50%, 0.25)"
        hoverFillColor="hsla(60, 50%, 50%, 0.25)"
      />
      <div className="cs-content">
        <h1>Court Setup</h1>
        <form onSubmit={handleSubmit} className="cs-form">
          <p>Select the event and enter the Setup Password to connect this device.</p>
          
          <div className="form-group">
            <label htmlFor="event-select">Select Event</label>
            <select
              id="event-select"
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
            >
              <option value="" disabled>-- Please Select --</option>
              {events.map(event => (
                <option key={event} value={event}>
                  {event}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="setup-password">Setup Password</label>
            <input
              id="setup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter setup password"
              required
              disabled={!selectedEvent}
            />
          </div>
          
          {error && <p className="cs-error-message">{error}</p>}
          <div className="cs-action-buttons">
            <Button type="submit" text="Confirm Settings" fontSize="1.5dvw" angle={30} disabled={!selectedEvent} />
            <Button text="Back to Home" fontSize="1.5dvw" angle={150} onClick={() => navigate('/')} />
          </div>
        </form>
      </div>
    </div>
  );
}

export default CourtSetup;
