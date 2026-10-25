import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateDefaultEventId,
  runPdfFileSelect,
  detectDrawsheetKind,
} from "./pdfImportFlow.js";

vi.mock("../Utils/pdfParser", () => ({
  parseHktkdaPdfFile: vi.fn(),
}));

vi.mock("./tabularImport.js", () => ({
  parseMatchesCsv: vi.fn(),
  parseMatchesJson: vi.fn(),
}));

import { parseHktkdaPdfFile } from "../Utils/pdfParser";
import { parseMatchesCsv, parseMatchesJson } from "./tabularImport.js";

describe("generateDefaultEventId", () => {
  it("prefixes TKD + last 6 digits of now", () => {
    expect(generateDefaultEventId(1234567890123)).toBe("TKD890123");
  });
});

describe("detectDrawsheetKind", () => {
  it("detects pdf/csv/json by extension or mime", () => {
    expect(detectDrawsheetKind({ name: "a.PDF", type: "" })).toBe("pdf");
    expect(detectDrawsheetKind({ name: "a.csv", type: "text/csv" })).toBe(
      "csv"
    );
    expect(
      detectDrawsheetKind({ name: "a.json", type: "application/json" })
    ).toBe("json");
    expect(detectDrawsheetKind({ name: "a.txt", type: "text/plain" })).toBe(
      null
    );
  });
});

describe("runPdfFileSelect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unsupported types early", async () => {
    const showToast = vi.fn();
    const result = await runPdfFileSelect(
      { type: "text/plain", name: "x.txt" },
      { showToast }
    );
    expect(result).toBeNull();
    expect(showToast).toHaveBeenCalled();
    expect(parseHktkdaPdfFile).not.toHaveBeenCalled();
  });

  it("parses CSV via parseMatchesCsv", async () => {
    const fake = {
      eventName: "CSV Event",
      matchCount: 1,
      matches: {},
      datesList: ["Day 1"],
      dateGroups: {},
      categories: [],
      courtId: "court1",
    };
    parseMatchesCsv.mockReturnValue(fake);
    const setPdfParseResult = vi.fn();
    const setNewEventName = vi.fn();
    const file = {
      name: "draw.csv",
      type: "text/csv",
      text: async () => "matchId\nA1\n",
    };
    const result = await runPdfFileSelect(file, {
      setPdfParseResult,
      setNewEventName,
      newEventId: "KEEP",
    });
    expect(result).toEqual(fake);
    expect(parseMatchesCsv).toHaveBeenCalled();
    expect(setNewEventName).toHaveBeenCalledWith("CSV Event");
    expect(setPdfParseResult).toHaveBeenCalledWith(fake);
  });

  it("parses JSON via parseMatchesJson", async () => {
    const fake = {
      eventName: "JSON Event",
      matchCount: 2,
      matches: {},
      datesList: [],
      dateGroups: {},
      categories: [],
      courtId: "court1",
    };
    parseMatchesJson.mockReturnValue(fake);
    const file = {
      name: "draw.json",
      type: "application/json",
      text: async () => "[]",
    };
    const result = await runPdfFileSelect(file, {});
    expect(result).toEqual(fake);
    expect(parseMatchesJson).toHaveBeenCalled();
  });
});
