/**
 * Pure sessionStorage helpers for event/court selection.
 * Separated from React context so unit tests need no Firebase.
 */

export const STORAGE_EVENT = "selectedEvent";
export const STORAGE_COURT = "selectedCourt";
export const STORAGE_EVENT_NAME = "selectedEventName";

export function readStoredEventSession(storage = sessionStorage) {
  const eventId = storage.getItem(STORAGE_EVENT);
  const courtId = storage.getItem(STORAGE_COURT);
  const eventName = storage.getItem(STORAGE_EVENT_NAME);
  if (!eventId || !courtId) return null;
  return {
    eventId,
    courtId,
    eventName: eventName || eventId,
  };
}

export function hasStoredEventSession(storage = sessionStorage) {
  return !!(storage.getItem(STORAGE_EVENT) && storage.getItem(STORAGE_COURT));
}

export function writeStoredEventSession(sessionData, storage = sessionStorage) {
  if (!sessionData?.eventId || !sessionData?.courtId) return null;
  storage.setItem(STORAGE_EVENT, sessionData.eventId);
  storage.setItem(STORAGE_COURT, sessionData.courtId);
  if (sessionData.eventName) {
    storage.setItem(STORAGE_EVENT_NAME, sessionData.eventName);
  }
  return {
    eventId: sessionData.eventId,
    courtId: sessionData.courtId,
    eventName: sessionData.eventName || sessionData.eventId,
  };
}

export function clearStoredEventSession(storage = sessionStorage) {
  storage.removeItem(STORAGE_EVENT);
  storage.removeItem(STORAGE_COURT);
  storage.removeItem(STORAGE_EVENT_NAME);
}
