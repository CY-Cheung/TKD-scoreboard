/**
 * Pure Edit timer field helpers.
 * updateMatchLiveState stays in Edit.jsx.
 */

export function secondsToMinSec(totalSeconds) {
  const total = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  return {
    minutes: Math.floor(total / 60),
    seconds: total % 60,
  };
}

export function minSecToSeconds(min, sec) {
  return parseInt(min, 10) * 60 + parseInt(sec, 10);
}

export function buildMatchLiveTimerPatch(totalSeconds) {
  return {
    timer: totalSeconds,
    isPaused: true,
    lastStartTime: null,
    isFinished: totalSeconds === 0,
  };
}

/** Only write live timer when editing the active phase. */
export function shouldApplyTimeUpdate(timeType, phase) {
  if (timeType === "match" && phase === "ROUND") return true;
  if (timeType === "rest" && phase === "REST") return true;
  return false;
}

/**
 * Initial min/sec fields when Edit panel opens.
 * @returns {null | { matchMin, matchSec, restMin, restSec }}
 */
export function buildEditTimerFieldState(matchData) {
  if (!matchData) return null;

  const initialTimer = matchData.state?.timer || 0;
  const { minutes, seconds } = secondsToMinSec(initialTimer);
  const activePhase = matchData.state?.phase || "ROUND";
  const defaultMatchSec = matchData.config?.rules?.roundDuration || 90;
  const defaultRestSec = matchData.config?.rules?.restDuration || 60;
  const defaultMatch = secondsToMinSec(defaultMatchSec);
  const defaultRest = secondsToMinSec(defaultRestSec);

  if (activePhase === "ROUND") {
    return {
      matchMin: minutes,
      matchSec: seconds,
      restMin: defaultRest.minutes,
      restSec: defaultRest.seconds,
    };
  }

  if (activePhase === "REST") {
    return {
      matchMin: defaultMatch.minutes,
      matchSec: defaultMatch.seconds,
      restMin: minutes,
      restSec: seconds,
    };
  }

  return {
    matchMin: minutes,
    matchSec: seconds,
    restMin: defaultRest.minutes,
    restSec: defaultRest.seconds,
  };
}
