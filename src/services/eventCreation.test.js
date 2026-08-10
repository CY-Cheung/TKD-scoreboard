import { describe, expect, it } from "vitest";
import {
  applyRulesToPdfResult,
  buildCourtsMap,
  buildEventRecords,
  formatPdfDate,
  normalizeRulesFromForm,
} from "./eventCreation.js";

describe("normalizeRulesFromForm", () => {
  it("falls back to legacy defaults", () => {
    expect(normalizeRulesFromForm({})).toEqual({
      maxPointGap: 15,
      maxGamjeom: 5,
      roundDuration: 90,
      restDuration: 60,
    });
  });

  it("parses numeric strings", () => {
    expect(
      normalizeRulesFromForm({
        maxPointGap: "12",
        maxGamjeom: "8",
        roundDuration: "100",
        restDuration: "45",
      })
    ).toEqual({
      maxPointGap: 12,
      maxGamjeom: 8,
      roundDuration: 100,
      restDuration: 45,
    });
  });
});

describe("buildCourtsMap", () => {
  it("builds N courts and clamps to 1–12", () => {
    expect(Object.keys(buildCourtsMap(4).courts)).toHaveLength(4);
    expect(buildCourtsMap(0).count).toBe(4); // invalid → fallback 4
    expect(buildCourtsMap(99).count).toBe(12);
    expect(buildCourtsMap(1).courts.court1).toEqual({
      name: "court1",
      currentMatchId: "",
    });
  });
});

describe("formatPdfDate", () => {
  it("converts DD/MM/YYYY", () => {
    expect(formatPdfDate("10/08/2026")).toEqual({
      formattedDate: "2026/08/10",
      cleanDate: "20260810",
    });
  });

  it("falls back for non-standard strings", () => {
    expect(formatPdfDate("nodate").formattedDate).toBe("nodate");
  });
});

describe("applyRulesToPdfResult", () => {
  it("merges rules onto matches in-place", () => {
    const pdf = {
      matches: {
        M1: { config: { rules: { maxGamjeom: 5, roundDuration: 90 } } },
      },
    };
    applyRulesToPdfResult(pdf, { maxGamjeom: 8, maxPointGap: 12, roundDuration: 90, restDuration: 60 });
    expect(pdf.matches.M1.config.rules.maxGamjeom).toBe(8);
    expect(pdf.matches.M1.config.rules.maxPointGap).toBe(12);
  });
});

describe("buildEventRecords", () => {
  const user = { uid: "u1", email: "a@b.com" };
  const settings = {
    setupPassword: "pw",
    maxPointGap: 15,
    maxGamjeom: 5,
    roundDuration: 90,
    restDuration: 60,
  };
  const { courts, count } = buildCourtsMap(2);

  it("builds empty event", () => {
    const result = buildEventRecords({
      eventId: "E1",
      eventName: "Open",
      user,
      settings,
      courts,
      courtCount: count,
      pdfParseResult: null,
      now: 123,
    });
    expect(result.mode).toBe("empty");
    expect(result.records).toHaveLength(1);
    expect(result.records[0].data.matches).toEqual({});
    expect(result.records[0].data.createdAt).toBe(123);
    expect(result.records[0].data.courts).toBe(courts);
  });

  it("splits multi-day PDF into sub-events", () => {
    const pdf = {
      datesList: ["10/08/2026", "11/08/2026"],
      dateGroups: {
        "10/08/2026": {
          matches: { A1: { config: { rules: { maxGamjeom: 5 } } } },
        },
        "11/08/2026": {
          matches: { B1: { config: { rules: { maxGamjeom: 5 } } } },
        },
      },
      matches: {},
    };

    const result = buildEventRecords({
      eventId: "TKD",
      eventName: "Cup",
      user,
      settings: { ...settings, maxGamjeom: 7 },
      courts,
      courtCount: count,
      pdfParseResult: pdf,
      now: 999,
    });

    expect(result.mode).toBe("multi");
    expect(result.records).toHaveLength(2);
    expect(result.primaryEventId).toBe("TKD_Day1_20260810");
    expect(result.records[0].id).toBe("TKD_Day1_20260810");
    expect(result.records[0].data.EventName).toContain("Day 1");
    expect(result.records[0].data.matchDate).toBe("2026/08/10");
    expect(result.records[1].id).toBe("TKD_Day2_20260811");
    // rules overlay applied
    expect(pdf.dateGroups["10/08/2026"].matches.A1.config.rules.maxGamjeom).toBe(7);
  });

  it("builds single-day PDF event", () => {
    const pdf = {
      datesList: ["10/08/2026"],
      matches: { A1: { config: { rules: { maxGamjeom: 5 } } } },
    };
    const result = buildEventRecords({
      eventId: "E2",
      eventName: "OneDay",
      user,
      settings,
      courts: buildCourtsMap(1).courts,
      courtCount: 1,
      pdfParseResult: pdf,
      now: 1,
    });
    expect(result.mode).toBe("single-pdf");
    expect(result.records[0].data.matches).toBe(pdf.matches);
  });
});
