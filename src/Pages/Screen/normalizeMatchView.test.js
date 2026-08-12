import { describe, it, expect } from "vitest";
import { normalizeMatchView } from "./normalizeMatchView.js";

describe("normalizeMatchView", () => {
  it("turns null config/state/stats into objects", () => {
    const view = normalizeMatchView({
      config: null,
      state: { phase: "ROUND" },
      stats: null,
    });
    expect(view.config).toEqual({});
    expect(view.state.phase).toBe("ROUND");
    expect(view.stats).toEqual({});
    expect(() => view.config.competitors?.red).not.toThrow();
  });

  it("handles null matchData", () => {
    expect(normalizeMatchView(null).config).toEqual({});
  });
});
