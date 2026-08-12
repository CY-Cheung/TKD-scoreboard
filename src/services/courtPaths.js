/**
 * Court path helpers — flat RTDB courts tree.
 * @see docs/FIREBASE_FLATTENING_PLAN.md
 */

/** Top-level court tree: courts/{eventId}/{courtId}/… */
export function flatCourtPath(eventId, courtId, ...segments) {
  const base = `courts/${eventId}/${courtId}`;
  return segments.length ? `${base}/${segments.join("/")}` : base;
}

export function flatCourtsRoot(eventId) {
  return `courts/${eventId}`;
}

export function flatRefereeSeatPath(eventId, courtId, seatName) {
  return flatCourtPath(eventId, courtId, "referees", seatName);
}

/** Primary referee seat path (flat courts). */
export function refereeSeatPath(eventId, courtId, seatName) {
  return flatRefereeSeatPath(eventId, courtId, seatName);
}

export function courtIdsFromCourtsMap(courtsVal) {
  if (!courtsVal || typeof courtsVal !== "object") return [];
  return Object.keys(courtsVal);
}
