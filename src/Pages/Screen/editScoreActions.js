/**
 * Pure Edit score / avoiding-penalty decision helpers.
 * Firebase scoring stays orchestrated in Edit.jsx via Api.
 */

/** Last N seconds of a round: adding gamjeom prompts avoiding popup. */
export const LAST_SECONDS_FOR_AVOIDING = 10;

/**
 * Decide whether a score pad click applies immediately or opens avoiding popup.
 * @returns {{ kind: 'apply' } | { kind: 'avoiding_popup', action: 1 | -1 }}
 */
export function resolveScorePadClick({
  type,
  delta,
  currentTimer = 0,
  sideStats = null,
}) {
  if (
    type === "gamjeom" &&
    delta === 1 &&
    currentTimer > 0 &&
    currentTimer <= LAST_SECONDS_FOR_AVOIDING
  ) {
    return { kind: "avoiding_popup", action: 1 };
  }

  if (type === "gamjeom" && delta === -1) {
    if (sideStats?.gamjeomAvoiding > 0) {
      return { kind: "avoiding_popup", action: -1 };
    }
  }

  return { kind: "apply" };
}

/**
 * Map avoiding popup choice to Api score type.
 * @param {1 | 2} penaltyValue
 */
export function scoreTypeForAvoidingDecision(penaltyValue) {
  if (penaltyValue === 1) return "gamjeom";
  if (penaltyValue === 2) return "gamjeomAvoiding";
  return null;
}
