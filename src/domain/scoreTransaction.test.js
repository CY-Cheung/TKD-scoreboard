import { describe, expect, it } from "vitest";
import {
  VOTE_WINDOW_MS,
  applyScoreAndCheckRules,
  applyGamjeomDelta,
  applyMultipleModeVote,
  applyPtgPunAfterScore,
  ensureMatchScaffold,
  pauseMatchTimerForEvent,
} from "./scoreTransaction.js";

const emptySide = () => ({ pointsStat: [0, 0, 0, 0, 0], gamjeom: 0 });

function baseMatch(overrides = {}) {
  return {
    config: { rules: {} },
    state: {
      isFinished: false,
      isPaused: true,
      timer: 90,
      winReason: null,
      lastStartTime: null,
      dominantSide: "none",
      phase: "ROUND",
    },
    stats: {
      red: emptySide(),
      blue: emptySide(),
    },
    votes: [],
    recentScores: [],
    ...overrides,
  };
}

describe("ensureMatchScaffold", () => {
  it("fills missing state and stats", () => {
    const m = {};
    ensureMatchScaffold(m);
    expect(m.state.isPaused).toBe(true);
    expect(m.stats.red.pointsStat).toHaveLength(5);
    expect(m.stats.blue.gamjeom).toBe(0);
  });
});

describe("applyGamjeomDelta", () => {
  it("clamps gamjeom at 0", () => {
    const side = { gamjeom: 1 };
    applyGamjeomDelta(side, -5);
    expect(side.gamjeom).toBe(0);
  });

  it("tracks gamjeomAvoiding when avoiding", () => {
    const side = { gamjeom: 0 };
    applyGamjeomDelta(side, 1, { avoiding: true });
    expect(side.gamjeom).toBe(1);
    expect(side.gamjeomAvoiding).toBe(1);
  });
});

describe("pauseMatchTimerForEvent", () => {
  it("subtracts elapsed seconds when running", () => {
    const state = {
      isPaused: false,
      lastStartTime: 1_000_000,
      timer: 90,
    };
    pauseMatchTimerForEvent(state, 1_000_000 + 5500);
    expect(state.timer).toBe(85);
    expect(state.isPaused).toBe(true);
    expect(state.lastStartTime).toBeNull();
  });

  it("does not subtract when already paused", () => {
    const state = {
      isPaused: true,
      lastStartTime: null,
      timer: 40,
    };
    pauseMatchTimerForEvent(state, 9_999_999);
    expect(state.timer).toBe(40);
  });
});

describe("applyMultipleModeVote", () => {
  it("early-returns until two unique deviceIds agree", () => {
    const match = baseMatch();
    const first = applyMultipleModeVote(match, {
      side: "red",
      index: 0,
      delta: 1,
      deviceId: "d1",
      seatName: "J1",
      voteNow: 1000,
    });
    expect(first.earlyReturn).toBe(true);
    expect(match.stats.red.pointsStat[0]).toBe(0);
    expect(match.votes).toHaveLength(1);

    const second = applyMultipleModeVote(match, {
      side: "red",
      index: 0,
      delta: 1,
      deviceId: "d2",
      seatName: "J2",
      voteNow: 1200,
    });
    expect(second.scored).toBe(true);
    expect(match.stats.red.pointsStat[0]).toBe(1);
    expect(match.votes.filter((v) => v.side === "red" && v.index === 0)).toHaveLength(
      0
    );
    expect(match.recentScores[0].seatNames.sort()).toEqual(["J1", "J2"]);
  });

  it("drops votes outside VOTE_WINDOW_MS", () => {
    const match = baseMatch();
    applyMultipleModeVote(match, {
      side: "blue",
      index: 1,
      delta: 1,
      deviceId: "d1",
      seatName: "J1",
      voteNow: 0,
    });
    const late = applyMultipleModeVote(match, {
      side: "blue",
      index: 1,
      delta: 1,
      deviceId: "d2",
      seatName: "J2",
      voteNow: VOTE_WINDOW_MS + 1,
    });
    expect(late.earlyReturn).toBe(true);
    expect(match.stats.blue.pointsStat[1]).toBe(0);
    expect(match.votes).toHaveLength(1);
    expect(match.votes[0].deviceId).toBe("d2");
  });

  it("does not score when same deviceId votes twice", () => {
    const match = baseMatch();
    applyMultipleModeVote(match, {
      side: "red",
      index: 2,
      delta: 1,
      deviceId: "same",
      seatName: "J1",
      voteNow: 100,
    });
    const again = applyMultipleModeVote(match, {
      side: "red",
      index: 2,
      delta: 1,
      deviceId: "same",
      seatName: "J2",
      voteNow: 200,
    });
    expect(again.earlyReturn).toBe(true);
    expect(match.stats.red.pointsStat[2]).toBe(0);
  });
});

describe("applyPtgPunAfterScore", () => {
  it("sets PUN when gamjeom hits default max 5", () => {
    const match = baseMatch({
      state: {
        isPaused: false,
        lastStartTime: 1000,
        timer: 50,
        winReason: null,
        dominantSide: "none",
      },
      stats: {
        red: { ...emptySide(), gamjeom: 5 },
        blue: emptySide(),
      },
    });
    applyPtgPunAfterScore(match, 3000);
    expect(match.state.winReason).toBe("PUN");
    expect(match.state.dominantSide).toBe("blue");
    expect(match.state.isPaused).toBe(true);
  });

  it("sets PTG when point gap hits default 15", () => {
    // 4-pt punches × 4 = 16 vs 0
    const match = baseMatch({
      stats: {
        red: { pointsStat: [0, 0, 0, 4, 0], gamjeom: 0 },
        blue: emptySide(),
      },
    });
    applyPtgPunAfterScore(match, Date.now());
    expect(match.state.winReason).toBe("PTG");
    expect(match.state.dominantSide).toBe("red");
  });

  it("clears stale PTG/PUN when gap no longer holds", () => {
    const match = baseMatch({
      state: {
        isPaused: true,
        lastStartTime: null,
        timer: 40,
        winReason: "PTG",
        dominantSide: "red",
      },
      stats: {
        red: emptySide(),
        blue: emptySide(),
      },
    });
    applyPtgPunAfterScore(match, Date.now());
    expect(match.state.winReason).toBeNull();
    expect(match.state.dominantSide).toBe("none");
  });

  it("respects custom maxGamjeom / maxPointGap from rules", () => {
    const match = baseMatch({
      config: { rules: { maxGamjeom: 3, maxPointGap: 8 } },
      stats: {
        red: { ...emptySide(), gamjeom: 3 },
        blue: emptySide(),
      },
    });
    applyPtgPunAfterScore(match, Date.now());
    expect(match.state.winReason).toBe("PUN");
  });
});

describe("applyScoreAndCheckRules", () => {
  const clocks = { voteNow: 10_000, pauseNow: 10_000 };

  it("returns undefined when matchData is null", () => {
    expect(
      applyScoreAndCheckRules(null, { side: "red", type: "gamjeom", delta: 1 }, clocks)
    ).toBeUndefined();
  });

  it("no-ops during REST phase (returns undefined like legacy early return)", () => {
    const match = baseMatch({
      state: { ...baseMatch().state, phase: "REST" },
    });
    const result = applyScoreAndCheckRules(
      match,
      { side: "red", type: "gamjeom", index: null, delta: 1 },
      clocks
    );
    // Legacy: `if (phase === 'REST') return;` → undefined abort
    expect(result).toBeUndefined();
    expect(match.stats.red.gamjeom).toBe(0);
  });

  it("applies single-mode pointsStat and recentScores", () => {
    const match = baseMatch();
    applyScoreAndCheckRules(
      match,
      {
        side: "blue",
        type: "pointsStat",
        index: 0,
        delta: 1,
        seatName: "J1",
        mode: "single",
      },
      clocks
    );
    expect(match.stats.blue.pointsStat[0]).toBe(1);
    expect(match.recentScores).toHaveLength(1);
    expect(match.recentScores[0].timestamp).toBe(clocks.voteNow);
  });

  it("does not push recentScores when delta <= 0 in single mode", () => {
    const match = baseMatch({
      stats: {
        red: { pointsStat: [2, 0, 0, 0, 0], gamjeom: 0 },
        blue: emptySide(),
      },
    });
    applyScoreAndCheckRules(
      match,
      {
        side: "red",
        type: "pointsStat",
        index: 0,
        delta: -1,
        mode: "single",
      },
      clocks
    );
    expect(match.stats.red.pointsStat[0]).toBe(1);
    expect(match.recentScores).toHaveLength(0);
  });

  it("stores providedCourtId / providedDeviceId when both present", () => {
    const match = baseMatch();
    applyScoreAndCheckRules(
      match,
      {
        side: "red",
        type: "gamjeom",
        delta: 1,
        courtId: "court1",
        deviceId: "devA",
      },
      clocks
    );
    expect(match.providedCourtId).toBe("court1");
    expect(match.providedDeviceId).toBe("devA");
    expect(match.stats.red.gamjeom).toBe(1);
  });

  it("multiple mode saves vote without scoring until second unique device", () => {
    const match = baseMatch();
    const afterOne = applyScoreAndCheckRules(
      match,
      {
        side: "red",
        type: "pointsStat",
        index: 1,
        delta: 1,
        deviceId: "a",
        seatName: "J1",
        mode: "multiple",
      },
      clocks
    );
    expect(afterOne.stats.red.pointsStat[1]).toBe(0);
    expect(afterOne.votes).toHaveLength(1);
    // PTG/PUN not applied on early vote-only path
    expect(afterOne.state.winReason).toBeNull();

    applyScoreAndCheckRules(
      match,
      {
        side: "red",
        type: "pointsStat",
        index: 1,
        delta: 1,
        deviceId: "b",
        seatName: "J2",
        mode: "multiple",
      },
      { voteNow: clocks.voteNow + 100, pauseNow: clocks.pauseNow }
    );
    expect(match.stats.red.pointsStat[1]).toBe(1);
  });

  it("gamjeomAvoiding increments both counters", () => {
    const match = baseMatch();
    applyScoreAndCheckRules(
      match,
      { side: "blue", type: "gamjeomAvoiding", delta: 1 },
      clocks
    );
    expect(match.stats.blue.gamjeom).toBe(1);
    expect(match.stats.blue.gamjeomAvoiding).toBe(1);
  });
});
