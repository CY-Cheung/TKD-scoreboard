import { describe, it, expect } from "vitest";
import {
  listCourtsBoundToMatch,
  getMatchLoadConflict,
  matchLoadConflictMessage,
} from "./matchCourtBinding.js";

describe("listCourtsBoundToMatch", () => {
  it("lists courts with matching currentMatchId", () => {
    expect(
      listCourtsBoundToMatch(
        {
          Court1: { currentMatchId: "M1" },
          Court2: { currentMatchId: "M2" },
          Court3: { currentMatchId: "M1" },
        },
        "M1"
      )
    ).toEqual(["Court1", "Court3"]);
  });

  it("returns empty for missing map/id", () => {
    expect(listCourtsBoundToMatch(null, "M1")).toEqual([]);
    expect(listCourtsBoundToMatch({ Court1: {} }, "")).toEqual([]);
  });
});

describe("getMatchLoadConflict", () => {
  const courts = {
    Court1: { currentMatchId: "M1" },
    Court2: { currentMatchId: "M2" },
  };

  it("allows load when free", () => {
    expect(
      getMatchLoadConflict({
        courtsMap: courts,
        matchId: "M9",
        targetCourtId: "Court1",
      })
    ).toBeNull();
  });

  it("allows re-load onto same court", () => {
    expect(
      getMatchLoadConflict({
        courtsMap: courts,
        matchId: "M1",
        targetCourtId: "Court1",
      })
    ).toBeNull();
  });

  it("blocks when another court holds the match", () => {
    expect(
      getMatchLoadConflict({
        courtsMap: courts,
        matchId: "M1",
        targetCourtId: "Court2",
      })
    ).toEqual({ conflictingCourtIds: ["Court1"] });
  });
});

describe("matchLoadConflictMessage", () => {
  it("names match and courts", () => {
    const msg = matchLoadConflictMessage("M1", ["Court1"], "Court2");
    expect(msg).toContain("M1");
    expect(msg).toContain("Court1");
    expect(msg).toContain("Court2");
  });
});
