import { describe, it, expect } from "vitest";
import {
  summarizeRefereeOccupancy,
  getRefereeDeviceLabel,
  canEnableMultipleRefereeMode,
  formatCourtDisplayId,
  readStoredCustomHost,
  writeStoredCustomHost,
  QR_CUSTOM_HOST_STORAGE_KEY,
} from "./qrRefereeView.js";

describe("summarizeRefereeOccupancy", () => {
  it("counts truthy seats and marks full at 3", () => {
    expect(summarizeRefereeOccupancy({})).toEqual({
      occupiedCount: 0,
      isFull: false,
    });
    expect(
      summarizeRefereeOccupancy({ J1: { deviceId: "a" }, J2: "x" })
    ).toEqual({ occupiedCount: 2, isFull: false });
    expect(
      summarizeRefereeOccupancy({
        J1: { deviceId: "a" },
        J2: { deviceId: "b" },
        J3: { deviceId: "c" },
      })
    ).toEqual({ occupiedCount: 3, isFull: true });
  });
});

describe("getRefereeDeviceLabel", () => {
  it("returns Vacant / Online / deviceName", () => {
    expect(getRefereeDeviceLabel(null)).toBe("Vacant");
    expect(getRefereeDeviceLabel("legacy-id")).toBe("Online");
    expect(getRefereeDeviceLabel({ deviceId: "a" })).toBe("Online");
    expect(getRefereeDeviceLabel({ deviceId: "a", deviceName: "iPad" })).toBe(
      "iPad"
    );
  });
});

describe("canEnableMultipleRefereeMode", () => {
  it("requires at least 2 judges", () => {
    expect(canEnableMultipleRefereeMode(0)).toBe(false);
    expect(canEnableMultipleRefereeMode(1)).toBe(false);
    expect(canEnableMultipleRefereeMode(2)).toBe(true);
  });
});

describe("formatCourtDisplayId", () => {
  it("strips Court prefix", () => {
    expect(formatCourtDisplayId("Court1")).toBe("1");
    expect(formatCourtDisplayId("court 2")).toBe("2");
    expect(formatCourtDisplayId(null)).toBe("N/A");
    expect(formatCourtDisplayId("A")).toBe("A");
  });
});

describe("custom host storage", () => {
  it("reads and writes via storage key", () => {
    const store = new Map();
    const storage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, v),
    };
    expect(readStoredCustomHost(storage)).toBe("");
    writeStoredCustomHost("192.168.1.5:5173", storage);
    expect(store.get(QR_CUSTOM_HOST_STORAGE_KEY)).toBe("192.168.1.5:5173");
    expect(readStoredCustomHost(storage)).toBe("192.168.1.5:5173");
  });

  it("swallows storage errors", () => {
    const bad = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };
    expect(readStoredCustomHost(bad)).toBe("");
    expect(() => writeStoredCustomHost("x", bad)).not.toThrow();
  });
});
