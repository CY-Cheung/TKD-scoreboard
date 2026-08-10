import { describe, expect, it } from "vitest";
import { EDIT_POINT_TYPES } from "./editPointTypes.jsx";

describe("EDIT_POINT_TYPES", () => {
  it("maps gamjeom plus pointsStat indices 0–4", () => {
    expect(EDIT_POINT_TYPES[0]).toMatchObject({ id: "gamjeom", type: "gamjeom", index: null });
    const pointIndices = EDIT_POINT_TYPES.filter((p) => p.type === "pointsStat").map(
      (p) => p.index
    );
    expect(pointIndices).toEqual([0, 1, 2, 3, 4]);
  });
});
