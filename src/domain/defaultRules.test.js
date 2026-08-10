import { describe, expect, it } from "vitest";
import {
  DEFAULT_MATCH_RULES,
  POINT_WEIGHTS,
  resolveMatchRules,
} from "./defaultRules.js";

describe("defaultRules", () => {
  it("exposes legacy POINT_WEIGHTS", () => {
    expect(POINT_WEIGHTS).toEqual([1, 2, 3, 4, 6]);
  });

  it("exposes legacy DEFAULT_MATCH_RULES", () => {
    expect(DEFAULT_MATCH_RULES).toMatchObject({
      maxPointGap: 15,
      maxGamjeom: 5,
      roundDuration: 90,
      restDuration: 60,
      roundsToWin: 2,
    });
  });

  it("resolveMatchRules is available from defaultRules", () => {
    expect(resolveMatchRules({ maxPointGap: 12 }).maxPointGap).toBe(12);
  });
});
