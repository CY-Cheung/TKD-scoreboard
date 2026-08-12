import { DEFAULT_MATCH_RULES } from "../domain/defaultRules.js";

/**
 * Rules shape stored on matches / create-event forms.
 * Intentionally omits roundsToWin (create/PDF historically did not write it).
 */
export function createStoredMatchRules(overrides = {}) {
  return {
    maxPointGap: overrides.maxPointGap ?? DEFAULT_MATCH_RULES.maxPointGap,
    maxGamjeom: overrides.maxGamjeom ?? DEFAULT_MATCH_RULES.maxGamjeom,
    roundDuration: overrides.roundDuration ?? DEFAULT_MATCH_RULES.roundDuration,
    restDuration: overrides.restDuration ?? DEFAULT_MATCH_RULES.restDuration,
  };
}

export function createEmptyCompetitors() {
  return {
    blue: { name: "", affiliatedClub: "" },
    red: { name: "", affiliatedClub: "" },
  };
}

export function createInitialMatchState(roundDuration = DEFAULT_MATCH_RULES.roundDuration) {
  return {
    isStarted: false,
    isPaused: true,
    isFinished: false,
    currentRound: 1,
    timer: roundDuration,
    winnerSide: null,
    phase: "ROUND",
    winReason: null,
  };
}

export function createInitialMatchStats() {
  return {
    roundWins: { red: 0, blue: 0 },
    blue: { pointsStat: [0, 0, 0, 0, 0], gamjeom: 0 },
    red: { pointsStat: [0, 0, 0, 0, 0], gamjeom: 0 },
  };
}

/**
 * Empty match shell used by PDF parser (config only + later state/stats).
 */
export function createEmptyMatchConfig({
  matchId,
  categoryTitle = "",
  matchDate = "",
  courtCode = "",
  rules,
} = {}) {
  return {
    matchId,
    nextMatchId: null,
    nextMatchSlot: null,
    categoryTitle,
    matchDate,
    courtCode,
    rules: createStoredMatchRules(rules),
    competitors: createEmptyCompetitors(),
  };
}

/**
 * Full match document for DataImport "Add Match" form.
 * `rules` should already include IVR quota if applicable.
 */
export function createMatchDocument({
  matchId,
  nextMatchId = null,
  nextMatchSlot = null,
  rules,
  competitors,
  roundDuration,
} = {}) {
  const timer =
    typeof roundDuration === "number" && !Number.isNaN(roundDuration)
      ? roundDuration
      : rules?.roundDuration ?? DEFAULT_MATCH_RULES.roundDuration;

  return {
    config: {
      matchId,
      nextMatchId: nextMatchId || null,
      nextMatchSlot: nextMatchSlot || null,
      rules,
      competitors,
    },
    state: createInitialMatchState(timer),
    stats: createInitialMatchStats(),
  };
}

/**
 * Attach state/stats to a PDF-parsed match config (drops layout-only fields).
 */
export function finalizeParsedMatch(parsedMatch) {
  return {
    config: parsedMatch.config,
    state: createInitialMatchState(parsedMatch.config.rules.roundDuration),
    stats: createInitialMatchStats(),
  };
}
