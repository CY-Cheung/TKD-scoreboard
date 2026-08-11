import { describe, it, expect } from "vitest";
import {
  eventPayloadWithoutCourts,
  eventMetaPayloadForWrite,
  normalizeRefereeMap,
  mergeRefereeMaps,
} from "./courtFirebase.js";

describe("eventPayloadWithoutCourts", () => {
  it("strips nested courts and keeps other event fields", () => {
    expect(
      eventPayloadWithoutCourts({
        EventName: "Day1",
        createdBy: "uid1",
        settings: { maxGamjeom: 5 },
        courts: { court1: { name: "A" } },
        matches: { m1: { config: {} } },
      })
    ).toEqual({
      EventName: "Day1",
      createdBy: "uid1",
      settings: { maxGamjeom: 5 },
      matches: { m1: { config: {} } },
    });
  });

  it("returns non-objects unchanged", () => {
    expect(eventPayloadWithoutCourts(null)).toBeNull();
    expect(eventPayloadWithoutCourts(undefined)).toBeUndefined();
  });

  it("returns a shallow copy when courts is absent", () => {
    const input = { EventName: "X", createdBy: "u" };
    const out = eventPayloadWithoutCourts(input);
    expect(out).toEqual(input);
    expect(out).not.toBe(input);
  });
});

describe("eventMetaPayloadForWrite", () => {
  it("strips courts and matches; keeps meta/settings only", () => {
    const out = eventMetaPayloadForWrite({
      EventName: "Day1",
      createdBy: "uid1",
      settings: { maxGamjeom: 5 },
      courts: { court1: {} },
      matches: {
        A1: {
          config: { matchId: "A1" },
          state: { isPaused: true },
          stats: { red: {} },
        },
      },
    });
    expect(out).toEqual({
      EventName: "Day1",
      createdBy: "uid1",
      settings: { maxGamjeom: 5 },
    });
  });
});

describe("normalizeRefereeMap", () => {
  it("keeps only J1–J3 seats", () => {
    expect(
      normalizeRefereeMap({
        J1: { deviceId: "a" },
        J2: { deviceId: "b" },
        extra: { deviceId: "x" },
      })
    ).toEqual({
      J1: { deviceId: "a" },
      J2: { deviceId: "b" },
    });
  });

  it("mergeRefereeMaps ignores legacy second arg", () => {
    expect(
      mergeRefereeMaps({ J1: { deviceId: "flat" } }, { J1: { deviceId: "legacy" } })
    ).toEqual({ J1: { deviceId: "flat" } });
  });
});
