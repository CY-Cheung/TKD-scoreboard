/**
 * Shared match scoring / rule helpers.
 * Pure functions only — keep Firebase transactions out of this module.
 */

export const DEFAULT_MAX_GAMJEOM = 5;
export const DEFAULT_MAX_POINT_GAP = 15;
export const DEFAULT_ROUNDS_TO_WIN = 2;

/** Punch, Body, Head, Body(Turn), Head(Turn) */
export const POINT_WEIGHTS = [1, 2, 3, 4, 6];

export const EMPTY_POINTS_STAT = [0, 0, 0, 0, 0];

export function normalizePointsStat(pointsStat) {
  const old = pointsStat || [];
  return [
    old[0] || 0,
    old[1] || 0,
    old[2] || 0,
    old[3] || 0,
    old[4] || 0,
  ];
}

/** Total score for one side, including opponent gam-jeom contributions. */
export function getScoreValue(stats, opponentStats) {
  const p = normalizePointsStat(stats?.pointsStat);
  const points =
    p[0] * POINT_WEIGHTS[0] +
    p[1] * POINT_WEIGHTS[1] +
    p[2] * POINT_WEIGHTS[2] +
    p[3] * POINT_WEIGHTS[3] +
    p[4] * POINT_WEIGHTS[4];
  return points + (opponentStats?.gamjeom || 0) + (opponentStats?.gamjeomAvoiding || 0);
}

export function resolveMatchRules(rules = {}) {
  return {
    maxGamjeom: rules.maxGamjeom || DEFAULT_MAX_GAMJEOM,
    maxPointGap: rules.maxPointGap || DEFAULT_MAX_POINT_GAP,
    roundsToWin: rules.roundsToWin || DEFAULT_ROUNDS_TO_WIN,
  };
}

export function isMatchFinal(roundWins = {}, roundsToWin = DEFAULT_ROUNDS_TO_WIN) {
  return (roundWins.red || 0) >= roundsToWin || (roundWins.blue || 0) >= roundsToWin;
}

export function getFinalWinnerSide(roundWins = {}, roundsToWin = DEFAULT_ROUNDS_TO_WIN) {
  if ((roundWins.red || 0) >= roundsToWin) return "red";
  if ((roundWins.blue || 0) >= roundsToWin) return "blue";
  return null;
}

/**
 * Superiority / dominance helper for Screen highlighting.
 * Gam-jeom threshold comes from match rules (defaults to 5).
 */
export function determineDominantSide(redStats, blueStats, rules = {}) {
  const { maxGamjeom } = resolveMatchRules(rules);
  const rG = redStats?.gamjeom || 0;
  const bG = blueStats?.gamjeom || 0;

  if (rG >= maxGamjeom) return "blue";
  if (bG >= maxGamjeom) return "red";

  const rP = normalizePointsStat(redStats?.pointsStat);
  const bP = normalizePointsStat(blueStats?.pointsStat);

  const redTotal = getScoreValue(redStats, blueStats);
  const blueTotal = getScoreValue(blueStats, redStats);

  if (redTotal > blueTotal) return "red";
  if (blueTotal > redTotal) return "blue";

  const redTurningPoints = rP[3] * POINT_WEIGHTS[3] + rP[4] * POINT_WEIGHTS[4];
  const blueTurningPoints = bP[3] * POINT_WEIGHTS[3] + bP[4] * POINT_WEIGHTS[4];
  if (redTurningPoints > blueTurningPoints) return "red";
  if (blueTurningPoints > redTurningPoints) return "blue";

  const redCount35 = rP[2] + rP[4];
  const blueCount35 = bP[2] + bP[4];
  if (redCount35 > blueCount35) return "red";
  if (blueCount35 > redCount35) return "blue";

  const redCount24 = rP[1] + rP[3];
  const blueCount24 = bP[1] + bP[3];
  if (redCount24 > blueCount24) return "red";
  if (blueCount24 > redCount24) return "blue";

  if (rP[0] > bP[0]) return "red";
  if (bP[0] > rP[0]) return "blue";

  if (rG < bG) return "red";
  if (bG < rG) return "blue";

  return "none";
}
