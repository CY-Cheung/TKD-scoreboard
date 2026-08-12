/**
 * Pure DataImport selection / display helpers.
 * Firebase CRUD stays orchestrated in DataImport.jsx.
 */

/**
 * Pick default event id after fetching the list.
 * @param {Array<{ id: string }>} list
 * @param {string | null | undefined} sessionEventId
 * @param {string} currentEventId
 * @returns {string}
 */
export function pickDefaultEventId(list, sessionEventId, currentEventId) {
  if (!list?.length) return "";
  if (currentEventId) return currentEventId;
  if (sessionEventId && list.some((e) => e.id === sessionEventId)) {
    return sessionEventId;
  }
  return list[0].id;
}

/**
 * @param {Array<{ id: string, displayName?: string }>} eventsList
 * @param {string} eventId
 */
export function resolveEventDisplayName(eventsList, eventId) {
  return (
    eventsList.find((e) => e.id === eventId)?.displayName ||
    eventId ||
    "Event"
  );
}
