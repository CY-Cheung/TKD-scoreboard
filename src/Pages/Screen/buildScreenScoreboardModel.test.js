import { describe, it, expect } from "vitest";
import { buildScreenScoreboardModel } from "./buildScreenScoreboardModel.js";

describe("buildScreenScoreboardModel", () => {
  it("builds resting board with zero scores when not loaded", () => {
    const model = buildScreenScoreboardModel({
      state: { phase: "REST", isPaused: true, currentRound: 2 },
      config: { matchId: "M9", rules: {} },
      stats: { red: {}, blue: {}, roundWins: { red: 1, blue: 0 } },
      isMatchLoaded: false,
      eventSettings: {},
      matchRules: {},
    });
    expect(model.isResting).toBe(true);
    expect(model.matchNumber).toBe("M9");
    expect(model.currentRound).toBe(2);
    expect(model.redTotalScore).toBe(0);
    expect(model.dominantSide).toBe("none");
    expect(model.roundWins).toEqual({ red: 1, blue: 0 });
  });

  it("computes scores when loaded", () => {
    const model = buildScreenScoreboardModel({
      state: { phase: "ROUND", isPaused: false, currentRound: 1 },
      config: { matchId: "1", rules: { maxGamjeom: 5, roundsToWin: 2 } },
      stats: {
        red: { pointsStat: [0, 1, 0, 0, 0], gamjeom: 0 },
        blue: { pointsStat: [0, 0, 0, 0, 0], gamjeom: 0 },
        roundWins: { red: 0, blue: 0 },
      },
      isMatchLoaded: true,
      eventSettings: {},
      matchRules: {},
    });
    expect(model.isResting).toBe(false);
    expect(model.redTotalScore).toBe(2);
    expect(model.timerColor).toBe("#FFFFFF");
  });
});
