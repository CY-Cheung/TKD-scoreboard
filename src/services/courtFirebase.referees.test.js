import { describe, it, expect } from "vitest";
import { normalizeRefereeMap } from "./courtFirebase.js";

describe("normalizeRefereeMap", () => {
  it("keeps occupied J seats", () => {
    expect(
      normalizeRefereeMap({
        J1: { deviceId: "a" },
        J3: { deviceId: "c" },
      })
    ).toEqual({
      J1: { deviceId: "a" },
      J3: { deviceId: "c" },
    });
  });

  it("returns empty object for null/empty", () => {
    expect(normalizeRefereeMap(null)).toEqual({});
    expect(normalizeRefereeMap({})).toEqual({});
  });
});
