import { describe, expect, it } from "vitest";
import { CONTROLLER_SCORE_COLUMNS } from "./controllerScoreActions.js";

describe("CONTROLLER_SCORE_COLUMNS", () => {
  it("covers all pointsStat indices 0–4 for both sides", () => {
    const bySide = { red: new Set(), blue: new Set() };
    CONTROLLER_SCORE_COLUMNS.forEach((col) => {
      col.actions.forEach((a) => bySide[col.side].add(a.index));
    });
    expect([...bySide.red].sort()).toEqual([0, 1, 2, 3, 4]);
    expect([...bySide.blue].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it("keeps red columns before blue columns", () => {
    const sides = CONTROLLER_SCORE_COLUMNS.map((c) => c.side);
    expect(sides.indexOf("red")).toBeLessThan(sides.indexOf("blue"));
  });
});
