/**
 * Pure helpers for Controller referee seat grab / kick-out / presence.
 * Firebase runTransaction, onDisconnect, heartbeat, and pagehide cleanup
 * stay orchestrated in Controller.jsx.
 */

import {
  flatRefereeSeatPath,
  refereeSeatPath,
} from "../../services/courtPaths.js";

export const REFEREE_SEAT_ORDER = Object.freeze(["J1", "J2", "J3"]);

/** Delay before grab attempts — bypasses React StrictMode double-mount races. */
export const SEAT_GRAB_STRICT_MODE_DELAY_MS = 400;

/**
 * How often Controller refreshes lastSeen while the tab is open.
 * Keep well under SEAT_STALE_MS.
 */
export const SEAT_HEARTBEAT_INTERVAL_MS = 5_000;

/**
 * Seat is treated as vacant (ghost) when lastSeen is older than this.
 * Must cover a missed heartbeat + mobile background delay.
 * Firebase onDisconnect alone can take minutes after a force-kill.
 */
export const SEAT_STALE_MS = 20_000;

export const ADMIN_SEAT = "Admin";

export {
  flatRefereeSeatPath,
  refereeSeatPath,
};

export function isAdminSeat(seatName) {
  return seatName === ADMIN_SEAT;
}

/**
 * Seat node may be a bare string deviceId or `{ deviceId, deviceName, lastSeen }`.
 */
export function extractSeatDeviceId(seatData) {
  if (typeof seatData === "object" && seatData !== null) {
    return seatData.deviceId;
  }
  return seatData;
}

export function extractSeatLastSeen(seatData) {
  if (typeof seatData === "object" && seatData !== null) {
    const n = Number(seatData.lastSeen);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** True when seat has lastSeen and it is older than staleMs. Bare string seats are never stale. */
export function isSeatStale(seatData, now = Date.now(), staleMs = SEAT_STALE_MS) {
  if (seatData == null) return false;
  const lastSeen = extractSeatLastSeen(seatData);
  if (lastSeen == null) return false;
  return now - lastSeen > staleMs;
}

/** True when UI / claim logic should treat the seat as occupied. */
export function isSeatOccupied(seatData, now = Date.now(), staleMs = SEAT_STALE_MS) {
  if (seatData == null) return false;
  if (isSeatStale(seatData, now, staleMs)) return false;
  return extractSeatDeviceId(seatData) != null;
}

/** Drop stale / empty seats from a J1–J3 map for UI display. */
export function filterLiveReferees(
  refereesMap,
  now = Date.now(),
  staleMs = SEAT_STALE_MS
) {
  const merged = refereesMap || {};
  const live = {};
  for (const seat of REFEREE_SEAT_ORDER) {
    if (isSeatOccupied(merged[seat], now, staleMs)) {
      live[seat] = merged[seat];
    }
  }
  return live;
}

/** Count occupied J1–J3 seats in a live referees map. */
export function countOccupiedRefereeSeats(refereesMap) {
  let count = 0;
  for (const seat of REFEREE_SEAT_ORDER) {
    if (refereesMap?.[seat]) count++;
  }
  return count;
}

/**
 * Seat names present in `prev` but missing in `current` (disconnect toasts).
 * @param {Record<string, unknown>} prev
 * @param {Record<string, unknown>} current
 */
export function listDisconnectedRefereeSeats(prev, current) {
  const disconnections = [];
  for (const seat of REFEREE_SEAT_ORDER) {
    if (prev?.[seat] && !current?.[seat]) {
      disconnections.push(seat);
    }
  }
  return disconnections;
}

/** Seat names that are stale ghosts OR lastSeen-only orphans (no deviceId). */
export function listClearableRefereeSeats(
  refereesMap,
  now = Date.now(),
  staleMs = SEAT_STALE_MS
) {
  const merged = refereesMap || {};
  return REFEREE_SEAT_ORDER.filter((seat) => {
    const data = merged[seat];
    if (data == null) return false;
    if (extractSeatDeviceId(data) == null) return true;
    return isSeatStale(data, now, staleMs);
  });
}

/** Seat names in map that are stale ghosts (have lastSeen but timed out). */
export function listStaleRefereeSeats(
  refereesMap,
  now = Date.now(),
  staleMs = SEAT_STALE_MS
) {
  return listClearableRefereeSeats(refereesMap, now, staleMs);
}

/**
 * Transaction body: claim empty, deviceId-less ghost, or stale seat only.
 * @returns {object|undefined} device payload to write, or undefined to abort
 */
export function applySeatClaimTransaction(
  currentData,
  deviceData,
  now = Date.now(),
  staleMs = SEAT_STALE_MS
) {
  // Vacant: null, or heartbeat ghost left with only lastSeen (no deviceId).
  if (currentData === null || extractSeatDeviceId(currentData) == null) {
    return deviceData;
  }
  if (isSeatStale(currentData, now, staleMs)) {
    return deviceData;
  }
  return undefined;
}

export function buildSeatDevicePayload(
  deviceId,
  deviceName,
  now = Date.now()
) {
  return { deviceId, deviceName, lastSeen: now };
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
