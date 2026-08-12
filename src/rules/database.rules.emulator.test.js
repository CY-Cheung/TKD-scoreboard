/**
 * Wave 11 — Realtime Database rules unit tests (emulator).
 * Run via: `npm run test:rules` (starts database emulator).
 *
 * @vitest-environment node
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { get, ref, set, update } from "firebase/database";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES = readFileSync(
  join(__dirname, "../../database.rules.json"),
  "utf8"
);

const PROJECT_ID = "demo-tkd-scoreboard";

/** @type {import("@firebase/rules-unit-testing").RulesTestEnvironment} */
let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    database: {
      host: "127.0.0.1",
      port: 9000,
      rules: RULES,
    },
  });
}, 60_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

describe("database.rules.json (emulator)", () => {
  it("allows public read of events", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), "events/evt1"), {
        createdBy: "owner1",
        EventName: "Cup",
      });
    });

    const unauth = testEnv.unauthenticatedContext();
    await assertSucceeds(get(ref(unauth.database(), "events/evt1")));
  });

  it("rejects nested courts under events", async () => {
    const alice = testEnv.authenticatedContext("alice");
    await assertFails(
      set(ref(alice.database(), "events/evtNest"), {
        createdBy: "alice",
        courts: { Court1: { name: "Court1" } },
      })
    );
  });

  it("allows owner to create slim event", async () => {
    const alice = testEnv.authenticatedContext("alice");
    await assertSucceeds(
      set(ref(alice.database(), "events/evtSlim"), {
        createdBy: "alice",
        EventName: "Slim",
      })
    );
  });

  it("allows owner to write flat courts", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), "events/evtCourt"), {
        createdBy: "alice",
        EventName: "CourtEvt",
      });
    });

    const alice = testEnv.authenticatedContext("alice");
    await assertSucceeds(
      set(ref(alice.database(), "courts/evtCourt/Court1"), {
        name: "Court1",
      })
    );
  });

  it("rejects unauthenticated flat courts write when event exists", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), "events/evtDenied"), {
        createdBy: "alice",
        EventName: "Denied",
      });
    });

    const unauth = testEnv.unauthenticatedContext();
    await assertFails(
      set(ref(unauth.database(), "courts/evtDenied/Court1"), {
        name: "Court1",
      })
    );
  });

  it("allows referee seat claim with deviceId when empty", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), "events/evtSeat"), {
        createdBy: "alice",
        EventName: "Seat",
      });
      await set(ref(ctx.database(), "courts/evtSeat/Court1/name"), "Court1");
    });

    const unauth = testEnv.unauthenticatedContext();
    await assertSucceeds(
      set(ref(unauth.database(), "courts/evtSeat/Court1/referees/J1"), {
        deviceId: "phone-1",
        deviceName: "iPhone",
        lastSeen: Date.now(),
      })
    );
  });

  it("allows owner matchLive write", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), "events/evtLive"), {
        createdBy: "alice",
        EventName: "Live",
      });
    });

    const alice = testEnv.authenticatedContext("alice");
    await assertSucceeds(
      update(ref(alice.database(), "matchLive/evtLive/M1"), {
        state: { isPaused: true },
      })
    );
  });
});
