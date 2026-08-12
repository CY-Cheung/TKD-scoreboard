import { describe, expect, it } from "vitest";
import {
  buildRoundExpiredStatePatch,
  buildTimerPausePatch,
  buildTimerResumePatch,
  computeRemainingSeconds,
  resolveMatchTimerFrame,
} from "./matchTimer.js";

describe("computeRemainingSeconds", () => {
  it("subtracts whole seconds elapsed", () => {
    expect(computeRemainingSeconds(90, 1_000_000, 1_000_000 + 5500)).toBe(85);
  });

  it("treats missing timer as 0", () => {
    expect(computeRemainingSeconds(undefined, 0, 3000)).toBe(-3);
  });
});

describe("resolveMatchTimerFrame", () => {
  const now = 10_000;

  it("returns zeros when state missing", () => {
    expect(resolveMatchTimerFrame(null, now)).toEqual({
      displayTime: 0,
      continueRaf: false,
      onExpire: null,
    });
  });

  it("stops at 0 when finished (non-REST)", () => {
    expect(
      resolveMatchTimerFrame(
        {
          isFinished: true,
          phase: "ROUND",
          isPaused: false,
          timer: 30,
          lastStartTime: now,
        },
        now
      )
    ).toEqual({ displayTime: 0, continueRaf: false, onExpire: null });
  });

  it("allows finished REST to keep ticking (only blocks non-REST finished)", () => {
    const frame = resolveMatchTimerFrame(
      {
        isFinished: true,
        phase: "REST",
        isPaused: false,
        timer: 10,
        lastStartTime: now - 2000,
      },
      now
    );
    expect(frame.displayTime).toBe(8);
    expect(frame.continueRaf).toBe(true);
  });

  it("when paused shows stored timer and stops rAF", () => {
    expect(
      resolveMatchTimerFrame(
        { isPaused: true, timer: 42, isFinished: false, phase: "ROUND" },
        now
      )
    ).toEqual({ displayTime: 42, continueRaf: false, onExpire: null });
  });

  it("when running schedules next frame with remaining time", () => {
    expect(
      resolveMatchTimerFrame(
        {
          isPaused: false,
          timer: 90,
          lastStartTime: now - 10_000,
          isFinished: false,
          phase: "ROUND",
        },
        now
      )
    ).toEqual({ displayTime: 80, continueRaf: true, onExpire: null });
  });

  it("ROUND expiry → finalize_round", () => {
    expect(
      resolveMatchTimerFrame(
        {
          isPaused: false,
          timer: 5,
          lastStartTime: now - 5000,
          isFinished: false,
          phase: "ROUND",
        },
        now
      )
    ).toEqual({
      displayTime: 0,
      continueRaf: false,
      onExpire: "finalize_round",
    });
  });

  it("REST expiry → start_next_round", () => {
    expect(
      resolveMatchTimerFrame(
        {
          isPaused: false,
          timer: 1,
          lastStartTime: now - 1000,
          isFinished: false,
          phase: "REST",
        },
        now
      )
    ).toEqual({
      displayTime: 0,
      continueRaf: false,
      onExpire: "start_next_round",
    });
  });

  it("treats missing phase as non-REST for expiry (finalize_round)", () => {
    expect(
      resolveMatchTimerFrame(
        {
          isPaused: false,
          timer: 0,
          lastStartTime: now,
          isFinished: false,
        },
        now
      ).onExpire
    ).toBe("finalize_round");
  });
});

describe("toggle patches", () => {
  it("buildTimerResumePatch sets lastStartTime", () => {
    expect(buildTimerResumePatch(12345)).toEqual({
      isPaused: false,
      lastStartTime: 12345,
    });
  });

  it("buildTimerPausePatch freezes remaining and clears lastStartTime", () => {
    expect(
      buildTimerPausePatch(
        { timer: 90, lastStartTime: 1000 },
        1000 + 12_500
      )
    ).toEqual({
      isPaused: true,
      timer: 78,
      lastStartTime: null,
    });
  });

  it("buildTimerPausePatch clamps at 0", () => {
    expect(
      buildTimerPausePatch({ timer: 3, lastStartTime: 1 }, 10_001)
    ).toEqual({
      isPaused: true,
      timer: 0,
      lastStartTime: null,
    });
  });

  it("preserves lastStartTime 0 as missing (|| now)", () => {
    // elapsed becomes 0 → timer unchanged
    expect(
      buildTimerPausePatch({ timer: 3, lastStartTime: 0 }, 10_000)
    ).toEqual({
      isPaused: true,
      timer: 3,
      lastStartTime: null,
    });
  });

  it("buildRoundExpiredStatePatch matches Screen update", () => {
    expect(buildRoundExpiredStatePatch()).toEqual({
      isFinished: true,
      isPaused: true,
      timer: 0,
      lastStartTime: null,
    });
  });
});
