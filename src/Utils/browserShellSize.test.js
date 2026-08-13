import { describe, it, expect } from "vitest";
import {
  fitAspectIntoBrowser,
  resolveLandscapeBrowserShellSize,
  resolveScreenShellSize,
  applyBrowserViewportCssVars,
} from "./browserShellSize.js";

describe("fitAspectIntoBrowser", () => {
  it("fits 2:1 into a landscape browser", () => {
    expect(
      fitAspectIntoBrowser({
        browserWidth: 1920,
        browserHeight: 1080,
        aspect: 2,
      })
    ).toEqual({ width: 1920, height: 960, aspect: 2 });
  });

  it("fits 2:1 into a portrait browser (full width)", () => {
    const r = fitAspectIntoBrowser({
      browserWidth: 390,
      browserHeight: 844,
      aspect: 2,
    });
    expect(r.width).toBe(390);
    expect(r.height).toBe(195);
  });
});

describe("resolveScreenShellSize", () => {
  it("is 2:1 from browser box", () => {
    const r = resolveScreenShellSize({
      browserWidth: 1280,
      browserHeight: 800,
    });
    expect(r.width).toBe(1280);
    expect(r.height).toBe(640);
  });
});

describe("resolveLandscapeBrowserShellSize", () => {
  it("fills landscape and caches aspect", () => {
    const r = resolveLandscapeBrowserShellSize({
      browserWidth: 1280,
      browserHeight: 800,
    });
    expect(r.width).toBe(1280);
    expect(r.height).toBe(800);
    expect(r.cachedLandAspect).toBeCloseTo(1.6);
  });

  it("keeps cached aspect when portrait browser grows (URL bar)", () => {
    const r = resolveLandscapeBrowserShellSize({
      browserWidth: 800,
      browserHeight: 1400,
      cachedLandAspect: 1.6,
    });
    expect(r.width).toBe(800);
    expect(r.height).toBeCloseTo(500);
  });
});

describe("applyBrowserViewportCssVars", () => {
  it("sets px vars on a target element", () => {
    const props = {};
    const el = {
      style: {
        setProperty: (k, v) => {
          props[k] = v;
        },
        getPropertyValue: (k) => props[k] || "",
      },
    };
    applyBrowserViewportCssVars({
      browserWidth: 1000,
      browserHeight: 600,
      target: el,
    });
    expect(el.style.getPropertyValue("--browser-width")).toBe("1000px");
    expect(el.style.getPropertyValue("--browser-height")).toBe("600px");
  });
});
