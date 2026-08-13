import { describe, it, expect } from "vitest";
import {
  canAcceptScoreInput,
  buildControllerMatchSummary,
  resolveControllerBackPath,
  formatRefereeModeBadge,
  buildScoreActionFeedback,
  parseScoreActionLabel,
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
      redScore: 0,
      blueScore: 0,
      roundWins: { red: 0, blue: 0 },
    });
  });

  it("reads config, state, and Screen-style totals", () => {
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
        stats: {
          red: { pointsStat: [1, 1, 0, 0, 0] },
          blue: { pointsStat: [0, 0, 1, 0, 0] },
          roundWins: { red: 1, blue: 1 },
        },
      },
      "ignored"
    );
    expect(summary).toEqual({
      redName: "A",
      blueName: "B",
      matchNo: "42",
      currentRound: 3,
      isPaused: false,
      redScore: 3,
      blueScore: 3,
      roundWins: { red: 1, blue: 1 },
    });
  });
});

describe("parseScoreActionLabel", () => {
  it("splits points and action name", () => {
    expect(parseScoreActionLabel("+6 Turn Head")).toEqual({
      points: "+6",
      name: "Turn Head",
    });
    expect(parseScoreActionLabel("+2 Body")).toEqual({
      points: "+2",
      name: "Body",
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
