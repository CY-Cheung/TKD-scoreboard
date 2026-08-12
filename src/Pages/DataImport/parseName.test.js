import { describe, it, expect } from "vitest";
import { parseName } from "./parseName.js";

describe("parseName", () => {
  it("returns empty strings for falsy input", () => {
    expect(parseName("")).toEqual({ name: "", club: "" });
    expect(parseName(null)).toEqual({ name: "", club: "" });
  });

  it("splits Name (Club)", () => {
    expect(parseName("Chan Tai Man (HK Club)")).toEqual({
      name: "Chan Tai Man",
      club: "HK Club",
    });
  });

  it("keeps bare name without club", () => {
    expect(parseName("Solo Athlete")).toEqual({
      name: "Solo Athlete",
      club: "",
    });
  });
});
