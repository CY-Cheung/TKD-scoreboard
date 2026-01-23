import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { database } from '../../firebase';
import { ref, get, set } from "firebase/database";
import { useAuth } from '../../Context/AuthContext';

import './CourtSetup.css';
import Button from '../../Components/Button/Button';
import Squares from '../../Components/Squares/Squares';

function CourtSetup() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [courtId, setCourtId] = useState(''); 
  const [courtOptions, setCourtOptions] = useState([]);
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
        } else {
          setSelectedEvent(''); // Ensure placeholder shows if last event not in list
        }
      }
    });
  }, []);

  useEffect(() => {
    if (selectedEvent) {
        const courtsRef = ref(database, `events/${selectedEvent}/courts`);
        get(courtsRef).then((snapshot) => {
            if (snapshot.exists()) {
                setCourtOptions(Object.keys(snapshot.val()));
                const lastCourt = localStorage.getItem('selectedCourt');
                // check if last court is valid for this event
                if(lastCourt && Object.keys(snapshot.val()).includes(lastCourt)){
                    setCourtId(lastCourt);
                } else {
                    setCourtId(''); // Reset if last court not in new list
                }
            } else {
                setCourtOptions([]);
                setCourtId('');
            }
        });
    } else {
        setCourtOptions([]);
        setCourtId('');
    }
}, [selectedEvent]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedEvent) {
      setError('Please select an event.');
      return;
    }

    if (!courtId) { 
        setError('Please select a court.'); // Updated error message
        return;
    }

    const settingsRef = ref(database, `events/${selectedEvent}/settings/setupPassword`);
    
    try {
        const snapshot = await get(settingsRef);
        if (snapshot.exists()) {
            const correctPassword = snapshot.val();
            if (password === correctPassword) {
                // The set call ensures the court is configured as expected.
                // It also resets the currentMatchId, which is often the desired behavior for a fresh setup.
                const courtRef = ref(database, `events/${selectedEvent}/courts/${courtId}`);
                await set(courtRef, {
                    name: courtId,
                    currentMatchId: '' 
                });

                localStorage.setItem('selectedEvent', selectedEvent);
                localStorage.setItem('selectedCourt', courtId);

                login({ 
                    courtId: courtId, 
                    eventId: selectedEvent,
                    role: 'admin' 
                });

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
        console.error("Error during setup:", err);
    }
  };

  return (
    <div className="cs-container">
      <Squares
        speed={0.5}
        squareSize={"10dvw"}
        direction="diagonal"
        borderColor="hsla(270, 50%, 50%, 0.25)"
        hoverFillColor="hsla(60, 50%, 50%, 0.25)"
      />
      <div className="cs-content">
        <h1>Court Setup</h1>
        <form onSubmit={handleSubmit} className="cs-form">
          <p>Select the event, court, and enter the Setup Password to connect this device.</p>
          
          <div className="form-group">
            <label htmlFor="event-select">Select Event</label>
            <select
              id="event-select"
              className="datalist-input"
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              required
            >
              <option value="" disabled>-- Please select an event --</option>
              {events.map(event => (
                <option key={event} value={event}>{event}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="court-select">Select Court</label>
            <select
              id="court-select"
              className="datalist-input"
              value={courtId}
              onChange={(e) => setCourtId(e.target.value)}
              disabled={!selectedEvent || courtOptions.length === 0}
              required
            >
              <option value="" disabled>-- Please select a court --</option>
              {courtOptions.map(court => (
                <option key={court} value={court}>{court}</option>
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
              disabled={!selectedEvent || !courtId}
            />
          </div>
          
          {error && <p className="cs-error-message">{error}</p>}
          <div className="cs-action-buttons">
            <Button type="submit" text="Confirm Settings" fontSize="1.5dvw" angle={30} disabled={!selectedEvent || !courtId} />
            <Button text="Back to Home" fontSize="1.5dvw" angle={150} onClick={() => navigate('/')} />
          </div>
        </form>
      </div>
    </div>
  );
}

export default CourtSetup;
