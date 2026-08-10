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

/**
 * Google Auth only. Event/court selection lives in EventSessionContext.
 */
export function AuthProvider({ children }) {
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

  const value = {
    user,
    userLoading,
    googleLogin,
    googleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
