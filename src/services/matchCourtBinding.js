/**
 * Pure helpers: one matchLive doc per matchId — do not bind the same match
 * to two courts at once (shared score/timer).
 */

/**
 * @param {Record<string, { currentMatchId?: string }> | null | undefined} courtsMap
 * @param {string} matchId
 * @returns {string[]}
 */
export function listCourtsBoundToMatch(courtsMap, matchId) {
  if (!courtsMap || typeof courtsMap !== "object" || !matchId) return [];
  return Object.entries(courtsMap)
    .filter(([, data]) => data?.currentMatchId === matchId)
    .map(([courtId]) => courtId);
}

/**
 * @returns {null | { conflictingCourtIds: string[] }}
 * null = safe to load (including re-load onto the same court).
 */
export function getMatchLoadConflict({
  courtsMap,
  matchId,
  targetCourtId,
}) {
  const conflictingCourtIds = listCourtsBoundToMatch(courtsMap, matchId).filter(
    (courtId) => courtId !== targetCourtId
  );
  if (conflictingCourtIds.length === 0) return null;
  return { conflictingCourtIds };
}

/**
 * Toast / UI copy for a blocked load.
 * @param {string} matchId
 * @param {string[]} conflictingCourtIds
 * @param {string} targetCourtId
 */
export function matchLoadConflictMessage(
  matchId,
  conflictingCourtIds,
  targetCourtId
) {
  const others = conflictingCourtIds.join(", ");
  return (
    `Cannot load match ${matchId} to ${targetCourtId}: ` +
    `already bound to ${others}. ` +
    `Unload it there first (one matchLive per match — shared score/timer).`
  );
}
