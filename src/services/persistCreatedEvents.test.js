import { describe, it, expect } from "vitest";
import {
  toastMessageForCreateMode,
  defaultCreateEventFormValues,
} from "./persistCreatedEvents.js";

describe("toastMessageForCreateMode", () => {
  it("covers multi / single-pdf / bare (+ court count)", () => {
    expect(
      toastMessageForCreateMode("multi", {
        datesCount: 2,
        recordsLength: 2,
      })
    ).toMatch(/2 個比賽日期/);

    expect(
      toastMessageForCreateMode("single-pdf", { trimmedName: "Cup" })
    ).toMatch(/Cup/);

    expect(
      toastMessageForCreateMode("empty", {
        trimmedName: "Cup",
        trimmedId: "E1",
        courtCount: 4,
        includeCourtCountOnBare: true,
      })
    ).toMatch(/4 個場地/);

    expect(
      toastMessageForCreateMode("empty", { trimmedName: "Cup" })
    ).toBe("✅ 成功建立賽事：Cup");
  });
});

describe("defaultCreateEventFormValues", () => {
  it("resets to known defaults", () => {
    expect(defaultCreateEventFormValues()).toMatchObject({
      newEventId: "",
      newMaxPointGap: 15,
      newRoundDuration: 90,
      pdfParseResult: null,
    });
  });
});
