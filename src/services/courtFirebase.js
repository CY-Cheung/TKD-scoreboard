import { get, set, update, remove, ref, onValue } from "firebase/database";
import {
  flatCourtPath,
  flatCourtsRoot,
  courtIdsFromCourtsMap,
} from "./courtPaths.js";
import { getMatchLoadConflict } from "./matchCourtBinding.js";

/** Write a court field under `courts/{event}/{court}/…`. */
export async function setCourtField(
  database,
  eventId,
  courtId,
  relativeSegments,
  value
) {
  const segments = Array.isArray(relativeSegments)
    ? relativeSegments
    : [relativeSegments];
  await set(ref(database, flatCourtPath(eventId, courtId, ...segments)), value);
}

/** Update court fields under `courts/{event}/{court}/…`. */
export async function updateCourtField(
  database,
  eventId,
  courtId,
  relativeSegments,
  patch
) {
  const segments = Array.isArray(relativeSegments)
    ? relativeSegments
    : [relativeSegments];
  await update(
    ref(database, flatCourtPath(eventId, courtId, ...segments)),
    patch
  );
}

/** Write a full court object map under courts/{eventId}/… */
export async function mirrorCourtsMapToFlat(database, eventId, courtsMap) {
  if (!courtsMap || typeof courtsMap !== "object") return;
  const writes = Object.entries(courtsMap).map(([courtId, data]) =>
    set(ref(database, flatCourtPath(eventId, courtId)), data)
  );
  await Promise.all(writes);
}

export async function removeFlatCourtsForEvent(database, eventId) {
  await remove(ref(database, flatCourtsRoot(eventId)));
}

/** Clear one referee seat on flat courts. */
export async function clearRefereeSeat(database, eventId, courtId, seatName) {
  await set(
    ref(database, flatCourtPath(eventId, courtId, "referees", seatName)),
    null
  );
}

/** List court ids from flat `courts/{eventId}`. */
export async function fetchCourtIds(database, eventId) {
  const flatSnap = await get(ref(database, flatCourtsRoot(eventId)));
  return courtIdsFromCourtsMap(flatSnap.exists() ? flatSnap.val() : null);
}

/**
 * Subscribe to a flat court path.
 * @returns unsubscribe
 */
export function subscribeCourt(
  database,
  eventId,
  courtId,
  relativeSegments,
  onData
) {
  const segments = Array.isArray(relativeSegments)
    ? relativeSegments
    : [relativeSegments];
  const flatRef = ref(
    database,
    flatCourtPath(eventId, courtId, ...segments)
  );

  return onValue(flatRef, (snap) => {
    onData(snap.exists() ? snap.val() : null);
  });
}

const REFEREE_SEATS = Object.freeze(["J1", "J2", "J3"]);

/** Normalize a referees map to J1–J3 keys only. */
export function normalizeRefereeMap(refereesVal) {
  const out = {};
  for (const seat of REFEREE_SEATS) {
    const value = refereesVal?.[seat] ?? null;
    if (value != null) out[seat] = value;
  }
  return out;
}

/** Subscribe to J1–J3 on flat courts. */
export function subscribeCourtReferees(database, eventId, courtId, onData) {
  const flatRef = ref(
    database,
    flatCourtPath(eventId, courtId, "referees")
  );

  return onValue(flatRef, (snap) => {
    onData(normalizeRefereeMap(snap.exists() ? snap.val() : null));
  });
}

/** One-shot get from flat courts. */
export async function getCourt(
  database,
  eventId,
  courtId,
  relativeSegments
) {
  const segments = Array.isArray(relativeSegments)
    ? relativeSegments
    : [relativeSegments];
  const flatSnap = await get(
    ref(database, flatCourtPath(eventId, courtId, ...segments))
  );
  return flatSnap.exists() ? flatSnap.val() : null;
}

/** One-shot get of all courts under an event (`courts/{eventId}`). */
export async function fetchCourtsMap(database, eventId) {
  const flatSnap = await get(ref(database, flatCourtsRoot(eventId)));
  return flatSnap.exists() ? flatSnap.val() : {};
}

/**
 * Set `currentMatchId` only if no *other* court already holds this match.
 * Same-court reload is allowed. matchLive is shared per matchId — dual bind
 * would cross-wire score/timer across venues.
 *
 * @throws {{ code: 'MATCH_BOUND_OTHER_COURT', conflictingCourtIds: string[] }}
 */
export async function loadMatchToCourt(
  database,
  eventId,
  courtId,
  matchId
) {
  const courtsMap = await fetchCourtsMap(database, eventId);
  const conflict = getMatchLoadConflict({
    courtsMap,
    matchId,
    targetCourtId: courtId,
  });
  if (conflict) {
    const err = new Error(
      `Match ${matchId} already bound to ${conflict.conflictingCourtIds.join(", ")}`
    );
    err.code = "MATCH_BOUND_OTHER_COURT";
    err.conflictingCourtIds = conflict.conflictingCourtIds;
    throw err;
  }
  await setCourtField(database, eventId, courtId, "currentMatchId", matchId);
}

/** Strip nested courts from an event payload before writing events/{id}. */
export function eventPayloadWithoutCourts(eventData) {
  if (!eventData || typeof eventData !== "object") return eventData;
  const { courts: _ignored, ...rest } = eventData;
  return rest;
}

/**
 * Write shape for events/{id}: meta + settings only.
 * Courts → top-level courts/; matches → matches/…/config + matchLive + matchIndex.
 */
export function eventMetaPayloadForWrite(eventData) {
  const base = eventPayloadWithoutCourts(eventData);
  if (!base || typeof base !== "object") return base;
  const { matches: _ignoredMatches, ...rest } = base;
  return rest;
}
