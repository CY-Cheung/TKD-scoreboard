import { describe, expect, it } from "vitest";
import { getScoreValue } from "./scoreMath.js";
import {
  determineDominantSide,
  getFinalWinnerSide,
  isMatchFinal,
  resetSideStatsForNextRound,
  resolveMatchRules,
} from "./matchRules.js";

describe("resolveMatchRules", () => {
  it("fills defaults when rules are empty", () => {
    expect(resolveMatchRules()).toEqual({
      maxPointGap: 15,
      maxGamjeom: 5,
      roundDuration: 90,
      restDuration: 60,
      roundsToWin: 2,
    });
  });

  it("preserves provided overrides", () => {
    expect(resolveMatchRules({ maxGamjeom: 8, roundsToWin: 3 }).maxGamjeom).toBe(
      8
    );
    expect(resolveMatchRules({ maxGamjeom: 8, roundsToWin: 3 }).roundsToWin).toBe(
      3
    );
  });
});

describe("resetSideStatsForNextRound", () => {
  it("clears gamjeom and pointsStat", () => {
    const next = resetSideStatsForNextRound({
      gamjeom: 3,
      pointsStat: [1, 2, 0, 0, 0],
      gamjeomAvoiding: 1,
    });
    expect(next).toEqual({ gamjeom: 0, pointsStat: [0, 0, 0, 0, 0] });
  });

  it("keeps numeric ivrRemaining", () => {
    const next = resetSideStatsForNextRound({
      gamjeom: 2,
      pointsStat: [1, 0, 0, 0, 0],
      ivrRemaining: 1,
    });
    expect(next.ivrRemaining).toBe(1);
  });

  it("does not keep non-numeric ivrRemaining", () => {
    const next = resetSideStatsForNextRound({ ivrRemaining: "x" });
    expect(next).not.toHaveProperty("ivrRemaining");
  });
});

describe("determineDominantSide", () => {
  const empty = { pointsStat: [0, 0, 0, 0, 0], gamjeom: 0 };

  it("returns none when fully tied", () => {
    expect(determineDominantSide(empty, empty)).toBe("none");
  });

  it("PUN-style: gamjeom >= default 5 awards opponent", () => {
    expect(
      determineDominantSide({ ...empty, gamjeom: 5 }, empty)
    ).toBe("blue");
    expect(
      determineDominantSide(empty, { ...empty, gamjeom: 5 })
    ).toBe("red");
  });

  it("respects custom maxGamjeom for PUN threshold", () => {
    expect(
      determineDominantSide({ ...empty, gamjeom: 3 }, empty, 3)
    ).toBe("blue");
    // Below threshold: equal stats otherwise → none (not PUN)
    expect(
      determineDominantSide(
        { ...empty, gamjeom: 2 },
        { ...empty, gamjeom: 2 },
        3
      )
    ).toBe("none");
  });

  it("prefers higher total score", () => {
    const red = { pointsStat: [0, 0, 1, 0, 0], gamjeom: 0 }; // 3
    const blue = { pointsStat: [1, 0, 0, 0, 0], gamjeom: 0 }; // 1
    expect(determineDominantSide(red, blue)).toBe("red");
  });

  it("uses turning-point tie-break when totals equal", () => {
    // red: body-turn x1 = 4; blue: punch x4 = 4
    const red = { pointsStat: [0, 0, 0, 1, 0], gamjeom: 0 };
    const blue = { pointsStat: [4, 0, 0, 0, 0], gamjeom: 0 };
    expect(getScoreValue(red, blue)).toBe(4);
    expect(getScoreValue(blue, red)).toBe(4);
    expect(determineDominantSide(red, blue)).toBe("red");
  });
});

describe("getFinalWinnerSide / isMatchFinal", () => {
  it("uses default roundsToWin of 2", () => {
    expect(getFinalWinnerSide({ red: 2, blue: 0 })).toBe("red");
    expect(getFinalWinnerSide({ red: 1, blue: 1 })).toBe(null);
    expect(isMatchFinal({ red: 0, blue: 2 })).toBe(true);
    expect(isMatchFinal({ red: 1, blue: 0 })).toBe(false);
  });

  it("respects custom roundsToWin", () => {
    expect(getFinalWinnerSide({ red: 2, blue: 0 }, 3)).toBe(null);
    expect(getFinalWinnerSide({ red: 3, blue: 1 }, 3)).toBe("red");
  });
});
