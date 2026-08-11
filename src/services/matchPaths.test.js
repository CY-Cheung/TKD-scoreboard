import { describe, it, expect } from "vitest";
import {
  legacyMatchPath,
  matchLivePath,
  extractMatchLivePayload,
  mergeMatchView,
} from "./matchPaths.js";

describe("matchPaths", () => {
  it("builds legacy and live paths", () => {
    expect(legacyMatchPath("e1", "m1", "state")).toBe(
      "events/e1/matches/m1/state"
    );
    expect(matchLivePath("e1", "m1", "stats", "red")).toBe(
      "matchLive/e1/m1/stats/red"
    );
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

  it("mergeMatchView prefers live over legacy", () => {
    const merged = mergeMatchView(
      { matchId: "m1" },
      { state: { timer: 10 }, stats: null, votes: null, recentScores: null },
      { config: { matchId: "old" }, state: { timer: 99 } }
    );
    expect(merged.config.matchId).toBe("m1");
    expect(merged.state.timer).toBe(10);
  });
});
