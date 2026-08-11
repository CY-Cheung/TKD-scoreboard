import { describe, it, expect } from "vitest";
import {
  eventPayloadWithoutCourts,
  eventPayloadForLegacyWrite,
  mergeRefereeMaps,
} from "./courtFirebase.js";

describe("eventPayloadWithoutCourts (Stage 5b)", () => {
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

describe("eventPayloadForLegacyWrite (Stage 5+)", () => {
  it("strips courts and matches; keeps meta/settings only", () => {
    const out = eventPayloadForLegacyWrite(
      {
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
      },
      (m) => ({ config: m.config })
    );
    expect(out).toEqual({
      EventName: "Day1",
      createdBy: "uid1",
      settings: { maxGamjeom: 5 },
    });
  });
});

describe("mergeRefereeMaps cutover preference", () => {
  it("fills missing flat seats from legacy when both maps provided", () => {
    expect(
      mergeRefereeMaps({ J1: { deviceId: "a" } }, { J2: { deviceId: "b" } })
    ).toEqual({
      J1: { deviceId: "a" },
      J2: { deviceId: "b" },
    });
  });

  it("ignores legacy when caller passes null (flat-primary emit)", () => {
    expect(
      mergeRefereeMaps({ J1: { deviceId: "flat" } }, null)
    ).toEqual({ J1: { deviceId: "flat" } });
  });
});
