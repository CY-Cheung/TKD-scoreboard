import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  clearStoredEventSession,
  hasStoredEventSession,
  readStoredEventSession,
  writeStoredEventSession,
} from "./eventSessionStorage";

const EventSessionContext = createContext(null);

export { hasStoredEventSession, readStoredEventSession };

export function useEventSession() {
  return useContext(EventSessionContext);
}

/**
 * Event / court selection session (separate from Google Auth).
 * Persists to sessionStorage for Screen / Controller reload + QR deep-links.
 */
export function EventSessionProvider({ children }) {
  const [session, setSession] = useState(() => readStoredEventSession());

  const setEventSession = useCallback((sessionData) => {
    const next = writeStoredEventSession(sessionData);
    if (next) setSession(next);
  }, []);

  const clearEventSession = useCallback(() => {
    clearStoredEventSession();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      setEventSession,
      clearEventSession,
    }),
    [session, setEventSession, clearEventSession]
  );

  return (
    <EventSessionContext.Provider value={value}>
      {children}
    </EventSessionContext.Provider>
  );
}
