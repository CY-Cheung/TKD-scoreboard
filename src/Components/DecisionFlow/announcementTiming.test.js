import { describe, expect, it } from "vitest";
import {
  ANNOUNCEMENT_DURATION_MS,
  ANNOUNCEMENT_EXIT_MS,
  computeAnnouncementTimers,
} from "./announcementTiming.js";

describe("computeAnnouncementTimers", () => {
  it("returns full window at start", () => {
    const startedAt = 1000;
    const result = computeAnnouncementTimers(startedAt, startedAt);
    expect(result.remaining).toBe(ANNOUNCEMENT_DURATION_MS);
    expect(result.exitDelay).toBe(ANNOUNCEMENT_DURATION_MS - ANNOUNCEMENT_EXIT_MS);
    expect(result.shouldCompleteImmediately).toBe(false);
  });

  it("marks immediate complete when elapsed past duration", () => {
    const startedAt = 0;
    const result = computeAnnouncementTimers(
      startedAt,
      ANNOUNCEMENT_DURATION_MS + 50
    );
    expect(result.remaining).toBe(0);
    expect(result.shouldCompleteImmediately).toBe(true);
  });
});
