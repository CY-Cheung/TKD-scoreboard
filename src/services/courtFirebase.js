import { get, set, update, remove, ref, onValue } from "firebase/database";
import {
  flatCourtPath,
  flatCourtsRoot,
  legacyCourtsRoot,
  courtIdsFromCourtsMap,
} from "./courtPaths.js";

/**
 * Stage 5b/5: write court fields to flat `courts/{event}/{court}/…` only.
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

/** Stage 5: strip nested events/…/courts after flat courts exist. */
export async function removeLegacyCourtsForEvent(database, eventId) {
  await remove(ref(database, legacyCourtsRoot(eventId)));
}

/**
 * Ensure flat courts exist (backfill from legacy once), then delete nested courts.
 * Safe to call repeatedly — no-op when legacy is already gone.
 * @returns {{ stripped: boolean, courtIds: string[], error?: string }}
 */
export async function ensureFlatCourtsAndStripLegacy(database, eventId) {
  const flatSnap = await get(ref(database, flatCourtsRoot(eventId)));
  const legacySnap = await get(ref(database, legacyCourtsRoot(eventId)));

  if (!flatSnap.exists() && legacySnap.exists()) {
    await mirrorCourtsMapToFlat(database, eventId, legacySnap.val());
  }

  if (legacySnap.exists()) {
    try {
      await removeLegacyCourtsForEvent(database, eventId);
      return {
        stripped: true,
        courtIds: courtIdsFromCourtsMap(
          flatSnap.exists() ? flatSnap.val() : legacySnap.val()
        ),
      };
    } catch (err) {
      const error = err?.code || err?.message || String(err);
      console.warn("[stage5] strip legacy courts failed:", error);
      return {
        stripped: false,
        courtIds: courtIdsFromCourtsMap(
          flatSnap.exists() ? flatSnap.val() : legacySnap.val()
        ),
        error,
      };
    }
  }

  return {
    stripped: false,
    courtIds: courtIdsFromCourtsMap(flatSnap.exists() ? flatSnap.val() : null),
  };
}

/**
 * Clear ghost referee seats (no deviceId, or stale lastSeen) under flat courts.
 * @returns {{ cleared: string[] }}
 */
export async function clearGhostRefereeSeatsForEvent(database, eventId) {
  const flatSnap = await get(ref(database, flatCourtsRoot(eventId)));
  if (!flatSnap.exists()) return { cleared: [] };

  const cleared = [];
  const courtsMap = flatSnap.val() || {};
  const seats = ["J1", "J2", "J3"];
  const now = Date.now();
  const STALE_MS = 20_000;

  for (const [courtId, court] of Object.entries(courtsMap)) {
    const referees = court?.referees || {};
    for (const seat of seats) {
      const data = referees[seat];
      if (data == null) continue;
      const deviceId =
        typeof data === "object" && data !== null ? data.deviceId : data;
      const lastSeen =
        typeof data === "object" && data !== null
          ? Number(data.lastSeen)
          : null;
      const isGhost = deviceId == null || deviceId === "";
      const isStale =
        Number.isFinite(lastSeen) && now - lastSeen > STALE_MS;
      if (isGhost || isStale) {
        await clearRefereeSeat(database, eventId, courtId, seat);
        cleared.push(`${courtId}/${seat}`);
      }
    }
  }
  return { cleared };
}

/**
 * Clear one referee seat on flat courts (Stage 5: legacy nested courts removed).
 */
export async function clearRefereeSeat(database, eventId, courtId, seatName) {
  await set(
    ref(database, flatCourtPath(eventId, courtId, "referees", seatName)),
    null
  );
}

/**
 * Prefer flat courts list; one-shot legacy backfill + strip if needed.
 */
export async function fetchCourtIds(database, eventId) {
  const { courtIds } = await ensureFlatCourtsAndStripLegacy(database, eventId);
  return courtIds;
}

/**
 * Subscribe to flat court path only (Stage 5 — nested courts deleted).
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

  return onValue(flatRef, (snap) => {
    onData(snap.exists() ? snap.val() : null);
  });
}

const REFEREE_SEATS = Object.freeze(["J1", "J2", "J3"]);

/** Merge flat + legacy referee maps (legacy only as optional fill-in). */
export function mergeRefereeMaps(flatVal, legacyVal) {
  const merged = {};
  for (const seat of REFEREE_SEATS) {
    const value = flatVal?.[seat] ?? legacyVal?.[seat] ?? null;
    if (value != null) merged[seat] = value;
  }
  return merged;
}

/**
 * Subscribe to J1–J3 on flat courts only (Stage 5).
 */
export function subscribeCourtReferees(database, eventId, courtId, onData) {
  const flatRef = ref(
    database,
    flatCourtPath(eventId, courtId, "referees")
  );

  return onValue(flatRef, (snap) => {
    onData(mergeRefereeMaps(snap.exists() ? snap.val() : null, null));
  });
}

/** One-shot get: flat courts only (Stage 5). */
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
  return flatSnap.exists() ? flatSnap.val() : null;
}

/** Strip nested courts from an event payload before writing events/{id}. */
export function eventPayloadWithoutCourts(eventData) {
  if (!eventData || typeof eventData !== "object") return eventData;
  const { courts: _ignored, ...rest } = eventData;
  return rest;
}
