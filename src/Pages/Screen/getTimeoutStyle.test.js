import { describe, it, expect } from "vitest";
import { getTimeoutStyle } from "./getTimeoutStyle.js";

describe("getTimeoutStyle", () => {
  it("defaults to yellow chip when match not loaded", () => {
    expect(
      getTimeoutStyle({
        isMatchLoaded: false,
        isPaused: true,
        isResting: false,
      })
    ).toEqual({ backgroundColor: "#FFFF00", color: "#000000" });
  });

  it("uses black background when match running", () => {
    expect(
      getTimeoutStyle({
        isMatchLoaded: true,
        isPaused: false,
        isResting: false,
      }).backgroundColor
    ).toBe("#000000");
  });

  it("uses yellow background when paused", () => {
    expect(
      getTimeoutStyle({
        isMatchLoaded: true,
        isPaused: true,
        isResting: false,
      }).backgroundColor
    ).toBe("#FFFF00");
  });
});
