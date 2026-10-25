import { describe, it, expect } from "vitest";
import {
  parseCsvText,
  parseMatchesCsv,
  parseMatchesJson,
  buildParseResultFromMatchRows,
} from "./tabularImport.js";

describe("parseCsvText", () => {
  it("handles quoted fields with commas", () => {
    const rows = parseCsvText(
      'matchId,blueName,blueClub\nA1001,"Lee, Ka Ming","HK Club, Central"\n'
    );
    expect(rows).toHaveLength(2);
    expect(rows[1][1]).toBe("Lee, Ka Ming");
    expect(rows[1][2]).toBe("HK Club, Central");
  });

  it("skips blank lines", () => {
    const rows = parseCsvText("a,b\n\n1,2\n\n");
    expect(rows).toHaveLength(2);
  });
});

describe("parseMatchesCsv", () => {
  it("parses header aliases and builds pdfParseResult shape", () => {
    const csv = [
      "matchId,blueName,blueAffiliatedClub,redName,redClub,nextMatchId,nextMatchSlot,matchDate,categoryTitle,eventName",
      "A1001,Blue Athlete,Blue Club,Red Athlete,Red Club,A1003,blue,01/08/2026,Male -58kg,Test Open",
      // 10 columns: empty blue; red = Winner of A; empty club/next*; date; category; event
      "A1002,,,Winner of A,,,,01/08/2026,Male -58kg,Test Open",
    ].join("\n");

    const result = parseMatchesCsv(csv);
    expect(result.matchCount).toBe(2);
    expect(result.eventName).toBe("Test Open");
    expect(result.courtId).toBe("court1");
    expect(result.datesList).toEqual(["01/08/2026"]);
    expect(result.matches.A1001.config.competitors.blue.name).toBe(
      "Blue Athlete"
    );
    expect(result.matches.A1001.config.competitors.blue.affiliatedClub).toBe(
      "Blue Club"
    );
    expect(result.matches.A1001.config.nextMatchId).toBe("A1003");
    expect(result.matches.A1001.config.nextMatchSlot).toBe("blue");
    expect(result.matches.A1001.state).toBeDefined();
    expect(result.matches.A1001.stats).toBeDefined();
    expect(result.categories).toContain("Male -58kg");
    expect(result.matches.A1002.config.competitors.red.name).toBe(
      "Winner of A"
    );
  });

  it("rejects missing matchId column", () => {
    expect(() => parseMatchesCsv("blueName\nAlice\n")).toThrow(/matchId/);
  });

  it("rejects row missing matchId with row hint", () => {
    expect(() =>
      parseMatchesCsv("matchId,blueName\n,Alice\n")
    ).toThrow(/第 2 行.*matchId/);
  });

  it("rejects zero matches", () => {
    // Header only after blank data rows are skipped → no matches
    expect(() =>
      parseMatchesCsv("matchId,blueName\n,\n")
    ).toThrow(/標題列與至少一列資料|0 場/);
  });
});

describe("parseMatchesJson", () => {
  it("accepts top-level array", () => {
    const result = parseMatchesJson([
      { matchId: "B1", blueName: "A", redName: "B", eventName: "Arr Event" },
    ]);
    expect(result.matchCount).toBe(1);
    expect(result.eventName).toBe("Arr Event");
    expect(result.matches.B1.config.competitors.red.name).toBe("B");
  });

  it("accepts { matches: [...] }", () => {
    const result = parseMatchesJson({
      eventName: "Obj Event",
      courtId: "court2",
      matches: [{ matchId: "C1", blueName: "X", redName: "Y" }],
    });
    expect(result.eventName).toBe("Obj Event");
    expect(result.courtId).toBe("court2");
    expect(result.matches.C1).toBeDefined();
  });

  it("accepts { matches: { id: {...} } } including nested config", () => {
    const result = parseMatchesJson({
      eventName: "Map Event",
      matches: {
        D1: {
          config: {
            matchId: "D1",
            categoryTitle: "Cat",
            matchDate: "02/08/2026",
            nextMatchId: null,
            nextMatchSlot: null,
            competitors: {
              blue: { name: "Blue", affiliatedClub: "BC" },
              red: { name: "", affiliatedClub: "", previousMatch: "D0" },
            },
          },
        },
      },
    });
    expect(result.matches.D1.config.competitors.red.previousMatch).toBe("D0");
    expect(result.datesList).toContain("02/08/2026");
  });

  it("splits multi-date into dateGroups", () => {
    const result = buildParseResultFromMatchRows([
      { matchId: "M1", matchDate: "01/08/2026", blueName: "A", redName: "B" },
      { matchId: "M2", matchDate: "02/08/2026", blueName: "C", redName: "D" },
    ]);
    expect(result.datesList).toEqual(["01/08/2026", "02/08/2026"]);
    expect(Object.keys(result.dateGroups["01/08/2026"].matches)).toEqual([
      "M1",
    ]);
    expect(Object.keys(result.dateGroups["02/08/2026"].matches)).toEqual([
      "M2",
    ]);
  });

  it("rejects missing matchId in JSON array with index hint", () => {
    expect(() =>
      parseMatchesJson([{ blueName: "Only Name" }])
    ).toThrow(/第 1 行.*matchId/);
  });

  it("rejects invalid JSON string", () => {
    expect(() => parseMatchesJson("{not json")).toThrow(/JSON/);
  });
});
