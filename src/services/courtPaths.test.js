import { describe, it, expect } from "vitest";
import {
  flatCourtPath,
  flatCourtsRoot,
  flatRefereeSeatPath,
  refereeSeatPath,
  courtIdsFromCourtsMap,
} from "./courtPaths.js";

describe("courtPaths", () => {
  it("builds flat court roots and segments", () => {
    expect(flatCourtsRoot("e1")).toBe("courts/e1");
    expect(flatCourtPath("e1", "court1", "currentMatchId")).toBe(
      "courts/e1/court1/currentMatchId"
    );
  });

  it("uses flat path as primary referee seat path", () => {
    expect(refereeSeatPath("e1", "court1", "J2")).toBe(
      "courts/e1/court1/referees/J2"
    );
    expect(flatRefereeSeatPath("e1", "court1", "J2")).toBe(
      refereeSeatPath("e1", "court1", "J2")
    );
  });

  it("lists court ids", () => {
    expect(courtIdsFromCourtsMap({ court1: {}, court2: {} })).toEqual([
      "court1",
      "court2",
    ]);
  });
});
