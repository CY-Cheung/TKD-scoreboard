import { describe, it, expect, vi } from "vitest";
import {
  canVibrate,
  armScoreHaptic,
  triggerScoreHaptic,
  SCORE_HAPTIC_MS,
  recentScoreEventKey,
  peekLatestRecentScoreKey,
  shouldVibrateForRecentScores,
} from "./scoreHaptic.js";

describe("scoreHaptic", () => {
  it("detects vibrate support", () => {
    expect(canVibrate({ vibrate: () => true })).toBe(true);
    expect(canVibrate({})).toBe(false);
    expect(canVibrate(null)).toBe(false);
  });

  it("arms with vibrate(0)", () => {
    const vibrate = vi.fn(() => true);
    expect(armScoreHaptic({ vibrate })).toBe(true);
    expect(vibrate).toHaveBeenCalledWith(0);
  });

  it("triggers numeric pulse then pattern fallback", () => {
    const vibrate = vi
      .fn()
      .mockReturnValueOnce(true) // cancel
      .mockReturnValueOnce(false) // number form rejected
      .mockReturnValueOnce(true); // pattern ok
    expect(triggerScoreHaptic({ vibrate })).toBe(true);
    expect(vibrate).toHaveBeenNthCalledWith(1, 0);
    expect(vibrate).toHaveBeenNthCalledWith(2, SCORE_HAPTIC_MS);
    expect(vibrate).toHaveBeenNthCalledWith(3, [SCORE_HAPTIC_MS]);
  });
});

describe("shared recentScores haptic", () => {
  const entry = {
    side: "red",
    index: 0,
    seatNames: ["J2", "J1"],
    timestamp: 1000,
  };

  it("builds a stable event key (sorted seats)", () => {
    expect(recentScoreEventKey(entry)).toBe("1000|red|0|J1,J2");
    expect(recentScoreEventKey(null)).toBeNull();
  });

  it("peeks the latest recentScores key", () => {
    expect(peekLatestRecentScoreKey([])).toBeNull();
    expect(
      peekLatestRecentScoreKey([
        entry,
        { ...entry, timestamp: 2000, index: 1 },
      ])
    ).toBe("2000|red|1|J1,J2");
  });

  it("peeks latest key from Firebase map-shaped recentScores", () => {
    expect(
      peekLatestRecentScoreKey({
        0: entry,
        1: { ...entry, timestamp: 2000, index: 1 },
      })
    ).toBe("2000|red|1|J1,J2");
  });

  it("seeds on first observation without vibrating", () => {
    expect(shouldVibrateForRecentScores([entry], undefined)).toEqual({
      vibrate: false,
      nextKey: "1000|red|0|J1,J2",
    });
  });

  it("vibrates when a new recentScores entry arrives", () => {
    const prev = "1000|red|0|J1,J2";
    const next = [
      entry,
      { side: "blue", index: 2, seatNames: ["J1", "J3"], timestamp: 1500 },
    ];
    expect(shouldVibrateForRecentScores(next, prev)).toEqual({
      vibrate: true,
      nextKey: "1500|blue|2|J1,J3",
    });
  });

  it("does not vibrate on duplicate key", () => {
    expect(shouldVibrateForRecentScores([entry], "1000|red|0|J1,J2")).toEqual({
      vibrate: false,
      nextKey: "1000|red|0|J1,J2",
    });
  });
});
