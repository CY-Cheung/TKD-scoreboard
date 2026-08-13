import { describe, it, expect } from "vitest";
import { getQrHostFlags } from "./qrHostFlags.js";

describe("getQrHostFlags", () => {
  it("flags localhost and unreachable defaults", () => {
    expect(getQrHostFlags("localhost", "")).toEqual({
      isLocalhost: true,
      usingUnreachableDefault: true,
      needsCustomHost: true,
    });
    expect(getQrHostFlags("127.0.0.1", "192.168.0.1")).toEqual({
      isLocalhost: true,
      usingUnreachableDefault: false,
      needsCustomHost: true,
    });
  });

  it("hides host block on public hosts without custom override", () => {
    expect(getQrHostFlags("cy-cheung.github.io", "")).toEqual({
      isLocalhost: false,
      usingUnreachableDefault: false,
      needsCustomHost: false,
    });
  });

  it("shows host block when custom host set on public host", () => {
    expect(getQrHostFlags("cy-cheung.github.io", "10.0.0.2:5173")).toEqual({
      isLocalhost: false,
      usingUnreachableDefault: false,
      needsCustomHost: true,
    });
  });
});
