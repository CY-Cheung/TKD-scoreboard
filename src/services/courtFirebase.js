import { get, set, update, remove, ref, onValue } from "firebase/database";
import {
  flatCourtPath,
  legacyCourtPath,
  flatCourtsRoot,
  legacyCourtsRoot,
  courtIdsFromCourtsMap,
} from "./courtPaths.js";

/**
 * Stage 5b: write court fields to flat `courts/{event}/{court}/…` only.
 * Legacy `events/…/courts` is no longer dual-written (reads may still fall back).
 * Function names keep `dual*` for call-site stability.
 */
export async function dualSetCourtField(
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

export async function dualUpdateCourtField(
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

/** Mirror a full court object map under courts/{eventId}/… */
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

/** Optional: strip nested events/…/courts after cutover (Stage 5 delete). */
export async function removeLegacyCourtsForEvent(database, eventId) {
  await remove(ref(database, legacyCourtsRoot(eventId)));
}

/**
 * Clear one referee seat on flat (primary) and best-effort on legacy
 * so Stage 5b cutover does not leave dual-write ghosts.
 */
export async function clearRefereeSeat(database, eventId, courtId, seatName) {
  await set(
    ref(database, flatCourtPath(eventId, courtId, "referees", seatName)),
    null
  );
  try {
    await set(
      ref(database, legacyCourtPath(eventId, courtId, "referees", seatName)),
      null
    );
  } catch {
    // legacy may already be gone or rules-denied; flat is source of truth
  }
}

/**
 * Prefer flat courts list; fallback legacy; best-effort backfill to flat.
 */
export async function fetchCourtIds(database, eventId) {
  const flatSnap = await get(ref(database, flatCourtsRoot(eventId)));
  if (flatSnap.exists()) {
    return courtIdsFromCourtsMap(flatSnap.val());
  }

  const legacySnap = await get(ref(database, legacyCourtsRoot(eventId)));
  if (!legacySnap.exists()) return [];

  const legacyVal = legacySnap.val();
  try {
    await mirrorCourtsMapToFlat(database, eventId, legacyVal);
  } catch (err) {
    console.warn("courts flat backfill skipped:", err?.message || err);
  }
  return courtIdsFromCourtsMap(legacyVal);
}

/**
 * Subscribe preferring flat path; fall back to legacy while flat is absent.
 * @returns unsubscribe
 */
export function subscribePreferFlatCourt(
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
  const legacyRef = ref(
    database,
    legacyCourtPath(eventId, courtId, ...segments)
  );

  let flatExists = false;
  let flatVal = null;
  let legacyVal = null;

  const emit = () => {
    onData(flatExists ? flatVal : legacyVal);
  };

  const unsubFlat = onValue(flatRef, (snap) => {
    flatExists = snap.exists();
    flatVal = snap.val();
    emit();
  });
  const unsubLegacy = onValue(legacyRef, (snap) => {
    legacyVal = snap.val();
    emit();
  });

  return () => {
    unsubFlat();
    unsubLegacy();
  };
}

const REFEREE_SEATS = Object.freeze(["J1", "J2", "J3"]);

/** Merge flat + legacy referee maps (legacy only as read fallback during cutover). */
export function mergeRefereeMaps(flatVal, legacyVal) {
  const merged = {};
  for (const seat of REFEREE_SEATS) {
    const value = flatVal?.[seat] ?? legacyVal?.[seat] ?? null;
    if (value != null) merged[seat] = value;
  }
  return merged;
}

/**
 * Subscribe to J1–J3.
 * Stage 5b: emit flat seats when the flat referees node exists; otherwise
 * merge in legacy so pre-cutover seats still show until backfilled/cleared.
 */
export function subscribeCourtReferees(database, eventId, courtId, onData) {
  const flatRef = ref(
    database,
    flatCourtPath(eventId, courtId, "referees")
  );
  const legacyRef = ref(
    database,
    legacyCourtPath(eventId, courtId, "referees")
  );

  let flatExists = false;
  let flatVal = null;
  let legacyVal = null;

  const emit = () => {
    if (flatExists) {
      onData(mergeRefereeMaps(flatVal, null));
    } else {
      onData(mergeRefereeMaps(flatVal, legacyVal));
    }
  };

  const unsubFlat = onValue(flatRef, (snap) => {
    flatExists = snap.exists();
    flatVal = snap.exists() ? snap.val() : null;
    emit();
  });
  const unsubLegacy = onValue(legacyRef, (snap) => {
    legacyVal = snap.exists() ? snap.val() : null;
    emit();
  });

  return () => {
    unsubFlat();
    unsubLegacy();
  };
}

/** One-shot get: prefer flat, else legacy. */
export async function getPreferFlatCourt(
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
  if (flatSnap.exists()) return flatSnap.val();
  const legacySnap = await get(
    ref(database, legacyCourtPath(eventId, courtId, ...segments))
  );
  return legacySnap.exists() ? legacySnap.val() : null;
}

/** Strip nested courts from an event payload before writing events/{id}. */
export function eventPayloadWithoutCourts(eventData) {
  if (!eventData || typeof eventData !== "object") return eventData;
  const { courts: _ignored, ...rest } = eventData;
  return rest;
}
