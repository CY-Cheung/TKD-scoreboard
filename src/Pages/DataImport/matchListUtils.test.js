import { describe, it, expect } from "vitest";
import {
  listAvailableMatchDates,
  filterMatchIdsByDate,
  getCompetitorDisplayText,
  parseEventDisplayParts,
} from "./matchListUtils.js";

describe("listAvailableMatchDates", () => {
  it("returns unique dates in first-seen order", () => {
    const matches = {
      a: { config: { matchDate: "2026-01-01" } },
      b: { config: { matchDate: "2026-01-02" } },
      c: { config: { matchDate: "2026-01-01" } },
      d: { config: {} },
    };
    expect(listAvailableMatchDates(matches)).toEqual([
      "2026-01-01",
      "2026-01-02",
    ]);
  });
});

describe("filterMatchIdsByDate", () => {
  const matches = {
    a: { config: { matchDate: "2026-01-01" } },
    b: { config: { matchDate: "2026-01-02" } },
  };

  it("returns all ids when filter is all", () => {
    expect(filterMatchIdsByDate(matches, "all")).toEqual(["a", "b"]);
  });

  it("filters by date", () => {
    expect(filterMatchIdsByDate(matches, "2026-01-02")).toEqual(["b"]);
  });
});

describe("getCompetitorDisplayText", () => {
  it("shows previousMatch winner when name/club empty", () => {
    expect(
      getCompetitorDisplayText({ previousMatch: "A1001" })
    ).toBe("A1001 Winner");
  });

  it("appends club when present", () => {
    expect(
      getCompetitorDisplayText({ name: " ann", affiliatedClub: "HK" })
    ).toBe(" ann (HK)");
  });

  it("falls back to name", () => {
    expect(getCompetitorDisplayText({ name: "Bob" })).toBe("Bob");
  });
});

describe("parseEventDisplayParts", () => {
  it("parses Day N titles", () => {
    expect(
      parseEventDisplayParts("Open Cup (Day 1) (Sat)")
    ).toEqual({
      title: "Open Cup",
      dayLabel: "Day 1",
      subLabel: "Sat",
    });
  });

  it("returns raw title when no day pattern", () => {
    expect(parseEventDisplayParts("Open Cup")).toEqual({
      title: "Open Cup",
      dayLabel: null,
      subLabel: null,
    });
  });
});
