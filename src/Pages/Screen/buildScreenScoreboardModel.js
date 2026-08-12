/**
 * Pure Screen scoreboard view-model (post normalizeMatchView).
 * rAF timer displayTime and Firebase stay in Screen.jsx.
 */

import { getScoreValue } from "../../domain/scoreMath.js";
import {
  determineDominantSide,
  isMatchFinal,
  resolveMatchRules,
} from "../../domain/matchRules.js";
import { getEffectiveIvrRemaining } from "../../Api";
import { resolveScreenBoardColors } from "./screenBoardColors.js";

/**
 * @param {{
 *   state: object,
 *   config: object,
 *   stats: object,
 *   isMatchLoaded: boolean,
 *   eventSettings: object,
 *   matchRules: object,
 * }} input
 */
export function buildScreenScoreboardModel({
  state,
  config,
  stats,
  isMatchLoaded,
  eventSettings,
  matchRules,
}) {
  const {
    phase = "ROUND",
    currentRound: matchCurrentRound,
    winReason,
    isPaused = true,
  } = state;

  const roundScores =
    stats.roundScores && typeof stats.roundScores === "object"
      ? stats.roundScores
      : {};
  const matchRoundWins =
    stats.roundWins && typeof stats.roundWins === "object"
      ? stats.roundWins
      : {};
  const resolvedRules = resolveMatchRules(config?.rules);

  const redStats = stats.red;
  const blueStats = stats.blue;
  const dominantSide = isMatchLoaded
    ? determineDominantSide(redStats, blueStats, resolvedRules.maxGamjeom)
    : "none";

  const isResting = phase === "REST";
  const roundWins = {
    red: matchRoundWins.red || 0,
    blue: matchRoundWins.blue || 0,
  };
  const isFinal = isMatchFinal(roundWins, resolvedRules.roundsToWin);

  const redGamJeom = stats.red?.gamjeom ?? 0;
  const blueGamJeom = stats.blue?.gamjeom ?? 0;
  const redIvrRemaining = getEffectiveIvrRemaining(
    stats,
    "red",
    eventSettings,
    matchRules
  );
  const blueIvrRemaining = getEffectiveIvrRemaining(
    stats,
    "blue",
    eventSettings,
    matchRules
  );

  const redTotalScore = isMatchLoaded
    ? getScoreValue(stats.red, stats.blue)
    : 0;
  const blueTotalScore = isMatchLoaded
    ? getScoreValue(stats.blue, stats.red)
    : 0;

  const { timerColor, redScoreColor, blueScoreColor } =
    resolveScreenBoardColors({
      isPaused,
      isResting,
      dominantSide,
    });

  return {
    phase,
    winReason,
    isPaused,
    isResting,
    isFinal,
    dominantSide,
    resolvedRules,
    roundScores,
    roundWins,
    redGamJeom,
    blueGamJeom,
    redIvrRemaining,
    blueIvrRemaining,
    redTotalScore,
    blueTotalScore,
    matchNumber: config.matchId ?? "000",
    currentRound: matchCurrentRound ?? 1,
    redCompetitor: config.competitors?.red,
    blueCompetitor: config.competitors?.blue,
    timerColor,
    redScoreColor,
    blueScoreColor,
  };
}
