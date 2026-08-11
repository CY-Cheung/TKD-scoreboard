/**
 * Match path helpers — Stage 3 RTDB flattening (matchLive dual-write).
 * @see docs/FIREBASE_FLATTENING_PLAN.md
 */

/** Legacy full match (config + live): events/{eventId}/matches/{matchId} */
export function legacyMatchPath(eventId, matchId, ...segments) {
  const base = `events/${eventId}/matches/${matchId}`;
  return segments.length ? `${base}/${segments.join("/")}` : base;
}

export function legacyMatchesRoot(eventId) {
  return `events/${eventId}/matches`;
}

/** Live-only tree: matchLive/{eventId}/{matchId} */
export function matchLivePath(eventId, matchId, ...segments) {
  const base = `matchLive/${eventId}/${matchId}`;
  return segments.length ? `${base}/${segments.join("/")}` : base;
}

export function matchLiveRoot(eventId) {
  return `matchLive/${eventId}`;
}

/** Static config leaf under legacy match. */
export function legacyMatchConfigPath(eventId, matchId) {
  return legacyMatchPath(eventId, matchId, "config");
}

export const MATCH_LIVE_KEYS = Object.freeze([
  "state",
  "stats",
  "votes",
  "recentScores",
  "providedCourtId",
  "providedDeviceId",
]);

/** Pull live fields from a full legacy match object. */
export function extractMatchLivePayload(matchData) {
  if (!matchData || typeof matchData !== "object") {
    return {
      state: null,
      stats: null,
      votes: null,
      recentScores: null,
      providedCourtId: null,
      providedDeviceId: null,
    };
  }
  return {
    state: matchData.state ?? null,
    stats: matchData.stats ?? null,
    votes: matchData.votes ?? null,
    recentScores: matchData.recentScores ?? null,
    providedCourtId: matchData.providedCourtId ?? null,
    providedDeviceId: matchData.providedDeviceId ?? null,
  };
}

/** Merge legacy config + live payload into the shape UI expects. */
export function mergeMatchView(config, livePayload, legacyFallback = null) {
  if (livePayload) {
    return {
      config: config ?? legacyFallback?.config ?? null,
      state: livePayload.state ?? legacyFallback?.state ?? null,
      stats: livePayload.stats ?? legacyFallback?.stats ?? null,
      votes: livePayload.votes ?? legacyFallback?.votes ?? null,
      recentScores: livePayload.recentScores ?? legacyFallback?.recentScores ?? null,
      providedCourtId:
        livePayload.providedCourtId ?? legacyFallback?.providedCourtId ?? null,
      providedDeviceId:
        livePayload.providedDeviceId ?? legacyFallback?.providedDeviceId ?? null,
    };
  }
  return legacyFallback;
}
