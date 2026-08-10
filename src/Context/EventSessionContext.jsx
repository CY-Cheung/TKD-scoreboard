import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

const EventSessionContext = createContext(null);

const STORAGE_EVENT = "selectedEvent";
const STORAGE_COURT = "selectedCourt";
const STORAGE_EVENT_NAME = "selectedEventName";

export function readStoredEventSession() {
  const eventId = sessionStorage.getItem(STORAGE_EVENT);
  const courtId = sessionStorage.getItem(STORAGE_COURT);
  const eventName = sessionStorage.getItem(STORAGE_EVENT_NAME);
  if (!eventId || !courtId) return null;
  return {
    eventId,
    courtId,
    eventName: eventName || eventId,
  };
}

export function hasStoredEventSession() {
  return !!(
    sessionStorage.getItem(STORAGE_EVENT) &&
    sessionStorage.getItem(STORAGE_COURT)
  );
}

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
    if (!sessionData?.eventId || !sessionData?.courtId) return;
    sessionStorage.setItem(STORAGE_EVENT, sessionData.eventId);
    sessionStorage.setItem(STORAGE_COURT, sessionData.courtId);
    if (sessionData.eventName) {
      sessionStorage.setItem(STORAGE_EVENT_NAME, sessionData.eventName);
    }
    setSession({
      eventId: sessionData.eventId,
      courtId: sessionData.courtId,
      eventName: sessionData.eventName || sessionData.eventId,
    });
  }, []);

  const clearEventSession = useCallback(() => {
    sessionStorage.removeItem(STORAGE_EVENT);
    sessionStorage.removeItem(STORAGE_COURT);
    sessionStorage.removeItem(STORAGE_EVENT_NAME);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      setEventSession,
      clearEventSession,
      /** @deprecated use setEventSession */
      login: setEventSession,
      /** @deprecated use clearEventSession */
      logout: clearEventSession,
    }),
    [session, setEventSession, clearEventSession]
  );

  return (
    <EventSessionContext.Provider value={value}>
      {children}
    </EventSessionContext.Provider>
  );
}
