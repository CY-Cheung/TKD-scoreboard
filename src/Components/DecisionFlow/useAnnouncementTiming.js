import { useEffect, useState } from "react";
import { computeAnnouncementTimers } from "./announcementTiming";

/**
 * Shared exit/complete timers for IVR and Technical Card announcements.
 */
export function useAnnouncementTiming({
  visible,
  side,
  decision,
  startedAt,
  onComplete,
}) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!visible || !side || !decision || !startedAt) {
      setExiting(false);
      return;
    }

    const { remaining, exitDelay, shouldCompleteImmediately } =
      computeAnnouncementTimers(startedAt, Date.now());

    if (shouldCompleteImmediately) {
      setExiting(false);
      onComplete?.();
      return;
    }

    setExiting(false);
    const exitTimer = setTimeout(() => setExiting(true), exitDelay);
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, remaining);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [visible, side, decision, startedAt, onComplete]);

  return exiting;
}
