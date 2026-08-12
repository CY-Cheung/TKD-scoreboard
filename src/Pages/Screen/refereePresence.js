/**
 * Pure referee-presence decisions for Screen toasts / auto-downgrade.
 * Firebase getCourt / updateCourtField / clearRefereeSeat stay in Screen.jsx.
 */

export const AUTO_DOWNGRADE_TOAST =
  "Only 1 referee remaining. Auto-downgraded to Single Referee Mode.";

/**
 * @param {string[]} disconnectedSeats
 * @returns {string | null}
 */
export function buildDisconnectToastMessage(disconnectedSeats) {
  if (!disconnectedSeats?.length) return null;
  return `⚠️ Referee ${disconnectedSeats.join(", ")} disconnected!`;
}

/** True when Screen should probe court mode for auto-downgrade. */
export function shouldProbeAutoDowngrade(occupiedCount) {
  return occupiedCount < 2;
}

/**
 * After reading current refereeMode from Firebase.
 * @param {string | null | undefined} mode
 */
export function shouldAutoDowngradeToSingle(mode) {
  return mode === "multiple";
}
