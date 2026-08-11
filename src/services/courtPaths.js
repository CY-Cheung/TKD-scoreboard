/**
 * Court path helpers — Stage 2 RTDB flattening (dual-write courts).
 * @see docs/FIREBASE_FLATTENING_PLAN.md
 */

/** New top-level court tree: courts/{eventId}/{courtId}/… */
export function flatCourtPath(eventId, courtId, ...segments) {
  const base = `courts/${eventId}/${courtId}`;
  return segments.length ? `${base}/${segments.join("/")}` : base;
}

/** Legacy nested court tree: events/{eventId}/courts/{courtId}/… */
export function legacyCourtPath(eventId, courtId, ...segments) {
  const base = `events/${eventId}/courts/${courtId}`;
  return segments.length ? `${base}/${segments.join("/")}` : base;
}

export function flatCourtsRoot(eventId) {
  return `courts/${eventId}`;
}

export function legacyCourtsRoot(eventId) {
  return `events/${eventId}/courts`;
}

export function flatRefereeSeatPath(eventId, courtId, seatName) {
  return flatCourtPath(eventId, courtId, "referees", seatName);
}

export function legacyRefereeSeatPath(eventId, courtId, seatName) {
  return legacyCourtPath(eventId, courtId, "referees", seatName);
}

/** Primary seat path for Stage 2+ (flat). */
export function refereeSeatPath(eventId, courtId, seatName) {
  return flatRefereeSeatPath(eventId, courtId, seatName);
}

export function courtIdsFromCourtsMap(courtsVal) {
  if (!courtsVal || typeof courtsVal !== "object") return [];
  return Object.keys(courtsVal);
}
