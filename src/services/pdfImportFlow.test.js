import { describe, it, expect, vi } from "vitest";
import { generateDefaultEventId, runPdfFileSelect } from "./pdfImportFlow.js";

describe("generateDefaultEventId", () => {
  it("prefixes TKD + last 6 digits of now", () => {
    expect(generateDefaultEventId(1234567890123)).toBe("TKD890123");
  });
});

describe("runPdfFileSelect", () => {
  it("rejects non-pdf early", async () => {
    const showToast = vi.fn();
    const result = await runPdfFileSelect(
      { type: "text/plain", name: "x.txt" },
      { showToast }
    );
    expect(result).toBeNull();
    expect(showToast).toHaveBeenCalled();
  });
});
