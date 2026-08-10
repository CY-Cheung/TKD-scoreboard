import { describe, expect, it } from "vitest";
import {
  applyDeclareRoundWinner,
  applyStartNextRound,
} from "./roundTransaction.js";

const emptySide = (extra = {}) => ({
  pointsStat: [0, 0, 0, 0, 0],
  gamjeom: 0,
  ...extra,
});

function matchAtRound(round = 1, wins = { red: 0, blue: 0 }) {
  return {
    config: { rules: {} },
    state: {
      currentRound: round,
      phase: "ROUND",
      isFinished: false,
      isPaused: true,
      timer: 10,
      winReason: "PTG",
      dominantSide: "red",
      lastStartTime: null,
    },
    stats: {
      red: emptySide({ pointsStat: [1, 0, 0, 0, 0], ivrRemaining: 2 }),
      blue: emptySide({ pointsStat: [0, 1, 0, 0, 0] }),
      roundWins: { ...wins },
      roundScores: {},
    },
    recentScores: [{ side: "red", index: 0 }],
  };
}

describe("applyDeclareRoundWinner", () => {
  it("returns undefined for null match", () => {
    expect(applyDeclareRoundWinner(null, "red", 1)).toBeUndefined();
  });

  it("records round score and enters REST when match not final", () => {
    const m = matchAtRound(1, { red: 0, blue: 0 });
    const now = 50_000;
    applyDeclareRoundWinner(m, "red", now);
    expect(m.stats.roundWins.red).toBe(1);
    expect(m.stats.roundScores.R1).toEqual({ red: 1, blue: 2 }); // blue has 1×2pt
    expect(m.state.phase).toBe("REST");
    expect(m.state.timer).toBe(60);
    expect(m.state.isPaused).toBe(false);
    expect(m.state.lastStartTime).toBe(now);
    expect(m.state.winReason).toBeNull();
    expect(m.recentScores).toEqual([]);
    expect(m.stats.red.pointsStat).toEqual([0, 0, 0, 0, 0]);
    expect(m.stats.red.ivrRemaining).toBe(2);
  });

  it("finishes with PTF when roundsToWin reached", () => {
    const m = matchAtRound(2, { red: 1, blue: 0 });
    applyDeclareRoundWinner(m, "red", 99);
    expect(m.stats.roundWins.red).toBe(2);
    expect(m.state.isFinished).toBe(true);
    expect(m.state.winReason).toBe("PTF");
    expect(m.state.phase).toBe("ROUND");
    expect(m.state.timer).toBe(0);
    expect(m.state.isPaused).toBe(true);
  });

  it("respects custom roundsToWin", () => {
    const m = matchAtRound(1, { red: 0, blue: 0 });
    m.config.rules = { roundsToWin: 1 };
    applyDeclareRoundWinner(m, "blue", 1);
    expect(m.state.isFinished).toBe(true);
    expect(m.stats.roundWins.blue).toBe(1);
  });
});

describe("applyStartNextRound", () => {
  it("increments round and resets to paused ROUND", () => {
    const m = matchAtRound(1);
    m.state.phase = "REST";
    m.stats.red = emptySide({ pointsStat: [3, 0, 0, 0, 0], ivrRemaining: 1 });
    applyStartNextRound(m);
    expect(m.state.currentRound).toBe(2);
    expect(m.state.phase).toBe("ROUND");
    expect(m.state.timer).toBe(90);
    expect(m.state.isPaused).toBe(true);
    expect(m.state.lastStartTime).toBeNull();
    expect(m.stats.red.pointsStat).toEqual([0, 0, 0, 0, 0]);
    expect(m.stats.red.ivrRemaining).toBe(1);
  });
});
