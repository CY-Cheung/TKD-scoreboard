import { describe, it, expect } from "vitest";
import { buildMatchLiveTransactionCommit } from "./matchFirebase.js";
import { extractMatchLivePayload } from "./matchPaths.js";

describe("buildMatchLiveTransactionCommit (Stage 5c)", () => {
  const config = {
    matchId: "A1001",
    rules: { maxPointGap: 12, roundDuration: 90 },
  };

  const live = {
    state: { isPaused: false, phase: "ROUND" },
    stats: { red: { pointsStat: [1, 0, 0, 0, 0], gamjeom: 0 }, blue: { pointsStat: [0, 0, 0, 0, 0], gamjeom: 0 } },
    votes: [],
    recentScores: [],
    providedCourtId: "court1",
    providedDeviceId: "dev1",
  };

  it("aborts when live and bootstrap are both null", () => {
    expect(
      buildMatchLiveTransactionCommit(null, null, config, (m) => m)
    ).toBeUndefined();
  });

  it("bootstraps from empty shell when live is null", () => {
    const commit = buildMatchLiveTransactionCommit(
      null,
      live,
      config,
      (matchData) => {
        expect(matchData.config).toEqual(config);
        matchData.stats.red.pointsStat[0] += 1;
        return matchData;
      },
      12345
    );
    expect(commit.state.isPaused).toBe(false);
    expect(commit.stats.red.pointsStat[0]).toBe(2);
    expect(commit.config).toBeUndefined();
    expect(commit.updatedAt).toBe(12345);
  });

  it("injects config into existing live node for rules helpers", () => {
    let sawConfig = null;
    buildMatchLiveTransactionCommit(live, null, config, (matchData) => {
      sawConfig = matchData.config;
      return matchData;
    });
    expect(sawConfig).toEqual(config);
  });

  it("returns undefined when updater aborts", () => {
    expect(
      buildMatchLiveTransactionCommit(live, null, config, () => undefined)
    ).toBeUndefined();
  });

  it("matches extractMatchLivePayload shape", () => {
    const commit = buildMatchLiveTransactionCommit(
      live,
      null,
      config,
      (m) => m,
      99
    );
    expect(commit).toEqual(extractMatchLivePayload({ ...live, config }, 99));
  });
});
