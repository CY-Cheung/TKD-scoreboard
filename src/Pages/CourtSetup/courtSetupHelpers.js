/**
 * Pure CourtSetup selection / validation helpers.
 * Firebase + EventSessionContext writes stay in CourtSetup.jsx.
 */

/**
 * @param {Array<{ id: string }>} eventList
 * @param {string} selectedEvent
 * @param {string | null} lastEvent
 */
export function resolveSelectedEventId(eventList, selectedEvent, lastEvent) {
  if (!eventList?.length) return "";
  const validIds = eventList.map((e) => e.id);
  if (selectedEvent && validIds.includes(selectedEvent)) return selectedEvent;
  if (lastEvent && validIds.includes(lastEvent)) return lastEvent;
  return eventList[0].id;
}

/**
 * @param {string[]} ids
 * @param {string | null} lastCourt
 */
export function resolveCourtIdFromOptions(ids, lastCourt) {
  if (lastCourt && ids.includes(lastCourt)) return lastCourt;
  return "";
}

/**
 * @param {{ createdByEmail?: string } | undefined} eventData
 * @param {string | undefined} userEmail
 */
export function canUserDeleteEvent(eventData, userEmail) {
  if (!eventData?.createdByEmail) return true;
  return eventData.createdByEmail === userEmail;
}

/**
 * @returns {string | null} error message or null if ok
 */
export function validateCourtSetupLogin({ selectedEvent, courtId, password }) {
  if (!selectedEvent) return "Please select an event.";
  if (!courtId) return "Please select a court.";
  if (!password?.trim()) return "Please enter setup password.";
  return null;
}

/**
 * Apply `defaultCreateEventFormValues()` via setters (matchFormHelpers style).
 * @param {Record<string, unknown>} values
 * @param {Record<string, Function>} setters
 */
export function applyCreateEventFormReset(values, setters) {
  setters.setNewEventId?.(values.newEventId);
  setters.setNewEventName?.(values.newEventName);
  setters.setNewSetupPassword?.(values.newSetupPassword);
  setters.setNewMaxPointGap?.(values.newMaxPointGap);
  setters.setNewMaxGamjeom?.(values.newMaxGamjeom);
  setters.setNewRoundDuration?.(values.newRoundDuration);
  setters.setNewRestDuration?.(values.newRestDuration);
  setters.setNewIvrQuota?.(values.newIvrQuota);
  setters.setPdfParseResult?.(values.pdfParseResult);
}
