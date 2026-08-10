import { describe, expect, it } from "vitest";
import { buildSideVoteLogs, shouldReverseVoteCells } from "./voteLogUtils.js";

describe("buildSideVoteLogs", () => {
  const now = 10_000;
  const windowMs = 1000;

  it("groups pending votes by index within the vote window", () => {
    const votes = [
      { side: "red", index: 1, seatName: "J1", timestamp: now - 100 },
      { side: "red", index: 1, seatName: "J2", timestamp: now - 50 },
      { side: "red", index: 0, seatName: "J1", timestamp: now - 2000 }, // expired
      { side: "blue", index: 1, seatName: "J3", timestamp: now - 10 },
    ];

    const logs = buildSideVoteLogs(votes, [], "red", now, windowMs);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ type: "pending", index: 1 });
    expect(logs[0].seatNames.sort()).toEqual(["J1", "J2"]);
    expect(logs[0].timestamp).toBe(now - 50);
  });

  it("includes success scores and sorts newest first", () => {
    const recentScores = [
      { side: "blue", index: 2, seatNames: ["J1", "J2"], timestamp: 100 },
      { side: "blue", index: 0, seatNames: ["J1"], timestamp: 300 },
    ];
    const logs = buildSideVoteLogs([], recentScores, "blue", now, windowMs);
    expect(logs.map((l) => l.timestamp)).toEqual([300, 100]);
    expect(logs.every((l) => l.type === "success")).toBe(true);
  });
});

describe("shouldReverseVoteCells", () => {
  it("reverses red in row and blue in row-reverse", () => {
    expect(shouldReverseVoteCells("red", "row")).toBe(true);
    expect(shouldReverseVoteCells("blue", "row-reverse")).toBe(true);
    expect(shouldReverseVoteCells("blue", "row")).toBe(false);
    expect(shouldReverseVoteCells("red", "row-reverse")).toBe(false);
  });
});
