import { describe, expect, it } from "vitest";
import {
  createEmptyMatchConfig,
  createInitialMatchState,
  createInitialMatchStats,
  createMatchDocument,
  createStoredMatchRules,
  finalizeParsedMatch,
} from "./matchFactory.js";

describe("createStoredMatchRules", () => {
  it("uses legacy defaults without roundsToWin", () => {
    expect(createStoredMatchRules()).toEqual({
      maxPointGap: 15,
      maxGamjeom: 5,
      roundDuration: 90,
      restDuration: 60,
    });
    expect(createStoredMatchRules()).not.toHaveProperty("roundsToWin");
  });

  it("accepts overrides", () => {
    expect(createStoredMatchRules({ maxGamjeom: 8 }).maxGamjeom).toBe(8);
  });
});

describe("createInitialMatchState / Stats", () => {
  it("matches legacy empty match state shape", () => {
    expect(createInitialMatchState(90)).toMatchObject({
      isStarted: false,
      isPaused: true,
      isFinished: false,
      currentRound: 1,
      timer: 90,
      phase: "ROUND",
      winReason: null,
    });
  });

  it("matches legacy empty stats shape", () => {
    expect(createInitialMatchStats()).toEqual({
      roundWins: { red: 0, blue: 0 },
      blue: { pointsStat: [0, 0, 0, 0, 0], gamjeom: 0 },
      red: { pointsStat: [0, 0, 0, 0, 0], gamjeom: 0 },
    });
  });
});

describe("createEmptyMatchConfig", () => {
  it("builds PDF shell config", () => {
    const config = createEmptyMatchConfig({
      matchId: "A1",
      categoryTitle: "Cadet",
      matchDate: "01/01/2026",
      courtCode: "court2",
    });
    expect(config.matchId).toBe("A1");
    expect(config.rules.roundDuration).toBe(90);
    expect(config.competitors.blue).toEqual({ name: "", affiliatedClub: "" });
  });
});

describe("finalizeParsedMatch / createMatchDocument", () => {
  it("finalizeParsedMatch attaches state/stats from config rules", () => {
    const parsed = {
      config: createEmptyMatchConfig({ matchId: "M1", rules: { roundDuration: 75 } }),
    };
    const doc = finalizeParsedMatch(parsed);
    expect(doc.state.timer).toBe(75);
    expect(doc.stats.roundWins).toEqual({ red: 0, blue: 0 });
  });

  it("createMatchDocument preserves form competitors and rules", () => {
    const rules = { maxPointGap: 12, maxGamjeom: 5, roundDuration: 90, restDuration: 60 };
    const doc = createMatchDocument({
      matchId: "99",
      nextMatchId: "100",
      nextMatchSlot: "blue",
      rules,
      competitors: {
        blue: { name: "A", affiliatedClub: "X", previousMatch: null },
        red: { name: "B", affiliatedClub: "Y", previousMatch: null },
      },
      roundDuration: 90,
    });
    expect(doc.config.nextMatchId).toBe("100");
    expect(doc.config.competitors.blue.name).toBe("A");
    expect(doc.state.timer).toBe(90);
  });
});
