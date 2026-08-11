import { describe, expect, it } from "vitest";
import {
  ADMIN_SEAT,
  REFEREE_SEAT_ORDER,
  SEAT_GRAB_STRICT_MODE_DELAY_MS,
  SEAT_STALE_MS,
  applySeatClaimTransaction,
  buildSeatDevicePayload,
  createAdminDeviceId,
  createRefereeDeviceId,
  extractSeatDeviceId,
  filterLiveReferees,
  isAdminSeat,
  isSeatOccupied,
  isSeatStale,
  listStaleRefereeSeats,
  refereeSeatPath,
  shouldKickFromSeat,
} from "./seatGrab.js";

describe("seat grab constants", () => {
  it("tries J1 → J2 → J3 in order", () => {
    expect(REFEREE_SEAT_ORDER).toEqual(["J1", "J2", "J3"]);
  });

  it("keeps StrictMode delay at 400ms", () => {
    expect(SEAT_GRAB_STRICT_MODE_DELAY_MS).toBe(400);
  });
});

describe("applySeatClaimTransaction", () => {
  const payload = { deviceId: "abc", deviceName: "iPhone", lastSeen: 1000 };

  it("claims when seat is empty (null)", () => {
    expect(applySeatClaimTransaction(null, payload)).toEqual(payload);
  });

  it("aborts when seat already occupied", () => {
    expect(
      applySeatClaimTransaction(
        { deviceId: "other", deviceName: "Android", lastSeen: 9999 },
        payload,
        9999
      )
    ).toBeUndefined();
  });

  it("claims when existing seat lastSeen is stale", () => {
    const stale = {
      deviceId: "ghost",
      deviceName: "DeadPhone",
      lastSeen: 0,
    };
    expect(
      applySeatClaimTransaction(stale, payload, SEAT_STALE_MS + 1)
    ).toEqual(payload);
  });

  it("aborts when seat is legacy non-null string", () => {
    expect(applySeatClaimTransaction("legacy-id", payload)).toBeUndefined();
  });
});

describe("presence / stale seats", () => {
  it("buildSeatDevicePayload includes lastSeen", () => {
    expect(buildSeatDevicePayload("id1", "iPad", 12345)).toEqual({
      deviceId: "id1",
      deviceName: "iPad",
      lastSeen: 12345,
    });
  });

  it("isSeatStale / isSeatOccupied", () => {
    const live = { deviceId: "d", lastSeen: 1000 };
    expect(isSeatStale(live, 1000 + SEAT_STALE_MS - 1)).toBe(false);
    expect(isSeatOccupied(live, 1000 + SEAT_STALE_MS - 1)).toBe(true);
    expect(isSeatStale(live, 1000 + SEAT_STALE_MS + 1)).toBe(true);
    expect(isSeatOccupied(live, 1000 + SEAT_STALE_MS + 1)).toBe(false);
    expect(isSeatStale("legacy-string", 999999)).toBe(false);
    expect(isSeatOccupied("legacy-string", 999999)).toBe(true);
  });

  it("filterLiveReferees and listStaleRefereeSeats", () => {
    const map = {
      J1: { deviceId: "a", lastSeen: 20_000 },
      J2: { deviceId: "b", lastSeen: 0 },
      J3: { deviceId: "c", lastSeen: 24_000 },
    };
    expect(filterLiveReferees(map, 25_000)).toEqual({
      J1: map.J1,
      J3: map.J3,
    });
    expect(listStaleRefereeSeats(map, 25_000)).toEqual(["J2"]);
    expect(filterLiveReferees(map, 24_000 + SEAT_STALE_MS + 1)).toEqual({});
  });
});

describe("extractSeatDeviceId / shouldKickFromSeat", () => {
  it("reads object deviceId", () => {
    expect(extractSeatDeviceId({ deviceId: "d1", deviceName: "Mac" })).toBe("d1");
  });

  it("reads legacy string seat value", () => {
    expect(extractSeatDeviceId("plain-id")).toBe("plain-id");
  });

  it("does not kick when ids match", () => {
    expect(
      shouldKickFromSeat({ deviceId: "mine", deviceName: "iPhone" }, "mine")
    ).toBe(false);
  });

  it("kicks when ids differ or seat cleared", () => {
    expect(shouldKickFromSeat({ deviceId: "other" }, "mine")).toBe(true);
    expect(shouldKickFromSeat(null, "mine")).toBe(true);
  });

  it("does not kick without myDeviceId", () => {
    expect(shouldKickFromSeat({ deviceId: "x" }, "")).toBe(false);
  });
});

describe("ids and paths", () => {
  it("refereeSeatPath uses flat courts tree", () => {
    expect(refereeSeatPath("evt", "court1", "J2")).toBe(
      "courts/evt/court1/referees/J2"
    );
  });

  it("createRefereeDeviceId / createAdminDeviceId use injected random", () => {
    const fixed = () => 0.123456789;
    expect(createRefereeDeviceId(fixed)).toMatch(/^[a-z0-9]+$/);
    expect(createAdminDeviceId(fixed)).toMatch(/^admin-[a-z0-9]+$/);
  });

  it("isAdminSeat", () => {
    expect(isAdminSeat(ADMIN_SEAT)).toBe(true);
    expect(isAdminSeat("J1")).toBe(false);
  });
});
