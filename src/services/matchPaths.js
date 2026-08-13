/**
 * Match path helpers — flat RTDB layout.
 * @see docs/FIREBASE_MULTI_DEVICE_DESIGN.md
 */

/** Live-only tree: matchLive/{eventId}/{matchId} */
export function matchLivePath(eventId, matchId, ...segments) {
  const base = `matchLive/${eventId}/${matchId}`;
  return segments.length ? `${base}/${segments.join("/")}` : base;
}

export function matchLiveRoot(eventId) {
  return `matchLive/${eventId}`;
}

/** Static config: matches/{eventId}/{matchId}/config */
export function flatMatchConfigPath(eventId, matchId, ...segments) {
  const base = `matches/${eventId}/${matchId}/config`;
  return segments.length ? `${base}/${segments.join("/")}` : base;
}

export function flatMatchesRoot(eventId) {
  return `matches/${eventId}`;
}

/** Bracket/list summary: matchIndex/{eventId}/{matchId} */
export function matchIndexPath(eventId, matchId) {
  return `matchIndex/${eventId}/${matchId}`;
}

export function matchIndexRoot(eventId) {
  return `matchIndex/${eventId}`;
}

/** Pull live fields from a match document (or live node). */
export function extractMatchLivePayload(matchData, now = Date.now()) {
  // Always include updatedAt so matchLive/{event}/{match} materializes in Console
  // even when other live fields are still null (Firebase omits all-null sets).
  if (!matchData || typeof matchData !== "object") {
    return {
      state: null,
      stats: null,
      votes: null,
      recentScores: null,
      providedCourtId: null,
      providedDeviceId: null,
      updatedAt: now,
    };
  }
  return {
    state: matchData.state ?? null,
    stats: matchData.stats ?? null,
    votes: matchData.votes ?? null,
    recentScores: matchData.recentScores ?? null,
    providedCourtId: matchData.providedCourtId ?? null,
    providedDeviceId: matchData.providedDeviceId ?? null,
    updatedAt: now,
  };
}

/** Config object from a full match document (or already-a-config object). */
export function extractMatchConfig(matchData) {
  if (!matchData || typeof matchData !== "object") return null;
  if (matchData.config && typeof matchData.config === "object") {
    return matchData.config;
  }
  // Already a config-shaped node (has matchId / competitors / rules)
  if (matchData.competitors || matchData.rules || matchData.matchId) {
    return matchData;
  }
  return null;
}

/**
 * Light index row for DataImport filters / future list UI.
 * Keep small — no state/stats/votes.
 */
export function extractMatchIndexPayload(matchData) {
  const config = extractMatchConfig(matchData) || {};
  const red = config.competitors?.red || {};
  const blue = config.competitors?.blue || {};
  return {
    matchId: config.matchId ?? null,
    matchDate: config.matchDate ?? null,
    categoryTitle: config.categoryTitle ?? null,
    courtCode: config.courtCode ?? null,
    nextMatchId: config.nextMatchId ?? null,
    nextMatchSlot: config.nextMatchSlot ?? null,
    redName: red.name ?? null,
    redClub: red.affiliatedClub ?? null,
    blueName: blue.name ?? null,
    blueClub: blue.affiliatedClub ?? null,
  };
}

/**
 * Assemble UI match docs from flat `matches/{e}/{m}/config` map + matchLive map.
 * Flat get(matches/{e}) → { [matchId]: { config: {...} } }
 */
export function assembleMatchesFromFlat(flatMatchesVal, liveVal) {
  const flat = flatMatchesVal && typeof flatMatchesVal === "object" ? flatMatchesVal : {};
  const live = liveVal && typeof liveVal === "object" ? liveVal : {};
  const out = {};
  for (const matchId of Object.keys(flat)) {
    const node = flat[matchId] || {};
    const config = node.config ?? null;
    const liveNode = live[matchId] || {};
    out[matchId] = {
      config,
      state: liveNode.state ?? null,
      stats: liveNode.stats ?? null,
      votes: liveNode.votes ?? null,
      recentScores: liveNode.recentScores ?? null,
      providedCourtId: liveNode.providedCourtId ?? null,
      providedDeviceId: liveNode.providedDeviceId ?? null,
    };
  }
  return out;
}
