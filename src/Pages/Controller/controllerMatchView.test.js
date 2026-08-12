import { describe, it, expect } from "vitest";
import {
  canAcceptScoreInput,
  buildControllerMatchSummary,
  resolveControllerBackPath,
  formatRefereeModeBadge,
  buildScoreActionFeedback,
  DEFAULT_RED_NAME,
} from "./controllerMatchView.js";

describe("canAcceptScoreInput", () => {
  it("blocks when paused or REST", () => {
    expect(canAcceptScoreInput(null)).toBe(false);
    expect(canAcceptScoreInput({ state: { isPaused: true } })).toBe(false);
    expect(
      canAcceptScoreInput({ state: { isPaused: false, phase: "REST" } })
    ).toBe(false);
  });

  it("allows live ROUND", () => {
    expect(
      canAcceptScoreInput({ state: { isPaused: false, phase: "ROUND" } })
    ).toBe(true);
  });
});

describe("buildControllerMatchSummary", () => {
  it("uses defaults when match sparse", () => {
    expect(buildControllerMatchSummary(null, "M1")).toEqual({
      redName: DEFAULT_RED_NAME,
      blueName: "Chung (Blue)",
      matchNo: "M1",
      currentRound: 1,
      isPaused: true,
    });
  });

  it("reads config and state", () => {
    const summary = buildControllerMatchSummary(
      {
        config: {
          matchId: "42",
          competitors: {
            red: { name: "A" },
            blue: { name: "B" },
          },
        },
        state: { currentRound: 3, isPaused: false },
      },
      "ignored"
    );
    expect(summary).toEqual({
      redName: "A",
      blueName: "B",
      matchNo: "42",
      currentRound: 3,
      isPaused: false,
    });
  });
});

describe("nav / badges / feedback", () => {
  it("resolveControllerBackPath", () => {
    expect(resolveControllerBackPath({ uid: "x" })).toBe("/home");
    expect(resolveControllerBackPath(null)).toBe("/court-setup");
  });

  it("formatRefereeModeBadge", () => {
    expect(formatRefereeModeBadge("multiple")).toContain("Multi");
    expect(formatRefereeModeBadge("single")).toContain("Single");
  });

  it("buildScoreActionFeedback", () => {
    expect(buildScoreActionFeedback("red", "+2 Body")).toEqual({
      side: "red",
      text: "RED +2 Body",
    });
  });
});
