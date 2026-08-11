import { describe, it, expect } from "vitest";
import { mergeRefereeMaps } from "./courtFirebase.js";

describe("mergeRefereeMaps", () => {
  it("merges seats from flat and legacy", () => {
    expect(
      mergeRefereeMaps(
        { J1: { deviceId: "a" } },
        { J2: { deviceId: "b" }, J3: { deviceId: "c" } }
      )
    ).toEqual({
      J1: { deviceId: "a" },
      J2: { deviceId: "b" },
      J3: { deviceId: "c" },
    });
  });

  it("prefers flat when both have the same seat", () => {
    expect(
      mergeRefereeMaps(
        { J1: { deviceId: "flat" } },
        { J1: { deviceId: "legacy" } }
      )
    ).toEqual({ J1: { deviceId: "flat" } });
  });

  it("keeps legacy-only claim when flat is empty", () => {
    expect(mergeRefereeMaps(null, { J2: { deviceId: "phone" } })).toEqual({
      J2: { deviceId: "phone" },
    });
  });
});
