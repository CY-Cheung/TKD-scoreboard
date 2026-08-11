import { getScoreValue } from "./scoreMath.js";
import { resolveMatchRules } from "./defaultRules.js";

/** Multiple-referee vote window: judges must agree within this period (ms). */
export const VOTE_WINDOW_MS = 1000;

/**
 * Ensure match.state / stats objects exist (mutates matchData).
 * Mirrors legacy Api.updateScoreAndCheckRules scaffolding.
 */
export function ensureMatchScaffold(matchData) {
  if (!matchData.state) {
    matchData.state = {
      isFinished: false,
      isPaused: true,
      timer: 0,
      winReason: null,
      lastStartTime: null,
      dominantSide: "none",
    };
  }

  if (!matchData.stats) {
    matchData.stats = {
      red: { pointsStat: [0, 0, 0, 0, 0], gamjeom: 0 },
      blue: { pointsStat: [0, 0, 0, 0, 0], gamjeom: 0 },
    };
  }

  return matchData;
}

/** Pad pointsStat to length 5 (mutates side stats). */
export function ensurePointsStatLength(targetSide) {
  if (!targetSide.pointsStat || targetSide.pointsStat.length < 5) {
    const oldStats = targetSide.pointsStat || [];
    targetSide.pointsStat = [
      oldStats[0] || 0,
      oldStats[1] || 0,
      oldStats[2] || 0,
      oldStats[3] || 0,
      oldStats[4] || 0,
    ];
  }
  return targetSide;
}

export function applyGamjeomDelta(targetSide, delta, { avoiding = false } = {}) {
  targetSide.gamjeom = (targetSide.gamjeom || 0) + delta;
  if (targetSide.gamjeom < 0) targetSide.gamjeom = 0;
  if (avoiding) {
    targetSide.gamjeomAvoiding = (targetSide.gamjeomAvoiding || 0) + delta;
    if (targetSide.gamjeomAvoiding < 0) targetSide.gamjeomAvoiding = 0;
  }
  return targetSide;
}

/**
 * Pause running timer using wall-clock pauseNow (legacy Api uses Date.now(),
 * not the server-offset clock used for votes).
 */
export function pauseMatchTimerForEvent(state, pauseNow) {
  if (!state.isPaused && state.lastStartTime) {
    const elapsed = Math.floor((pauseNow - state.lastStartTime) / 1000);
    state.timer = (state.timer || 0) - elapsed;
    if (state.timer < 0) state.timer = 0;
  }
  state.isPaused = true;
  state.lastStartTime = null;
  return state;
}

/**
 * Apply PUN / PTG winReason + dominantSide after a score change.
 * Mutates matchData.state.
 */
export function applyPtgPunAfterScore(matchData, pauseNow) {
  const redGamjeom = matchData.stats.red.gamjeom;
  const blueGamjeom = matchData.stats.blue.gamjeom;
  const redScore = getScoreValue(matchData.stats.red, matchData.stats.blue);
  const blueScore = getScoreValue(matchData.stats.blue, matchData.stats.red);

  const { maxPointGap: maxGap, maxGamjeom: maxGJ } = resolveMatchRules(
    matchData.config?.rules
  );

  const isPUN = redGamjeom >= maxGJ || blueGamjeom >= maxGJ;
  const isPTG = Math.abs(redScore - blueScore) >= maxGap;

  matchData.state.dominantSide = "none";

  if (isPUN) {
    pauseMatchTimerForEvent(matchData.state, pauseNow);
    matchData.state.winReason = "PUN";
    if (redGamjeom >= maxGJ) matchData.state.dominantSide = "blue";
    if (blueGamjeom >= maxGJ) matchData.state.dominantSide = "red";
  } else if (isPTG) {
    pauseMatchTimerForEvent(matchData.state, pauseNow);
    matchData.state.winReason = "PTG";
    if (redScore > blueScore) matchData.state.dominantSide = "red";
    if (blueScore > redScore) matchData.state.dominantSide = "blue";
  } else if (
    matchData.state.winReason === "PTG" ||
    matchData.state.winReason === "PUN"
  ) {
    matchData.state.winReason = null;
  }

  return matchData;
}

/**
 * Multi-referee vote path. Returns:
 * - { scored: true } when unique seats >= 2 and points were applied
 * - { scored: false, earlyReturn: true } when vote saved but not enough yet
 */
export function applyMultipleModeVote(matchData, {
  side,
  index,
  delta,
  deviceId,
  seatName,
  voteNow,
  voteWindowMs = VOTE_WINDOW_MS,
}) {
  const targetSide = matchData.stats[side];
  if (!matchData.votes) matchData.votes = [];

  matchData.votes.push({
    side,
    index,
    seatName,
    deviceId,
    timestamp: voteNow,
  });

  matchData.votes = matchData.votes.filter(
    (v) => voteNow - v.timestamp <= voteWindowMs
  );

  const matchingVotes = matchData.votes.filter(
    (v) => v.side === side && v.index === index
  );
  const uniqueSeats = new Set(matchingVotes.map((v) => v.deviceId));

  if (uniqueSeats.size < 2) {
    return { scored: false, earlyReturn: true };
  }

  ensurePointsStatLength(targetSide);
  targetSide.pointsStat[index] = (targetSide.pointsStat[index] || 0) + delta;
  if (targetSide.pointsStat[index] < 0) targetSide.pointsStat[index] = 0;

  matchData.votes = matchData.votes.filter(
    (v) => !(v.side === side && v.index === index)
  );

  if (!matchData.recentScores) matchData.recentScores = [];
  const actualSeatNames = Array.from(
    new Set(matchingVotes.map((v) => v.seatName))
  );
  matchData.recentScores.push({
    side,
    index,
    seatNames: actualSeatNames,
    timestamp: voteNow,
  });

  return { scored: true, earlyReturn: false };
}

export function applyDirectPointsStat(matchData, {
  side,
  index,
  delta,
  seatName,
  voteNow,
}) {
  const targetSide = matchData.stats[side];
  ensurePointsStatLength(targetSide);
  targetSide.pointsStat[index] = (targetSide.pointsStat[index] || 0) + delta;
  if (targetSide.pointsStat[index] < 0) targetSide.pointsStat[index] = 0;

  if (delta > 0) {
    if (!matchData.recentScores) matchData.recentScores = [];
    matchData.recentScores.push({
      side,
      index,
      seatNames: [seatName || "J1"],
      timestamp: voteNow,
    });
  }

  return matchData;
}

/**
 * Pure body of Api.updateScoreAndCheckRules transaction.
 *
 * @param {object|null} matchData Firebase match snapshot (mutated like runTransaction)
 * @param {object} action side, type, index, delta, courtId, deviceId, seatName, mode
 * @param {{ voteNow: number, pauseNow: number }} clocks
 *   voteNow = Date.now() + serverOffset; pauseNow = Date.now() (legacy)
 * @param {{ scored?: boolean }|null} [meta] optional out-param: meta.scored = points applied
 * @returns {object|undefined} matchData to commit, or undefined to abort
 */
export function applyScoreAndCheckRules(matchData, action, clocks, meta = null) {
  if (!matchData) return;
  if (meta) meta.scored = false;

  const {
    side,
    type,
    index,
    delta,
    courtId = null,
    deviceId = null,
    seatName = null,
    mode = "single",
  } = action;
  const { voteNow, pauseNow } = clocks;

  if (courtId && deviceId) {
    matchData.providedCourtId = courtId;
    matchData.providedDeviceId = deviceId;
  }

  ensureMatchScaffold(matchData);

  if (matchData.state.phase === "REST") return;

  const targetSide = matchData.stats[side];

  if (type === "gamjeom") {
    applyGamjeomDelta(targetSide, delta, { avoiding: false });
    if (meta) meta.scored = delta !== 0;
  } else if (type === "gamjeomAvoiding") {
    applyGamjeomDelta(targetSide, delta, { avoiding: true });
    if (meta) meta.scored = delta !== 0;
  } else if (type === "pointsStat") {
    if (mode === "multiple" && seatName) {
      const voteResult = applyMultipleModeVote(matchData, {
        side,
        index,
        delta,
        deviceId,
        seatName,
        voteNow,
      });
      if (voteResult.earlyReturn) {
        if (meta) meta.scored = false;
        return matchData;
      }
      if (meta) meta.scored = voteResult.scored === true;
    } else {
      applyDirectPointsStat(matchData, {
        side,
        index,
        delta,
        seatName,
        voteNow,
      });
      if (meta) meta.scored = delta > 0;
    }
  }

  applyPtgPunAfterScore(matchData, pauseNow);
  return matchData;
}
