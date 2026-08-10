import { useEffect, useState } from "react";

export const ANNOUNCEMENT_DURATION_MS = 3000;
export const ANNOUNCEMENT_EXIT_MS = 380;

/**
 * Shared exit / complete timers for glass-card announcements.
 * Syncs remaining display time from Firebase `startedAt`.
 */
export function useAnnouncementTiming({
  visible,
  side,
  decision,
  startedAt,
  onComplete,
  durationMs = ANNOUNCEMENT_DURATION_MS,
  exitMs = ANNOUNCEMENT_EXIT_MS,
}) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!visible || !side || !decision || !startedAt) {
      setExiting(false);
      return;
    }

    const remaining = Math.max(0, durationMs - (Date.now() - startedAt));
    if (remaining === 0) {
      setExiting(false);
      onComplete?.();
      return;
    }

    setExiting(false);
    const exitDelay = Math.max(0, remaining - exitMs);
    const exitTimer = setTimeout(() => setExiting(true), exitDelay);
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, remaining);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [visible, side, decision, startedAt, onComplete, durationMs, exitMs]);

  return exiting;
}
