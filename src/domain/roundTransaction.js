import { getScoreValue } from "./scoreMath.js";
import {
  resetSideStatsForNextRound,
  resolveMatchRules,
} from "./matchRules.js";

/**
 * Pure body of Api.declareRoundWinner transaction.
 * Mutates matchData like Firebase runTransaction.
 *
 * @param {object|null} matchData
 * @param {'red'|'blue'|string} winnerSide
 * @param {number} now wall-clock ms for REST lastStartTime (legacy Date.now())
 */
export function applyDeclareRoundWinner(matchData, winnerSide, now) {
  if (!matchData) return;

  if (!matchData.state) matchData.state = {};
  if (!matchData.stats) matchData.stats = {};
  if (!matchData.stats.roundWins) matchData.stats.roundWins = { red: 0, blue: 0 };
  if (!matchData.stats.roundScores) matchData.stats.roundScores = {};

  const currentRound = matchData.state.currentRound || 1;
  matchData.stats.roundScores[`R${currentRound}`] = {
    red: getScoreValue(matchData.stats.red, matchData.stats.blue),
    blue: getScoreValue(matchData.stats.blue, matchData.stats.red),
  };

  if (winnerSide === "red") {
    matchData.stats.roundWins.red = (matchData.stats.roundWins.red || 0) + 1;
  } else if (winnerSide === "blue") {
    matchData.stats.roundWins.blue = (matchData.stats.roundWins.blue || 0) + 1;
  }

  const redWins = matchData.stats.roundWins.red;
  const blueWins = matchData.stats.roundWins.blue;
  const { roundsToWin, restDuration } = resolveMatchRules(
    matchData.config?.rules
  );

  if (redWins >= roundsToWin || blueWins >= roundsToWin) {
    matchData.state.isFinished = true;
    matchData.state.winReason = "PTF";
    matchData.state.isPaused = true;
    matchData.state.timer = 0;
    matchData.state.phase = "ROUND";
  } else {
    const originalStats = { ...matchData.stats };
    matchData.stats = {
      ...originalStats,
      red: resetSideStatsForNextRound(originalStats.red),
      blue: resetSideStatsForNextRound(originalStats.blue),
    };

    matchData.recentScores = [];

    matchData.state.phase = "REST";
    matchData.state.timer = restDuration;
    matchData.state.isPaused = false;
    matchData.state.lastStartTime = now;
    matchData.state.isFinished = false;
    matchData.state.winReason = null;
    matchData.state.dominantSide = "none";
  }

  return matchData;
}

/**
 * Pure body of Api.startNextRound transaction.
 */
export function applyStartNextRound(matchData) {
  if (!matchData) return;

  matchData.stats.red = resetSideStatsForNextRound(matchData.stats.red);
  matchData.stats.blue = resetSideStatsForNextRound(matchData.stats.blue);

  matchData.state.currentRound = (matchData.state.currentRound || 1) + 1;
  matchData.state.phase = "ROUND";
  matchData.state.timer = resolveMatchRules(matchData.config?.rules).roundDuration;
  matchData.state.isPaused = true;
  matchData.state.lastStartTime = null;
  matchData.state.isFinished = false;
  matchData.state.dominantSide = "none";

  return matchData;
}
