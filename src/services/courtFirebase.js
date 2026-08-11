import { get, set, update, remove, ref, onValue } from "firebase/database";
import {
  flatCourtPath,
  legacyCourtPath,
  flatCourtsRoot,
  legacyCourtsRoot,
  courtIdsFromCourtsMap,
} from "./courtPaths.js";

/**
 * Write the same value to flat + legacy court paths (Stage 2 dual-write).
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
  await Promise.all([
    set(ref(database, flatCourtPath(eventId, courtId, ...segments)), value),
    set(ref(database, legacyCourtPath(eventId, courtId, ...segments)), value),
  ]);
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
  await Promise.all([
    update(ref(database, flatCourtPath(eventId, courtId, ...segments)), patch),
    update(
      ref(database, legacyCourtPath(eventId, courtId, ...segments)),
      patch
    ),
  ]);
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

/** Merge flat + legacy referee maps so a seat claimed on either path is visible. */
export function mergeRefereeMaps(flatVal, legacyVal) {
  const merged = {};
  for (const seat of REFEREE_SEATS) {
    const value = flatVal?.[seat] ?? legacyVal?.[seat] ?? null;
    if (value != null) merged[seat] = value;
  }
  return merged;
}

/**
 * Subscribe to J1–J3 by merging flat + legacy (Stage 2 dual-write safe).
 * Prefer-flat alone can hide a legacy-only seat claim.
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

  let flatVal = null;
  let legacyVal = null;

  const emit = () => {
    onData(mergeRefereeMaps(flatVal, legacyVal));
  };

  const unsubFlat = onValue(flatRef, (snap) => {
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
