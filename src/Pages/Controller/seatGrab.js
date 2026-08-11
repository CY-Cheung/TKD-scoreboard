/**
 * Pure helpers for Controller referee seat grab / kick-out.
 * Firebase runTransaction, onDisconnect, and the 400ms StrictMode delay
 * stay orchestrated in Controller.jsx.
 */

import {
  flatRefereeSeatPath,
  legacyRefereeSeatPath,
  refereeSeatPath,
} from "../../services/courtPaths.js";

export const REFEREE_SEAT_ORDER = Object.freeze(["J1", "J2", "J3"]);

/** Delay before grab attempts — bypasses React StrictMode double-mount races. */
export const SEAT_GRAB_STRICT_MODE_DELAY_MS = 400;

export const ADMIN_SEAT = "Admin";

export {
  flatRefereeSeatPath,
  legacyRefereeSeatPath,
  refereeSeatPath,
};

export function isAdminSeat(seatName) {
  return seatName === ADMIN_SEAT;
}

/**
 * Transaction body: claim empty seat only.
 * @returns {object|undefined} device payload to write, or undefined to abort
 */
export function applySeatClaimTransaction(currentData, deviceData) {
  if (currentData === null) {
    return deviceData;
  }
  return undefined;
}

export function buildSeatDevicePayload(deviceId, deviceName) {
  return { deviceId, deviceName };
}

/**
 * Seat node may be legacy string deviceId or `{ deviceId, deviceName }`.
 */
export function extractSeatDeviceId(seatData) {
  if (typeof seatData === "object" && seatData !== null) {
    return seatData.deviceId;
  }
  return seatData;
}

/** True when this device should clear local seat state (kicked / overwritten). */
export function shouldKickFromSeat(seatData, myDeviceId) {
  if (!myDeviceId) return false;
  return extractSeatDeviceId(seatData) !== myDeviceId;
}

/**
 * @param {() => number} [random=Math.random]
 */
export function createRefereeDeviceId(random = Math.random) {
  return random().toString(36).substring(2, 12);
}

/**
 * @param {() => number} [random=Math.random]
 */
export function createAdminDeviceId(random = Math.random) {
  return `admin-${random().toString(36).substring(2, 10)}`;
}
