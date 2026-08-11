import { describe, it, expect } from "vitest";
import {
  resolveEventDisplayName,
  buildEventIndexEntry,
  listFromEventIndex,
  listFromEventsTree,
  buildEventIndexBackfill,
} from "./eventIndex.js";

describe("resolveEventDisplayName", () => {
  it("prefers EventName", () => {
    expect(resolveEventDisplayName({ EventName: "A", eventName: "B" }, "id")).toBe(
      "A"
    );
  });

  it("falls back to id", () => {
    expect(resolveEventDisplayName({}, "evt1")).toBe("evt1");
  });
});

describe("buildEventIndexEntry", () => {
  it("keeps creator fields and display name", () => {
    expect(
      buildEventIndexEntry(
        {
          EventName: "Open",
          createdBy: "uid1",
          createdByEmail: "a@b.c",
          matches: { m1: {} },
        },
        "e1"
      )
    ).toEqual({
      EventName: "Open",
      createdBy: "uid1",
      createdByEmail: "a@b.c",
    });
  });
});

describe("listFromEventIndex / listFromEventsTree", () => {
  it("lists index rows", () => {
    expect(
      listFromEventIndex({
        e1: { EventName: "One", createdBy: "u", createdByEmail: "e" },
      })
    ).toEqual([
      {
        id: "e1",
        displayName: "One",
        createdBy: "u",
        createdByEmail: "e",
      },
    ]);
  });

  it("lists from heavy events tree without needing matches", () => {
    const list = listFromEventsTree({
      e1: {
        EventName: "Heavy",
        createdBy: "u",
        matches: { m: { stats: { x: 1 } } },
      },
    });
    expect(list[0].displayName).toBe("Heavy");
  });
});

describe("buildEventIndexBackfill", () => {
  it("strips nested matches from index payload", () => {
    const backfill = buildEventIndexBackfill({
      e1: {
        EventName: "X",
        createdBy: "u",
        createdByEmail: "e",
        matches: { m1: {} },
      },
    });
    expect(backfill.e1).toEqual({
      EventName: "X",
      createdBy: "u",
      createdByEmail: "e",
    });
    expect(backfill.e1.matches).toBeUndefined();
  });
});
