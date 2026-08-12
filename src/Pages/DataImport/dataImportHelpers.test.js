import { describe, it, expect } from "vitest";
import {
  pickDefaultEventId,
  resolveEventDisplayName,
} from "./dataImportHelpers.js";

describe("pickDefaultEventId", () => {
  const list = [{ id: "a" }, { id: "b" }];

  it("returns empty for empty list", () => {
    expect(pickDefaultEventId([], "a", "")).toBe("");
  });

  it("keeps current when set", () => {
    expect(pickDefaultEventId(list, "b", "a")).toBe("a");
  });

  it("prefers session when current empty", () => {
    expect(pickDefaultEventId(list, "b", "")).toBe("b");
  });

  it("falls back to first", () => {
    expect(pickDefaultEventId(list, "missing", "")).toBe("a");
  });
});

describe("resolveEventDisplayName", () => {
  it("uses displayName when present", () => {
    expect(
      resolveEventDisplayName([{ id: "e1", displayName: "Cup" }], "e1")
    ).toBe("Cup");
  });

  it("falls back to id", () => {
    expect(resolveEventDisplayName([{ id: "e1" }], "e1")).toBe("e1");
  });
});
