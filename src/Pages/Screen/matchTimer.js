/**
 * Pure match-timer helpers for Screen rAF loop + Space toggle.
 * Firebase I/O and requestAnimationFrame stay in Screen.jsx.
 */

/**
 * Remaining seconds while the clock is running.
 * Preserves legacy: uses wall-clock `now` (not server offset).
 */
export function computeRemainingSeconds(timer, lastStartTime, now) {
  const elapsed = Math.floor((now - lastStartTime) / 1000);
  return (timer || 0) - elapsed;
}

/**
 * Decide one animation-frame outcome from match state.
 *
 * @param {object|null|undefined} state matchData.state
 * @param {number} now Date.now()
 * @returns {{
 *   displayTime: number,
 *   continueRaf: boolean,
 *   onExpire: null | 'finalize_round' | 'start_next_round'
 * }}
 */
export function resolveMatchTimerFrame(state, now) {
  if (!state) {
    return { displayTime: 0, continueRaf: false, onExpire: null };
  }

  const { timer, isPaused, lastStartTime, isFinished, phase } = state;

  if (isFinished && phase !== "REST") {
    return { displayTime: 0, continueRaf: false, onExpire: null };
  }

  if (isPaused) {
    return { displayTime: timer || 0, continueRaf: false, onExpire: null };
  }

  const remaining = computeRemainingSeconds(timer, lastStartTime, now);

  if (remaining <= 0) {
    return {
      displayTime: 0,
      continueRaf: false,
      // ROUND (or other non-REST): mark finished; REST: auto startNextRound
      onExpire: phase !== "REST" ? "finalize_round" : "start_next_round",
    };
  }

  return { displayTime: remaining, continueRaf: true, onExpire: null };
}

/** Firebase patch when resuming from paused. */
export function buildTimerResumePatch(now) {
  return {
    isPaused: false,
    lastStartTime: now,
  };
}

/** Firebase patch when pausing a running clock (freeze remaining into timer). */
export function buildTimerPausePatch(state = {}, now) {
  const elapsed = Math.floor(
    (now - (state.lastStartTime || now)) / 1000
  );
  const newTimer = Math.max(0, (state.timer || 0) - elapsed);
  return {
    isPaused: true,
    timer: newTimer,
    lastStartTime: null,
  };
}

/** Firebase patch when ROUND timer hits 0 (not REST). */
export function buildRoundExpiredStatePatch() {
  return {
    isFinished: true,
    isPaused: true,
    timer: 0,
    lastStartTime: null,
  };
}
