/**
 * Controller score haptic helpers.
 * Samsung / Android Vibration API quirks:
 * - Prefer numeric duration over short patterns
 * - ~120ms is more reliable than 40–70ms on older Galaxy devices
 * - Call vibrate(0) once on user gesture to "arm" haptics before async work
 *
 * Shared pulse: all Controllers listen to match `recentScores` and vibrate
 * when a new scored event appears (multi-judge consensus within VOTE_WINDOW).
 */

export const SCORE_HAPTIC_MS = 120;

export function canVibrate(nav = typeof navigator !== "undefined" ? navigator : null) {
  return typeof nav?.vibrate === "function";
}

/** Cancel / arm vibration inside a user-gesture handler (helps some WebViews). */
export function armScoreHaptic(nav = typeof navigator !== "undefined" ? navigator : null) {
  if (!canVibrate(nav)) return false;
  try {
    nav.vibrate(0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Stronger, more compatible score pulse.
 * Tries number form first (best Samsung support), then pattern fallback.
 */
export function triggerScoreHaptic(
  nav = typeof navigator !== "undefined" ? navigator : null,
  durationMs = SCORE_HAPTIC_MS
) {
  if (!canVibrate(nav)) return false;
  try {
    nav.vibrate(0);
    const ok = nav.vibrate(durationMs);
    if (ok === false) {
      return Boolean(nav.vibrate([durationMs]));
    }
    return true;
  } catch {
    return false;
  }
}

/** Stable id for one recentScores entry (broadcast haptic dedupe key). */
export function recentScoreEventKey(entry) {
  if (!entry || typeof entry !== "object") return null;
  const seats = Array.isArray(entry.seatNames)
    ? [...entry.seatNames].map(String).sort().join(",")
    : "";
  const ts = entry.timestamp ?? "";
  const side = entry.side ?? "";
  const index = entry.index ?? "";
  return `${ts}|${side}|${index}|${seats}`;
}

/** Normalize Firebase array-or-map recentScores into a dense list. */
export function normalizeRecentScoresList(recentScores) {
  if (Array.isArray(recentScores)) return recentScores;
  if (recentScores && typeof recentScores === "object") {
    return Object.keys(recentScores)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => recentScores[k])
      .filter((entry) => entry != null);
  }
  return [];
}

/** Key of the newest recentScores item, or null if empty. */
export function peekLatestRecentScoreKey(recentScores) {
  const list = normalizeRecentScoresList(recentScores);
  if (list.length === 0) return null;
  return recentScoreEventKey(list[list.length - 1]);
}

/**
 * Decide whether a recentScores update should fire a shared haptic.
 * @returns {{ vibrate: boolean, nextKey: string|null }}
 */
export function shouldVibrateForRecentScores(recentScores, prevKey) {
  const nextKey = peekLatestRecentScoreKey(recentScores);
  if (nextKey == null) {
    return { vibrate: false, nextKey: prevKey ?? null };
  }
  // First observation (join / match load): seed only, do not vibrate history.
  if (prevKey === undefined) {
    return { vibrate: false, nextKey };
  }
  if (nextKey === prevKey) {
    return { vibrate: false, nextKey };
  }
  return { vibrate: true, nextKey };
}
