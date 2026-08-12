import { describe, it, expect, vi } from "vitest";
import {
  resolveSelectedEventId,
  resolveCourtIdFromOptions,
  canUserDeleteEvent,
  validateCourtSetupLogin,
  applyCreateEventFormReset,
} from "./courtSetupHelpers.js";

describe("resolveSelectedEventId", () => {
  const list = [{ id: "a" }, { id: "b" }];

  it("returns empty for empty list", () => {
    expect(resolveSelectedEventId([], "a", "b")).toBe("");
  });

  it("keeps selected when valid", () => {
    expect(resolveSelectedEventId(list, "b", "a")).toBe("b");
  });

  it("uses lastEvent when selected invalid", () => {
    expect(resolveSelectedEventId(list, "x", "a")).toBe("a");
  });

  it("falls back to first", () => {
    expect(resolveSelectedEventId(list, "x", "y")).toBe("a");
  });
});

describe("resolveCourtIdFromOptions", () => {
  it("restores last court when present", () => {
    expect(resolveCourtIdFromOptions(["C1", "C2"], "C2")).toBe("C2");
  });

  it("clears when last missing", () => {
    expect(resolveCourtIdFromOptions(["C1"], "C9")).toBe("");
  });
});

describe("canUserDeleteEvent", () => {
  it("allows when no createdByEmail", () => {
    expect(canUserDeleteEvent({}, "a@b.com")).toBe(true);
  });

  it("requires matching email", () => {
    expect(
      canUserDeleteEvent({ createdByEmail: "a@b.com" }, "a@b.com")
    ).toBe(true);
    expect(
      canUserDeleteEvent({ createdByEmail: "a@b.com" }, "x@y.com")
    ).toBe(false);
  });
});

describe("validateCourtSetupLogin", () => {
  it("validates required fields", () => {
    expect(
      validateCourtSetupLogin({ selectedEvent: "", courtId: "C1", password: "p" })
    ).toBe("Please select an event.");
    expect(
      validateCourtSetupLogin({
        selectedEvent: "e",
        courtId: "",
        password: "p",
      })
    ).toBe("Please select a court.");
    expect(
      validateCourtSetupLogin({
        selectedEvent: "e",
        courtId: "C1",
        password: "  ",
      })
    ).toBe("Please enter setup password.");
    expect(
      validateCourtSetupLogin({
        selectedEvent: "e",
        courtId: "C1",
        password: "ok",
      })
    ).toBeNull();
  });
});

describe("applyCreateEventFormReset", () => {
  it("calls setters", () => {
    const setters = {
      setNewEventId: vi.fn(),
      setNewEventName: vi.fn(),
      setNewSetupPassword: vi.fn(),
      setNewMaxPointGap: vi.fn(),
      setNewMaxGamjeom: vi.fn(),
      setNewRoundDuration: vi.fn(),
      setNewRestDuration: vi.fn(),
      setNewIvrQuota: vi.fn(),
      setPdfParseResult: vi.fn(),
    };
    applyCreateEventFormReset(
      {
        newEventId: "",
        newEventName: "",
        newSetupPassword: "",
        newMaxPointGap: 15,
        newMaxGamjeom: 5,
        newRoundDuration: 90,
        newRestDuration: 60,
        newIvrQuota: "",
        pdfParseResult: null,
      },
      setters
    );
    expect(setters.setNewMaxPointGap).toHaveBeenCalledWith(15);
    expect(setters.setPdfParseResult).toHaveBeenCalledWith(null);
  });
});
