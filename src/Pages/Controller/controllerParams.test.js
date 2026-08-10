/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { getDeviceName, resolveControllerParam } from "./controllerParams.js";

describe("getDeviceName", () => {
  it("detects common devices from UA", () => {
    expect(getDeviceName("Mozilla/5.0 (iPhone; CPU iPhone OS)")).toBe("iPhone");
    expect(getDeviceName("Mozilla/5.0 (iPad; CPU OS)")).toBe("iPad");
    expect(getDeviceName("Mozilla/5.0 (Linux; Android 13)")).toBe("Android");
    expect(getDeviceName("Mozilla/5.0 (Macintosh; Intel Mac OS X)")).toBe("Mac");
    expect(getDeviceName("Mozilla/5.0 (Windows NT 10.0)")).toBe("Windows");
    expect(getDeviceName("UnknownBot/1.0")).toBe("Device");
  });
});

describe("resolveControllerParam", () => {
  it("prefers React Router searchParams", () => {
    const searchParams = new URLSearchParams("event=E1&court=court2");
    expect(resolveControllerParam("event", { searchParams })).toBe("E1");
    expect(resolveControllerParam("court", { searchParams })).toBe("court2");
  });

  it("falls back to sessionStorage for event/court", () => {
    const storage = {
      getItem: vi.fn((k) => (k === "selectedEvent" ? "fromSS" : "")),
    };
    const searchParams = new URLSearchParams();
    expect(
      resolveControllerParam("event", { searchParams, sessionStorage: storage })
    ).toBe("fromSS");
  });
});
