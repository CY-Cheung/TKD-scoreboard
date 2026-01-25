import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);

  useEffect(() => {
    const savedEvent = localStorage.getItem('selectedEvent');
    const savedCourt = localStorage.getItem('selectedCourt');

    if (savedEvent && savedCourt) {
      setSession({ eventId: savedEvent, courtId: savedCourt });
    }
  }, []);

  const login = (sessionData) => {
    localStorage.setItem('selectedEvent', sessionData.eventId);
    localStorage.setItem('selectedCourt', sessionData.courtId);
    setSession(sessionData);
  };

  const logout = () => {
    localStorage.removeItem('selectedEvent');
    localStorage.removeItem('selectedCourt');
    setSession(null);
  };

  const value = {
    session,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
