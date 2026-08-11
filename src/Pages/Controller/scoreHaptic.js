/**
 * Controller score haptic helpers.
 * Samsung / Android Vibration API quirks:
 * - Prefer numeric duration over short patterns
 * - ~120ms is more reliable than 40–70ms on older Galaxy devices
 * - Call vibrate(0) once on user gesture to "arm" haptics before async work
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
