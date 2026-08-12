/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  requestFullscreen,
  toggleDoubleClickFullscreen,
} from "./requestFullscreen.js";

describe("requestFullscreen helpers", () => {
  beforeEach(() => {
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      writable: true,
      value: null,
    });
    document.documentElement.requestFullscreen = vi
      .fn()
      .mockResolvedValue(undefined);
    document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
  });

  it("requests fullscreen when not already", () => {
    requestFullscreen();
    expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
  });

  it("toggle only when target is currentTarget", () => {
    const currentTarget = document.createElement("div");
    const child = document.createElement("span");
    currentTarget.appendChild(child);

    toggleDoubleClickFullscreen({ target: child, currentTarget });
    expect(document.documentElement.requestFullscreen).not.toHaveBeenCalled();

    toggleDoubleClickFullscreen({ target: currentTarget, currentTarget });
    expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
  });
});
