/**
 * Pure Edit IVR gate / quota input helpers.
 * setIvrRemaining Firebase calls stay in Edit.jsx.
 */

import { isIvrUnlimited } from "../../Api";

export function isIvrActionBlocked({
  matchData,
  showAvoidingPopup,
  isTechnicalCardFlowActive,
  isIvrFlowActive,
  techCardConfirmSide,
  ivrConfirmSide,
}) {
  return (
    !matchData ||
    showAvoidingPopup ||
    isTechnicalCardFlowActive ||
    isIvrFlowActive ||
    !!techCardConfirmSide ||
    !!ivrConfirmSide
  );
}

export function isTechCardActionBlocked({
  matchData,
  showAvoidingPopup,
  isTechnicalCardFlowActive,
  isIvrFlowActive,
  techCardConfirmSide,
  ivrConfirmSide,
}) {
  return (
    !matchData ||
    showAvoidingPopup ||
    isTechnicalCardFlowActive ||
    isIvrFlowActive ||
    !!techCardConfirmSide ||
    !!ivrConfirmSide
  );
}

/** Digits-only IVR quota field. */
export function isValidIvrQuotaTyping(value) {
  return /^\d*$/.test(value);
}

/**
 * Resolve blur commit value.
 * @returns {number | null} null clears to unlimited / unset
 */
export function resolveIvrQuotaCommitValue(raw, fallbackRemaining) {
  if (raw === "") return null;
  const parsed = parseInt(raw, 10);
  const next = Number.isNaN(parsed) ? fallbackRemaining : parsed;
  return isIvrUnlimited(next) ? null : next;
}

export function isIvrButtonDisabled(blocked, remaining) {
  return blocked || (!isIvrUnlimited(remaining) && remaining <= 0);
}
