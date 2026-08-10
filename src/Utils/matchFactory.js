/**
 * Shared match document / event display helpers.
 * Pure factories only — callers own Firebase writes.
 */

import {
  DEFAULT_MAX_GAMJEOM,
  DEFAULT_MAX_POINT_GAP,
  DEFAULT_ROUNDS_TO_WIN,
  EMPTY_POINTS_STAT,
} from "./matchRules";

export const DEFAULT_ROUND_DURATION = 90;
export const DEFAULT_REST_DURATION = 60;

export function createEmptySideStats(extra = {}) {
  return {
    pointsStat: [...EMPTY_POINTS_STAT],
    gamjeom: 0,
    ...extra,
  };
}

export function createEmptyMatchStats() {
  return {
    roundWins: { red: 0, blue: 0 },
    blue: createEmptySideStats(),
    red: createEmptySideStats(),
  };
}

export function createDefaultMatchRules(overrides = {}) {
  return {
    maxGamjeom: DEFAULT_MAX_GAMJEOM,
    maxPointGap: DEFAULT_MAX_POINT_GAP,
    roundsToWin: DEFAULT_ROUNDS_TO_WIN,
    restDuration: DEFAULT_REST_DURATION,
    roundDuration: DEFAULT_ROUND_DURATION,
    ...overrides,
  };
}

export function createEmptyCompetitor(overrides = {}) {
  return {
    name: "",
    affiliatedClub: "",
    ...overrides,
  };
}

/**
 * Initial match.state for a brand-new match document.
 * Pass overrides for transaction fallbacks (e.g. timer: 0, dominantSide).
 */
export function createInitialMatchState(overrides = {}) {
  const { timer = DEFAULT_ROUND_DURATION, ...rest } = overrides;
  return {
    isStarted: false,
    isPaused: true,
    isFinished: false,
    currentRound: 1,
    timer,
    winnerSide: null,
    phase: "ROUND",
    winReason: null,
    ...rest,
  };
}

/**
 * Build a full empty match document { config, state, stats }.
 */
export function createEmptyMatch({
  matchId,
  nextMatchId = null,
  nextMatchSlot = null,
  categoryTitle = "",
  matchDate = "",
  courtCode = "",
  rules = {},
  competitors = {},
  state = {},
  configExtra = {},
} = {}) {
  const resolvedRules = createDefaultMatchRules(rules);
  return {
    config: {
      matchId,
      nextMatchId,
      nextMatchSlot,
      categoryTitle,
      matchDate,
      courtCode,
      rules: resolvedRules,
      competitors: {
        blue: createEmptyCompetitor(competitors.blue),
        red: createEmptyCompetitor(competitors.red),
      },
      ...configExtra,
    },
    state: createInitialMatchState({
      timer: resolvedRules.roundDuration,
      ...state,
    }),
    stats: createEmptyMatchStats(),
  };
}

/** Normalize legacy event name fields from Firebase event nodes. */
export function getEventDisplayName(eventVal, fallback = "") {
  if (!eventVal || typeof eventVal !== "object") return fallback;
  return (
    eventVal.EventName ||
    eventVal.eventName ||
    eventVal.settings?.eventName ||
    eventVal.name ||
    fallback
  );
}
