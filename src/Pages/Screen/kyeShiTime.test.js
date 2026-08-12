import { describe, it, expect } from "vitest";
import { computeKyeShiRemaining } from "./kyeShiTime.js";

describe("computeKyeShiRemaining", () => {
  it("returns null when inactive", () => {
    expect(computeKyeShiRemaining(null, 1000)).toBeNull();
    expect(computeKyeShiRemaining({}, 1000)).toBeNull();
  });

  it("returns remaining seconds", () => {
    expect(
      computeKyeShiRemaining({ startedAt: 0, duration: 60 }, 10_000)
    ).toBe(50);
  });

  it("returns null when expired", () => {
    expect(
      computeKyeShiRemaining({ startedAt: 0, duration: 60 }, 60_000)
    ).toBeNull();
  });

  it("defaults duration to 60", () => {
    expect(computeKyeShiRemaining({ startedAt: 0 }, 5_000)).toBe(55);
  });
});
