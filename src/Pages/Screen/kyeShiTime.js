/**
 * Pure Kye-Shi remaining-seconds helper.
 * Auto-stop Firebase writes stay in Screen.jsx.
 */

/**
 * @param {{ startedAt?: number, duration?: number } | null | undefined} kyeShi
 * @param {number} nowMs
 * @returns {number | null} whole seconds left, or null if inactive / expired
 */
export function computeKyeShiRemaining(kyeShi, nowMs) {
  if (kyeShi?.startedAt == null) return null;
  const elapsed = Math.floor((nowMs - kyeShi.startedAt) / 1000);
  const remaining = (kyeShi.duration ?? 60) - elapsed;
  return remaining > 0 ? remaining : null;
}
