import { describe, expect, it } from "vitest";
import { formatTime } from "./formatTime.js";

describe("formatTime", () => {
  it("formats valid seconds as M:SS", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(90)).toBe("1:30");
  });

  it("returns 0:00 for invalid input", () => {
    expect(formatTime(undefined)).toBe("0:00");
    expect(formatTime(NaN)).toBe("0:00");
    expect(formatTime("x")).toBe("0:00");
  });
});
