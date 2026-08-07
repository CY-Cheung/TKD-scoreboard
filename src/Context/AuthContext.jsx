import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  // Synchronously initialize session state from sessionStorage
  const [session, setSession] = useState(() => {
    const savedEvent = sessionStorage.getItem('selectedEvent');
    const savedCourt = sessionStorage.getItem('selectedCourt');
    const savedEventName = sessionStorage.getItem('selectedEventName');
    if (savedEvent && savedCourt) {
      return { 
        eventId: savedEvent, 
        courtId: savedCourt, 
        eventName: savedEventName || savedEvent 
      };
    }
    return null;
  });

  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setUserLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const googleLogin = async () => {
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(auth, provider);
  };

  const googleLogout = async () => {
    await signOut(auth);
  };

  const login = (sessionData) => {
    sessionStorage.setItem('selectedEvent', sessionData.eventId);
    sessionStorage.setItem('selectedCourt', sessionData.courtId);
    if (sessionData.eventName) {
      sessionStorage.setItem('selectedEventName', sessionData.eventName);
    }
    setSession(sessionData);
  };

  const logout = () => {
    sessionStorage.removeItem('selectedEvent');
    sessionStorage.removeItem('selectedCourt');
    sessionStorage.removeItem('selectedEventName');
    setSession(null);
  };

  const value = {
    session,
    user,
    userLoading,
    googleLogin,
    googleLogout,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
