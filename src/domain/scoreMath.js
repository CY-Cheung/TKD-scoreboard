import { POINT_WEIGHTS } from "./defaultRules.js";

/**
 * Total display / comparison score for one side:
 * weighted pointsStat + opponent gamjeom + opponent gamjeomAvoiding.
 * Preserves original Api.getScoreValue / Screen.calculateScore behaviour.
 */
export function getScoreValue(stats, opponentStats) {
  const p = stats?.pointsStat || [0, 0, 0, 0, 0];
  const points =
    (p[0] || 0) * POINT_WEIGHTS[0] +
    (p[1] || 0) * POINT_WEIGHTS[1] +
    (p[2] || 0) * POINT_WEIGHTS[2] +
    (p[3] || 0) * POINT_WEIGHTS[3] +
    (p[4] || 0) * POINT_WEIGHTS[4];
  return (
    points +
    (opponentStats?.gamjeom || 0) +
    (opponentStats?.gamjeomAvoiding || 0)
  );
}
