import { describe, it, expect } from "vitest";
import {
  LAST_SECONDS_FOR_AVOIDING,
  resolveScorePadClick,
  scoreTypeForAvoidingDecision,
} from "./editScoreActions.js";

describe("resolveScorePadClick", () => {
  it("opens avoiding popup for +gamjeom in last seconds", () => {
    expect(
      resolveScorePadClick({
        type: "gamjeom",
        delta: 1,
        currentTimer: LAST_SECONDS_FOR_AVOIDING,
      })
    ).toEqual({ kind: "avoiding_popup", action: 1 });
  });

  it("applies +gamjeom when timer above window", () => {
    expect(
      resolveScorePadClick({
        type: "gamjeom",
        delta: 1,
        currentTimer: LAST_SECONDS_FOR_AVOIDING + 1,
      })
    ).toEqual({ kind: "apply" });
  });

  it("opens popup when removing gamjeom with avoiding stock", () => {
    expect(
      resolveScorePadClick({
        type: "gamjeom",
        delta: -1,
        sideStats: { gamjeomAvoiding: 1 },
      })
    ).toEqual({ kind: "avoiding_popup", action: -1 });
  });

  it("applies pointsStat immediately", () => {
    expect(
      resolveScorePadClick({ type: "pointsStat", delta: 1, currentTimer: 5 })
    ).toEqual({ kind: "apply" });
  });
});

describe("scoreTypeForAvoidingDecision", () => {
  it("maps 1→gamjeom and 2→gamjeomAvoiding", () => {
    expect(scoreTypeForAvoidingDecision(1)).toBe("gamjeom");
    expect(scoreTypeForAvoidingDecision(2)).toBe("gamjeomAvoiding");
    expect(scoreTypeForAvoidingDecision(3)).toBeNull();
  });
});
