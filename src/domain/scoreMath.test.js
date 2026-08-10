import { describe, expect, it } from "vitest";
import { getScoreValue } from "./scoreMath.js";

describe("getScoreValue", () => {
  it("returns 0 for empty / missing stats", () => {
    expect(getScoreValue(undefined, undefined)).toBe(0);
    expect(getScoreValue({}, {})).toBe(0);
  });

  it("applies legacy weights 1/2/3/4/6 on pointsStat", () => {
    const stats = { pointsStat: [1, 1, 1, 1, 1] };
    // 1+2+3+4+6 = 16
    expect(getScoreValue(stats, {})).toBe(16);
  });

  it("adds opponent gamjeom and gamjeomAvoiding", () => {
    const stats = { pointsStat: [0, 0, 0, 0, 0] };
    const opponent = { gamjeom: 2, gamjeomAvoiding: 1 };
    expect(getScoreValue(stats, opponent)).toBe(3);
  });

  it("matches Screen/Api combined formula for a realistic row", () => {
    const red = { pointsStat: [1, 0, 1, 0, 0], gamjeom: 1 };
    const blue = { pointsStat: [0, 1, 0, 0, 0], gamjeom: 0, gamjeomAvoiding: 0 };
    // red: 1 + 3 + blue gamjeom 0 = 4
    expect(getScoreValue(red, blue)).toBe(4);
    // blue: 2 + red gamjeom 1 = 3
    expect(getScoreValue(blue, red)).toBe(3);
  });
});
