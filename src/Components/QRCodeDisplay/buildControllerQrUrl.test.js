import { describe, it, expect } from "vitest";
import {
  buildControllerQrUrl,
  isPhoneUnreachableHost,
  PUBLIC_PAGES_HOST,
} from "./controllerQrUrl.js";

describe("isPhoneUnreachableHost", () => {
  it("flags localhost and cloud previews", () => {
    expect(isPhoneUnreachableHost("localhost")).toBe(true);
    expect(isPhoneUnreachableHost("127.0.0.1")).toBe(true);
    expect(isPhoneUnreachableHost("foo.agent.cvm.dev")).toBe(true);
    expect(isPhoneUnreachableHost("bar.cursorvm.com")).toBe(true);
    expect(isPhoneUnreachableHost("cy-cheung.github.io")).toBe(false);
  });
});

describe("buildControllerQrUrl", () => {
  it("defaults cloud preview QR to GitHub Pages", () => {
    const url = buildControllerQrUrl({
      eventId: "E1",
      courtId: "court1",
      hostname: "abc.agent.cvm.dev",
      hostWithPort: "abc.agent.cvm.dev",
      protocol: "https:",
      pathname: "/TKD-scoreboard/screen",
      customHost: "",
    });
    expect(url).toBe(
      `https://${PUBLIC_PAGES_HOST}/TKD-scoreboard/controller?event=E1&court=court1`
    );
  });

  it("uses LAN custom host over http", () => {
    const url = buildControllerQrUrl({
      eventId: "E1",
      courtId: "court2",
      hostname: "localhost",
      hostWithPort: "localhost:5173",
      protocol: "http:",
      pathname: "/TKD-scoreboard/screen",
      customHost: "192.168.1.10:5173",
    });
    expect(url).toBe(
      "http://192.168.1.10:5173/TKD-scoreboard/controller?event=E1&court=court2"
    );
  });

  it("keeps current host on public pages", () => {
    const url = buildControllerQrUrl({
      eventId: "E1",
      courtId: "court1",
      hostname: "cy-cheung.github.io",
      hostWithPort: "cy-cheung.github.io",
      protocol: "https:",
      pathname: "/TKD-scoreboard/screen",
      customHost: "",
    });
    expect(url).toContain(
      "https://cy-cheung.github.io/TKD-scoreboard/controller?"
    );
  });
});
