/**
 * Wave 11 — static shape checks for database.rules.json (no emulator).
 * Firebase rules files allow newlines inside strings; use text probes.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_TEXT = readFileSync(
  join(__dirname, "../../database.rules.json"),
  "utf8"
);

describe("database.rules.json structure", () => {
  it("declares flat top-level trees", () => {
    for (const key of [
      "eventIndex",
      "events",
      "courts",
      "matchLive",
      "matchIndex",
      "matches",
    ]) {
      expect(RULES_TEXT).toContain(`"${key}"`);
    }
  });

  it("forbids nested courts/matches on events", () => {
    expect(RULES_TEXT).toMatch(
      /!newData\.hasChild\('courts'\)\s*&&\s*!newData\.hasChild\('matches'\)/
    );
  });

  it("requires deviceId on referee seat writes", () => {
    expect(RULES_TEXT).toContain("newData.hasChild('deviceId')");
  });

  it("authorizes matchLive via flat courts referees", () => {
    expect(RULES_TEXT).toContain(
      "root.child('courts').child($eventId).child(newData.child('providedCourtId').val())"
    );
  });
});
