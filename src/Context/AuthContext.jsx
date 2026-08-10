import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
} from 'firebase/auth';

const AuthContext = createContext(null);
const AUTH_SESSION_KEY = 'tkdGoogleAuthSession';

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

  // Listen to Firebase Auth state (session-only — cleared when browser closes)
  useEffect(() => {
    let unsubscribe;
    let cancelled = false;

    const initAuth = async () => {
      await setPersistence(auth, browserSessionPersistence);

      unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (cancelled) return;

        if (currentUser && !sessionStorage.getItem(AUTH_SESSION_KEY)) {
          await signOut(auth);
          if (!cancelled) {
            setUser(null);
            setUserLoading(false);
          }
          return;
        }

        setUser(currentUser);
        setUserLoading(false);
      });
    };

    initAuth();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const googleLogin = async () => {
    await setPersistence(auth, browserSessionPersistence);
    sessionStorage.setItem(AUTH_SESSION_KEY, '1');
    try {
      const provider = new GoogleAuthProvider();
      return await signInWithPopup(auth, provider);
    } catch (err) {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      throw err;
    }
  };

  const googleLogout = async () => {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
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
