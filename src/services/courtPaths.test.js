import { describe, it, expect } from "vitest";
import {
  flatCourtPath,
  legacyCourtPath,
  flatCourtsRoot,
  legacyCourtsRoot,
  flatRefereeSeatPath,
  legacyRefereeSeatPath,
  refereeSeatPath,
  courtIdsFromCourtsMap,
} from "./courtPaths.js";

describe("courtPaths", () => {
  it("builds flat and legacy court roots", () => {
    expect(flatCourtsRoot("e1")).toBe("courts/e1");
    expect(legacyCourtsRoot("e1")).toBe("events/e1/courts");
  });

  it("builds nested segment paths", () => {
    expect(flatCourtPath("e1", "court1", "currentMatchId")).toBe(
      "courts/e1/court1/currentMatchId"
    );
    expect(legacyCourtPath("e1", "court1", "config", "refereeMode")).toBe(
      "events/e1/courts/court1/config/refereeMode"
    );
  });

  it("uses flat path as primary referee seat path", () => {
    expect(refereeSeatPath("e1", "court1", "J2")).toBe(
      "courts/e1/court1/referees/J2"
    );
    expect(flatRefereeSeatPath("e1", "court1", "J2")).toBe(
      refereeSeatPath("e1", "court1", "J2")
    );
    expect(legacyRefereeSeatPath("e1", "court1", "J2")).toBe(
      "events/e1/courts/court1/referees/J2"
    );
  });

  it("lists court ids", () => {
    expect(courtIdsFromCourtsMap({ court1: {}, court2: {} })).toEqual([
      "court1",
      "court2",
    ]);
  });
});
