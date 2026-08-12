import { describe, it, expect } from "vitest";
import {
  AUTO_DOWNGRADE_TOAST,
  buildDisconnectToastMessage,
  shouldProbeAutoDowngrade,
  shouldAutoDowngradeToSingle,
} from "./refereePresence.js";

describe("refereePresence", () => {
  it("builds disconnect toast", () => {
    expect(buildDisconnectToastMessage([])).toBeNull();
    expect(buildDisconnectToastMessage(["J1", "J3"])).toBe(
      "⚠️ Referee J1, J3 disconnected!"
    );
  });

  it("probes auto-downgrade when under 2 occupied", () => {
    expect(shouldProbeAutoDowngrade(0)).toBe(true);
    expect(shouldProbeAutoDowngrade(1)).toBe(true);
    expect(shouldProbeAutoDowngrade(2)).toBe(false);
  });

  it("downgrades only from multiple", () => {
    expect(shouldAutoDowngradeToSingle("multiple")).toBe(true);
    expect(shouldAutoDowngradeToSingle("single")).toBe(false);
    expect(AUTO_DOWNGRADE_TOAST).toMatch(/Auto-downgraded/);
  });
});
