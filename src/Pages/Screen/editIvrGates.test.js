import { describe, it, expect } from "vitest";
import {
  isIvrActionBlocked,
  isTechCardActionBlocked,
  isValidIvrQuotaTyping,
  resolveIvrQuotaCommitValue,
  isIvrButtonDisabled,
} from "./editIvrGates.js";

const clear = {
  matchData: {},
  showAvoidingPopup: false,
  isTechnicalCardFlowActive: false,
  isIvrFlowActive: false,
  techCardConfirmSide: null,
  ivrConfirmSide: null,
};

describe("editIvrGates", () => {
  it("blocks when match missing or flows active", () => {
    expect(isIvrActionBlocked({ ...clear, matchData: null })).toBe(true);
    expect(isIvrActionBlocked({ ...clear, ivrConfirmSide: "red" })).toBe(true);
    expect(isIvrActionBlocked(clear)).toBe(false);
    expect(isTechCardActionBlocked(clear)).toBe(false);
  });

  it("validates typing and commit", () => {
    expect(isValidIvrQuotaTyping("12")).toBe(true);
    expect(isValidIvrQuotaTyping("1a")).toBe(false);
    expect(resolveIvrQuotaCommitValue("", 3)).toBeNull();
    expect(resolveIvrQuotaCommitValue("2", 3)).toBe(2);
    expect(resolveIvrQuotaCommitValue("x", 3)).toBe(3);
  });

  it("disables button when remaining exhausted", () => {
    expect(isIvrButtonDisabled(false, 0)).toBe(true);
    expect(isIvrButtonDisabled(false, 2)).toBe(false);
    expect(isIvrButtonDisabled(false, -1)).toBe(false);
  });
});
