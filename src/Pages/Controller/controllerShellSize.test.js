import { describe, it, expect } from "vitest";
import { resolveControllerShellSize } from "./controllerShellSize.js";

describe("resolveControllerShellSize (re-export)", () => {
  it("fills landscape browser and caches aspect", () => {
    const r = resolveControllerShellSize({
      browserWidth: 1280,
      browserHeight: 800,
      cachedLandAspect: null,
    });
    expect(r.width).toBe(1280);
    expect(r.height).toBe(800);
    expect(r.cachedLandAspect).toBeCloseTo(1.6);
  });

  it("reuses cached landscape aspect in portrait", () => {
    const r = resolveControllerShellSize({
      browserWidth: 800,
      browserHeight: 1280,
      cachedLandAspect: 1.6,
    });
    expect(r.width).toBe(800);
    expect(r.height).toBeCloseTo(500);
  });
});
