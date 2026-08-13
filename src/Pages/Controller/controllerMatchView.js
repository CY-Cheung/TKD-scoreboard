/**
 * Pure Controller match header / score-gate helpers.
 * Seat grab, onDisconnect, heartbeat, and Api writes stay in Controller.jsx.
 */

import { getScoreValue } from "../../domain/scoreMath.js";

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
  const redStats = matchData?.stats?.red;
  const blueStats = matchData?.stats?.blue;
  return {
    redName: matchData?.config?.competitors?.red?.name || DEFAULT_RED_NAME,
    blueName: matchData?.config?.competitors?.blue?.name || DEFAULT_BLUE_NAME,
    matchNo: matchData?.config?.matchId || currentMatchId || "N/A",
    currentRound: matchData?.state?.currentRound || 1,
    isPaused: matchData?.state?.isPaused ?? true,
    /** Same totals as Screen scoreboard (display only). */
    redScore: getScoreValue(redStats, blueStats),
    blueScore: getScoreValue(blueStats, redStats),
  };
}

/**
 * Split Controller toast/label "+6 Turn Head" into name + points for pad UI.
 * @param {string} label
 */
export function parseScoreActionLabel(label = "") {
  const m = String(label).trim().match(/^([+-]?\d+)\s+(.+)$/);
  if (!m) {
    return { points: String(label || ""), name: "" };
  }
  const raw = m[1];
  const points = raw.startsWith("+") || raw.startsWith("-") ? raw : `+${raw}`;
  return { points, name: m[2].trim() };
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
