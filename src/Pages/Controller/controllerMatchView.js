/**
 * Pure Controller match header / score-gate helpers.
 * Seat grab, onDisconnect, heartbeat, and Api writes stay in Controller.jsx.
 */

export const DEFAULT_RED_NAME = "Hong (Red)";
export const DEFAULT_BLUE_NAME = "Chung (Blue)";

/**
 * Remote scoring is blocked while paused or in REST.
 * @param {{ state?: { isPaused?: boolean, phase?: string } } | null | undefined} matchData
 */
export function canAcceptScoreInput(matchData) {
  const isCurrentlyPaused = matchData?.state?.isPaused ?? true;
  if (isCurrentlyPaused) return false;
  if (matchData?.state?.phase === "REST") return false;
  return true;
}

/**
 * @param {object | null | undefined} matchData
 * @param {string | null | undefined} currentMatchId
 */
export function buildControllerMatchSummary(matchData, currentMatchId) {
  return {
    redName: matchData?.config?.competitors?.red?.name || DEFAULT_RED_NAME,
    blueName: matchData?.config?.competitors?.blue?.name || DEFAULT_BLUE_NAME,
    matchNo: matchData?.config?.matchId || currentMatchId || "N/A",
    currentRound: matchData?.state?.currentRound || 1,
    isPaused: matchData?.state?.isPaused ?? true,
  };
}

/** @param {unknown} user */
export function resolveControllerBackPath(user) {
  return user ? "/home" : "/court-setup";
}

/**
 * @param {"single" | "multiple" | string} refereeMode
 */
export function formatRefereeModeBadge(refereeMode) {
  return refereeMode === "multiple" ? "👥 Multi" : "👤 Single";
}

/**
 * @param {"red" | "blue"} side
 * @param {string} label
 */
export function buildScoreActionFeedback(side, label) {
  return { side, text: `${side.toUpperCase()} ${label}` };
}
