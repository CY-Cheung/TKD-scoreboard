/**
 * Single source of default match rules / scoring weights.
 * Used by Api, Screen, Create Event flows, and pdfParser (call sites migrate in waves).
 */

export const POINT_WEIGHTS = Object.freeze([1, 2, 3, 4, 6]);

export const DEFAULT_MATCH_RULES = Object.freeze({
  maxPointGap: 15,
  maxGamjeom: 5,
  roundDuration: 90,
  restDuration: 60,
  roundsToWin: 2,
});

/**
 * Merge partial rules with defaults (shallow).
 */
export function resolveMatchRules(rules = {}) {
  return {
    maxPointGap: rules.maxPointGap ?? DEFAULT_MATCH_RULES.maxPointGap,
    maxGamjeom: rules.maxGamjeom ?? DEFAULT_MATCH_RULES.maxGamjeom,
    roundDuration: rules.roundDuration ?? DEFAULT_MATCH_RULES.roundDuration,
    restDuration: rules.restDuration ?? DEFAULT_MATCH_RULES.restDuration,
    roundsToWin: rules.roundsToWin ?? DEFAULT_MATCH_RULES.roundsToWin,
  };
}
