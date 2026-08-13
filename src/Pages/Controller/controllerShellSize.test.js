import { describe, it, expect } from "vitest";
import { resolveControllerShellSize } from "./controllerShellSize.js";

describe("resolveControllerShellSize", () => {
  it("fills the browser in landscape and caches aspect", () => {
    const r = resolveControllerShellSize({
      browserWidth: 1280,
      browserHeight: 800,
      cachedLandAspect: null,
    });
    expect(r.width).toBe(1280);
    expect(r.height).toBe(800);
    expect(r.landAspect).toBeCloseTo(1.6);
    expect(r.cachedLandAspect).toBeCloseTo(1.6);
  });

  it("reuses cached landscape aspect in portrait (full width)", () => {
    const r = resolveControllerShellSize({
      browserWidth: 800,
      browserHeight: 1280,
      cachedLandAspect: 1.6,
    });
    expect(r.width).toBe(800);
    expect(r.height).toBeCloseTo(500);
    expect(r.landAspect).toBeCloseTo(1.6);
    expect(r.cachedLandAspect).toBeCloseTo(1.6);
  });

  it("does not let a taller portrait browser invent a new ratio when cached", () => {
    // Portrait browser taller because URL bar hid — still keep 16:10 cache
    const r = resolveControllerShellSize({
      browserWidth: 800,
      browserHeight: 1400,
      cachedLandAspect: 1280 / 800,
    });
    expect(r.width).toBe(800);
    expect(r.height).toBeCloseTo(500);
    expect(r.cachedLandAspect).toBeCloseTo(1.6);
  });

  it("portrait-first uses provisional browser max/min until landscape", () => {
    const r = resolveControllerShellSize({
      browserWidth: 390,
      browserHeight: 700,
      cachedLandAspect: null,
    });
    expect(r.width).toBe(390);
    expect(r.height).toBeCloseTo(390 * (390 / 700));
    expect(r.cachedLandAspect).toBeNull();
  });
});
