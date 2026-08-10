export const ANNOUNCEMENT_DURATION_MS = 3000;
export const ANNOUNCEMENT_EXIT_MS = 380;

/**
 * Pure timing helper for IVR / Technical Card announcement overlays.
 */
export function computeAnnouncementTimers(
  startedAt,
  now = Date.now(),
  durationMs = ANNOUNCEMENT_DURATION_MS,
  exitMs = ANNOUNCEMENT_EXIT_MS
) {
  const remaining = Math.max(0, durationMs - (now - startedAt));
  return {
    remaining,
    exitDelay: Math.max(0, remaining - exitMs),
    shouldCompleteImmediately: remaining === 0,
  };
}
