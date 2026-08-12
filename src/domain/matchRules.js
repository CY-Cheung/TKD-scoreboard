import { getScoreValue } from "./scoreMath.js";
import { DEFAULT_MATCH_RULES, resolveMatchRules } from "./defaultRules.js";

export { resolveMatchRules, DEFAULT_MATCH_RULES };

/**
 * Clear round-scoped scoring; keep match-scoped fields such as IVR remaining.
 * Preserves original Api.resetSideStatsForNextRound behaviour.
 */
export function resetSideStatsForNextRound(sideStats = {}) {
  const next = { gamjeom: 0, pointsStat: [0, 0, 0, 0, 0] };
  if (
    typeof sideStats.ivrRemaining === "number" &&
    !Number.isNaN(sideStats.ivrRemaining)
  ) {
    next.ivrRemaining = sideStats.ivrRemaining;
  }
  return next;
}

/**
 * Woo-se-girok / dominance helper used by Screen (and scoring UI).
 * @param {object} redStats
 * @param {object} blueStats
 * @param {number} [maxGamjeom=DEFAULT_MATCH_RULES.maxGamjeom]
 */
export function determineDominantSide(
  redStats,
  blueStats,
  maxGamjeom = DEFAULT_MATCH_RULES.maxGamjeom
) {
  const rG = redStats?.gamjeom || 0;
  const bG = blueStats?.gamjeom || 0;

  if (rG >= maxGamjeom) return "blue";
  if (bG >= maxGamjeom) return "red";

  const rP = redStats?.pointsStat || [0, 0, 0, 0, 0];
  const bP = blueStats?.pointsStat || [0, 0, 0, 0, 0];

  const redTotal = getScoreValue(redStats, blueStats);
  const blueTotal = getScoreValue(blueStats, redStats);

  if (redTotal > blueTotal) return "red";
  if (blueTotal > redTotal) return "blue";

  const redTurningPoints = (rP[3] || 0) * 4 + (rP[4] || 0) * 6;
  const blueTurningPoints = (bP[3] || 0) * 4 + (bP[4] || 0) * 6;
  if (redTurningPoints > blueTurningPoints) return "red";
  if (blueTurningPoints > redTurningPoints) return "blue";

  const redCount35 = (rP[2] || 0) + (rP[4] || 0);
  const blueCount35 = (bP[2] || 0) + (bP[4] || 0);
  if (redCount35 > blueCount35) return "red";
  if (blueCount35 > redCount35) return "blue";

  const redCount24 = (rP[1] || 0) + (rP[3] || 0);
  const blueCount24 = (bP[1] || 0) + (bP[3] || 0);
  if (redCount24 > blueCount24) return "red";
  if (blueCount24 > redCount24) return "blue";

  if ((rP[0] || 0) > (bP[0] || 0)) return "red";
  if ((bP[0] || 0) > (rP[0] || 0)) return "blue";

  if (rG < bG) return "red";
  if (bG < rG) return "blue";

  return "none";
}

/**
 * @returns {'red'|'blue'|null}
 */
export function getFinalWinnerSide(
  roundWins,
  roundsToWin = DEFAULT_MATCH_RULES.roundsToWin
) {
  const redWins = roundWins?.red || 0;
  const blueWins = roundWins?.blue || 0;
  if (redWins >= roundsToWin) return "red";
  if (blueWins >= roundsToWin) return "blue";
  return null;
}

export function isMatchFinal(
  roundWins,
  roundsToWin = DEFAULT_MATCH_RULES.roundsToWin
) {
  return getFinalWinnerSide(roundWins, roundsToWin) !== null;
}
