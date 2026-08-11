import { describe, it, expect, vi } from "vitest";
import {
  canVibrate,
  armScoreHaptic,
  triggerScoreHaptic,
  SCORE_HAPTIC_MS,
} from "./scoreHaptic.js";

describe("scoreHaptic", () => {
  it("detects vibrate support", () => {
    expect(canVibrate({ vibrate: () => true })).toBe(true);
    expect(canVibrate({})).toBe(false);
    expect(canVibrate(null)).toBe(false);
  });

  it("arms with vibrate(0)", () => {
    const vibrate = vi.fn(() => true);
    expect(armScoreHaptic({ vibrate })).toBe(true);
    expect(vibrate).toHaveBeenCalledWith(0);
  });

  it("triggers numeric pulse then pattern fallback", () => {
    const vibrate = vi
      .fn()
      .mockReturnValueOnce(true) // cancel
      .mockReturnValueOnce(false) // number form rejected
      .mockReturnValueOnce(true); // pattern ok
    expect(triggerScoreHaptic({ vibrate })).toBe(true);
    expect(vibrate).toHaveBeenNthCalledWith(1, 0);
    expect(vibrate).toHaveBeenNthCalledWith(2, SCORE_HAPTIC_MS);
    expect(vibrate).toHaveBeenNthCalledWith(3, [SCORE_HAPTIC_MS]);
  });
});
