import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  // Synchronously initialize session state from localStorage to avoid initial render flicker
  const [session, setSession] = useState(() => {
    const savedEvent = localStorage.getItem('selectedEvent');
    const savedCourt = localStorage.getItem('selectedCourt');
    const savedEventName = localStorage.getItem('selectedEventName');
    if (savedEvent && savedCourt) {
      return { 
        eventId: savedEvent, 
        courtId: savedCourt, 
        eventName: savedEventName || savedEvent 
      };
    }
    return null;
  });

  useEffect(() => {
    const savedEvent = localStorage.getItem('selectedEvent');
    const savedCourt = localStorage.getItem('selectedCourt');
    const savedEventName = localStorage.getItem('selectedEventName');

    if (savedEvent && savedCourt) {
      setSession({ 
        eventId: savedEvent, 
        courtId: savedCourt, 
        eventName: savedEventName || savedEvent 
      });
    }
  }, []);

  const login = (sessionData) => {
    localStorage.setItem('selectedEvent', sessionData.eventId);
    localStorage.setItem('selectedCourt', sessionData.courtId);
    if (sessionData.eventName) {
      localStorage.setItem('selectedEventName', sessionData.eventName);
    }
    setSession(sessionData);
  };

  const logout = () => {
    localStorage.removeItem('selectedEvent');
    localStorage.removeItem('selectedCourt');
    localStorage.removeItem('selectedEventName');
    setSession(null);
  };

  const value = {
    session,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
