import { describe, it, expect } from "vitest";
import {
  matchLivePath,
  flatMatchConfigPath,
  matchIndexPath,
  extractMatchLivePayload,
  extractMatchConfig,
  extractMatchIndexPayload,
  assembleMatchesFromFlat,
} from "./matchPaths.js";

describe("matchPaths", () => {
  it("builds live, flat config, and index paths", () => {
    expect(matchLivePath("e1", "m1", "stats", "red")).toBe(
      "matchLive/e1/m1/stats/red"
    );
    expect(flatMatchConfigPath("e1", "m1")).toBe("matches/e1/m1/config");
    expect(flatMatchConfigPath("e1", "m1", "competitors", "red")).toBe(
      "matches/e1/m1/config/competitors/red"
    );
    expect(matchIndexPath("e1", "m1")).toBe("matchIndex/e1/m1");
  });

  it("extractMatchLivePayload strips config and stamps updatedAt", () => {
    const live = extractMatchLivePayload(
      {
        config: { matchId: "m1" },
        state: { timer: 90 },
        stats: { red: {} },
        votes: [],
        recentScores: [],
        providedCourtId: "court1",
        providedDeviceId: "d1",
      },
      12345
    );
    expect(live.config).toBeUndefined();
    expect(live.state.timer).toBe(90);
    expect(live.providedCourtId).toBe("court1");
    expect(live.updatedAt).toBe(12345);
  });

  it("extractMatchConfig and extractMatchIndexPayload", () => {
    const match = {
      config: {
        matchId: "A100",
        matchDate: "2026/05/16",
        categoryTitle: "Cadet",
        courtCode: "1",
        nextMatchId: "A200",
        nextMatchSlot: "red",
        competitors: {
          red: { name: "R", affiliatedClub: "RC" },
          blue: { name: "B", affiliatedClub: "BC" },
        },
      },
      state: { timer: 1 },
    };
    expect(extractMatchConfig(match).matchId).toBe("A100");
    expect(extractMatchIndexPayload(match)).toEqual({
      matchId: "A100",
      matchDate: "2026/05/16",
      categoryTitle: "Cadet",
      courtCode: "1",
      nextMatchId: "A200",
      nextMatchSlot: "red",
      redName: "R",
      redClub: "RC",
      blueName: "B",
      blueClub: "BC",
    });
  });

  it("assembleMatchesFromFlat merges config + live", () => {
    const assembled = assembleMatchesFromFlat(
      { m1: { config: { matchId: "m1" } } },
      { m1: { state: { timer: 10 }, stats: { red: {} } } }
    );
    expect(assembled.m1.config.matchId).toBe("m1");
    expect(assembled.m1.state.timer).toBe(10);
    expect(assembled.m1.stats.red).toEqual({});
  });
});
