import { REFEREE_SEAT_ORDER } from "../../Pages/Controller/seatGrab.js";

/** Chinese ordinal labels for Corner Judge 1–3 (邊裁一／二／三). */
export const CORNER_JUDGE_ZH = Object.freeze(["一", "二", "三"]);

export const QR_CUSTOM_HOST_STORAGE_KEY = "qrCustomHost";

/**
 * Occupancy + full-flag for J1–J3 map (truthy seat = occupied).
 * Matches prior QRCodeDisplay counting (no stale filter — caller filters first).
 */
export function summarizeRefereeOccupancy(referees = {}) {
  let occupiedCount = 0;
  for (const seat of REFEREE_SEAT_ORDER) {
    if (referees?.[seat]) occupiedCount += 1;
  }
  return {
    occupiedCount,
    isFull: occupiedCount === REFEREE_SEAT_ORDER.length,
  };
}

/** Device label for a seat pill; vacant seats return "Vacant". */
export function getRefereeDeviceLabel(refData) {
  if (refData == null) return "Vacant";
  if (typeof refData === "object") {
    return refData.deviceName || "Online";
  }
  return "Online";
}

export function canEnableMultipleRefereeMode(occupiedCount) {
  return occupiedCount >= 2;
}

/** Strip leading "court" from courtId for display ("Court1" → "1"). */
export function formatCourtDisplayId(courtId) {
  if (courtId == null || courtId === "") return "N/A";
  const stripped = String(courtId)
    .replace(/court\s*/i, "")
    .trim();
  return stripped || "N/A";
}

export function readStoredCustomHost(
  storage = typeof localStorage !== "undefined" ? localStorage : null
) {
  if (!storage) return "";
  try {
    return storage.getItem(QR_CUSTOM_HOST_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function writeStoredCustomHost(
  value,
  storage = typeof localStorage !== "undefined" ? localStorage : null
) {
  if (!storage) return;
  try {
    storage.setItem(QR_CUSTOM_HOST_STORAGE_KEY, value);
  } catch {
    /* ignore quota / private mode */
  }
}
