import { useState, useEffect } from "react";

/**
 * Tick `now` on an interval for UI expiry checks (Kye-Shi, etc.).
 * Does not own Firebase or rAF match timer.
 */
export function useNowTicker(intervalMs = 100) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, intervalMs);
    return () => clearInterval(intervalId);
  }, [intervalMs]);

  return now;
}
