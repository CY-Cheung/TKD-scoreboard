import { describe, expect, it } from "vitest";
import {
  ADMIN_SEAT,
  REFEREE_SEAT_ORDER,
  SEAT_GRAB_STRICT_MODE_DELAY_MS,
  applySeatClaimTransaction,
  buildSeatDevicePayload,
  createAdminDeviceId,
  createRefereeDeviceId,
  extractSeatDeviceId,
  isAdminSeat,
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
  const payload = { deviceId: "abc", deviceName: "iPhone" };

  it("claims when seat is empty (null)", () => {
    expect(applySeatClaimTransaction(null, payload)).toEqual(payload);
  });

  it("aborts when seat already occupied", () => {
    expect(
      applySeatClaimTransaction({ deviceId: "other", deviceName: "Android" }, payload)
    ).toBeUndefined();
  });

  it("aborts when seat is legacy non-null string", () => {
    expect(applySeatClaimTransaction("legacy-id", payload)).toBeUndefined();
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
  it("buildSeatDevicePayload", () => {
    expect(buildSeatDevicePayload("id1", "iPad")).toEqual({
      deviceId: "id1",
      deviceName: "iPad",
    });
  });

  it("refereeSeatPath", () => {
    expect(refereeSeatPath("evt", "court1", "J2")).toBe(
      "events/evt/courts/court1/referees/J2"
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
