import { describe, it, expect } from "vitest";
import {
  normalizeEventDateDisplay,
  parseEventHeading,
} from "./parseEventHeading.js";

describe("normalizeEventDateDisplay", () => {
  it("converts DD/MM/YYYY to YYYY/MM/DD", () => {
    expect(normalizeEventDateDisplay("1/2/2026")).toBe("2026/02/01");
  });
});

describe("parseEventHeading", () => {
  it("parses Day N + date", () => {
    expect(parseEventHeading("Open Cup (Day 1) (12/08/2026)")).toEqual({
      mainEventName: "Open Cup",
      eventDateStr: "Day 1 - 2026/08/12",
    });
  });

  it("parses single parenthetical", () => {
    expect(parseEventHeading("Open Cup (Sat)")).toEqual({
      mainEventName: "Open Cup",
      eventDateStr: "Sat",
    });
  });

  it("returns raw when no parens", () => {
    expect(parseEventHeading("Open Cup")).toEqual({
      mainEventName: "Open Cup",
      eventDateStr: "",
    });
  });
});
