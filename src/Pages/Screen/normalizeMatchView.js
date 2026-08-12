/**
 * Normalize subscribeMatchView payloads so Screen never sees null config/state/stats.
 * (JS default destructuring does not replace null — only undefined.)
 */
export function normalizeMatchView(matchData) {
  if (!matchData || typeof matchData !== "object") {
    return { config: {}, state: {}, stats: {}, votes: {}, recentScores: {} };
  }
  return {
    ...matchData,
    config:
      matchData.config && typeof matchData.config === "object"
        ? matchData.config
        : {},
    state:
      matchData.state && typeof matchData.state === "object"
        ? matchData.state
        : {},
    stats:
      matchData.stats && typeof matchData.stats === "object"
        ? matchData.stats
        : {},
  };
}
