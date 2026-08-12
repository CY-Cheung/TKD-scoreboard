import { describe, it, expect } from "vitest";
import { resolveScreenBoardColors } from "./screenBoardColors.js";

describe("resolveScreenBoardColors", () => {
  it("yellow timer when paused", () => {
    const c = resolveScreenBoardColors({
      isPaused: true,
      isResting: false,
      dominantSide: "none",
    });
    expect(c.timerColor).toBe("#FFFF00");
  });

  it("highlights dominant side scores when not resting", () => {
    const c = resolveScreenBoardColors({
      isPaused: false,
      isResting: false,
      dominantSide: "red",
    });
    expect(c.redScoreColor).toBe("#FFFF00");
    expect(c.blueScoreColor).toBe("#FFFFFF");
  });

  it("no score highlight during rest", () => {
    const c = resolveScreenBoardColors({
      isPaused: false,
      isResting: true,
      dominantSide: "blue",
    });
    expect(c.redScoreColor).toBe("#FFFFFF");
    expect(c.blueScoreColor).toBe("#FFFFFF");
  });
});
