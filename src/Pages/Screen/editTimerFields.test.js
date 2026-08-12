import { describe, it, expect } from "vitest";
import {
  secondsToMinSec,
  minSecToSeconds,
  buildMatchLiveTimerPatch,
  shouldApplyTimeUpdate,
  buildEditTimerFieldState,
} from "./editTimerFields.js";

describe("editTimerFields", () => {
  it("converts seconds", () => {
    expect(secondsToMinSec(125)).toEqual({ minutes: 2, seconds: 5 });
    expect(minSecToSeconds(1, 30)).toBe(90);
  });

  it("builds pause patch", () => {
    expect(buildMatchLiveTimerPatch(0)).toMatchObject({
      timer: 0,
      isPaused: true,
      isFinished: true,
    });
  });

  it("only applies matching phase", () => {
    expect(shouldApplyTimeUpdate("match", "ROUND")).toBe(true);
    expect(shouldApplyTimeUpdate("match", "REST")).toBe(false);
    expect(shouldApplyTimeUpdate("rest", "REST")).toBe(true);
  });

  it("syncs ROUND vs REST field defaults", () => {
    const round = buildEditTimerFieldState({
      state: { timer: 70, phase: "ROUND" },
      config: { rules: { roundDuration: 90, restDuration: 60 } },
    });
    expect(round.matchMin).toBe(1);
    expect(round.matchSec).toBe(10);
    expect(round.restMin).toBe(1);
    expect(round.restSec).toBe(0);

    const rest = buildEditTimerFieldState({
      state: { timer: 45, phase: "REST" },
      config: { rules: { roundDuration: 90, restDuration: 60 } },
    });
    expect(rest.restMin).toBe(0);
    expect(rest.restSec).toBe(45);
    expect(rest.matchMin).toBe(1);
    expect(rest.matchSec).toBe(30);
  });
});
