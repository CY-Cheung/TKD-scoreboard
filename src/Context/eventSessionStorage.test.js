/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from "vitest";
import {
  clearStoredEventSession,
  hasStoredEventSession,
  readStoredEventSession,
  writeStoredEventSession,
} from "./eventSessionStorage.js";

describe("eventSessionStorage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("returns null when incomplete", () => {
    expect(readStoredEventSession()).toBe(null);
    expect(hasStoredEventSession()).toBe(false);
    sessionStorage.setItem("selectedEvent", "E1");
    expect(readStoredEventSession()).toBe(null);
  });

  it("writes and reads a full session", () => {
    const written = writeStoredEventSession({
      eventId: "E1",
      courtId: "court2",
      eventName: "Open",
    });
    expect(written).toEqual({
      eventId: "E1",
      courtId: "court2",
      eventName: "Open",
    });
    expect(readStoredEventSession()).toEqual(written);
    expect(hasStoredEventSession()).toBe(true);
  });

  it("clears stored keys", () => {
    writeStoredEventSession({ eventId: "E1", courtId: "court1" });
    clearStoredEventSession();
    expect(hasStoredEventSession()).toBe(false);
    expect(readStoredEventSession()).toBe(null);
  });

  it("ignores incomplete writes", () => {
    expect(writeStoredEventSession({ eventId: "E1" })).toBe(null);
    expect(hasStoredEventSession()).toBe(false);
  });
});
