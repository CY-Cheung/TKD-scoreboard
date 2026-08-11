import {
  get,
  set,
  update,
  remove,
  ref,
  onValue,
  runTransaction,
} from "firebase/database";
import {
  assembleMatchesFromFlat,
  buildLegacyMatchLiveStripPatch,
  extractMatchConfig,
  extractMatchIndexPayload,
  extractMatchLivePayload,
  flatMatchConfigPath,
  flatMatchesRoot,
  LEGACY_MATCH_LIVE_STRIP_KEYS,
  legacyMatchConfigPath,
  legacyMatchPath,
  legacyMatchesRoot,
  matchIndexPath,
  matchIndexRoot,
  matchLivePath,
  matchLiveRoot,
} from "./matchPaths.js";

export async function mirrorMatchLive(database, eventId, matchId, matchData) {
  const payload = extractMatchLivePayload(matchData);
  await set(ref(database, matchLivePath(eventId, matchId)), payload);
}

export async function mirrorMatchConfig(database, eventId, matchId, matchData) {
  const config = extractMatchConfig(matchData);
  if (!config) return;
  await set(ref(database, flatMatchConfigPath(eventId, matchId)), config);
}

export async function mirrorMatchIndex(database, eventId, matchId, matchData) {
  const payload = extractMatchIndexPayload(matchData);
  await set(ref(database, matchIndexPath(eventId, matchId)), payload);
}

/**
 * Stage 4: after writing a full legacy match, mirror config + index + live.
 * Soft-fails individually so one path cannot block the others.
 */
export async function mirrorMatchFlatArtifacts(
  database,
  eventId,
  matchId,
  matchData
) {
  const tasks = [
    ["matchLive", () => mirrorMatchLive(database, eventId, matchId, matchData)],
    ["matches/config", () => mirrorMatchConfig(database, eventId, matchId, matchData)],
    ["matchIndex", () => mirrorMatchIndex(database, eventId, matchId, matchData)],
  ];
  for (const [label, fn] of tasks) {
    try {
      await fn();
    } catch (err) {
      console.error(
        `[flatten] mirror ${label} failed:`,
        err?.code || err?.message || err
      );
    }
  }
}

function logMatchLiveMirrorFailure(context, err) {
  const code = err?.code || err?.message || err;
  console.error(
    `[matchLive] ${context} failed (${code}). ` +
      "If PERMISSION_DENIED: publish database.rules.json that includes matchLive, " +
      "and ensure Screen is signed in with Google."
  );
}

export async function removeMatchLive(database, eventId, matchId) {
  await remove(ref(database, matchLivePath(eventId, matchId)));
}

export async function removeMatchLiveForEvent(database, eventId) {
  await remove(ref(database, matchLiveRoot(eventId)));
}

export async function removeFlatMatchConfig(database, eventId, matchId) {
  await remove(ref(database, `matches/${eventId}/${matchId}`));
}

export async function removeFlatMatchesForEvent(database, eventId) {
  await remove(ref(database, flatMatchesRoot(eventId)));
}

export async function removeMatchIndexEntry(database, eventId, matchId) {
  await remove(ref(database, matchIndexPath(eventId, matchId)));
}

export async function removeMatchIndexForEvent(database, eventId) {
  await remove(ref(database, matchIndexRoot(eventId)));
}

/** Remove Stage 3–4 top-level match trees for one match. */
export async function removeMatchFlatArtifacts(database, eventId, matchId) {
  const tasks = [
    () => removeMatchLive(database, eventId, matchId),
    () => removeFlatMatchConfig(database, eventId, matchId),
    () => removeMatchIndexEntry(database, eventId, matchId),
  ];
  for (const fn of tasks) {
    try {
      await fn();
    } catch (err) {
      console.warn("match flat remove:", err?.message || err);
    }
  }
}

/** Remove Stage 3–4 top-level match trees for a whole event (orphan cleanup). */
export async function removeMatchFlatArtifactsForEvent(database, eventId) {
  const tasks = [
    () => removeMatchLiveForEvent(database, eventId),
    () => removeFlatMatchesForEvent(database, eventId),
    () => removeMatchIndexForEvent(database, eventId),
  ];
  for (const fn of tasks) {
    try {
      await fn();
    } catch (err) {
      console.warn("match flat remove for event:", err?.message || err);
    }
  }
}

/**
 * Run transaction on legacy full match (needs config), then mirror live tree.
 * @deprecated Stage 5c — prefer runMatchLiveTransaction
 */
export async function runLegacyMatchTransaction(
  database,
  eventId,
  matchId,
  transactionUpdate
) {
  const matchRef = ref(database, legacyMatchPath(eventId, matchId));
  const result = await runTransaction(matchRef, transactionUpdate);
  if (result.committed && result.snapshot.exists()) {
    try {
      await mirrorMatchLive(database, eventId, matchId, result.snapshot.val());
    } catch (err) {
      logMatchLiveMirrorFailure("mirror after tx", err);
    }
  }
  return result;
}

/** Prefer flat matches/…/config; fallback legacy events/…/matches/…/config. */
export async function fetchMatchConfigForRules(database, eventId, matchId) {
  const flatSnap = await get(ref(database, flatMatchConfigPath(eventId, matchId)));
  if (flatSnap.exists()) return flatSnap.val();
  const legacySnap = await get(
    ref(database, legacyMatchConfigPath(eventId, matchId))
  );
  return legacySnap.exists() ? legacySnap.val() : null;
}

export async function bootstrapMatchLivePayloadFromLegacy(
  database,
  eventId,
  matchId
) {
  const snap = await get(ref(database, legacyMatchPath(eventId, matchId)));
  if (!snap.exists()) return null;
  return extractMatchLivePayload(snap.val());
}

/** Reverse dual-write: copy live fields onto legacy match (keep config). */
export async function mirrorLiveFieldsToLegacy(
  database,
  eventId,
  matchId,
  liveData
) {
  const payload = extractMatchLivePayload(liveData);
  await update(ref(database, legacyMatchPath(eventId, matchId)), {
    state: payload.state,
    stats: payload.stats,
    votes: payload.votes,
    recentScores: payload.recentScores,
    providedCourtId: payload.providedCourtId,
    providedDeviceId: payload.providedDeviceId,
  });
}

/**
 * Pure helper for Stage 5c live TX view:
 * inject config for rules, commit only MATCH_LIVE_KEYS.
 * @returns {object|undefined} payload to write at matchLive path
 */
export function buildMatchLiveTransactionCommit(
  current,
  bootstrap,
  config,
  transactionUpdate,
  now = Date.now()
) {
  const base = current != null ? current : bootstrap != null ? bootstrap : null;
  if (base == null) return undefined;

  const working = {
    ...base,
    config: config ?? base.config ?? null,
  };
  const updated = transactionUpdate(working);
  if (updated === undefined) return undefined;
  return extractMatchLivePayload(updated, now);
}

/** Ensure matchLive node exists (bootstrap from legacy once, else empty shell). */
export async function ensureMatchLiveExists(database, eventId, matchId) {
  const liveRef = ref(database, matchLivePath(eventId, matchId));
  const snap = await get(liveRef);
  if (snap.exists()) return;
  const boot = await bootstrapMatchLivePayloadFromLegacy(
    database,
    eventId,
    matchId
  );
  await set(liveRef, boot || extractMatchLivePayload({}));
}

/**
 * Stage 5c/5: transaction on matchLive (primary).
 * Injects flat/legacy config for scoring rules.
 */
export async function runMatchLiveTransaction(
  database,
  eventId,
  matchId,
  transactionUpdate
) {
  const config = await fetchMatchConfigForRules(database, eventId, matchId);
  const liveRef = ref(database, matchLivePath(eventId, matchId));
  const liveSnap = await get(liveRef);
  let bootstrap = null;
  if (!liveSnap.exists()) {
    bootstrap =
      (await bootstrapMatchLivePayloadFromLegacy(database, eventId, matchId)) ||
      extractMatchLivePayload({});
  }

  return runTransaction(liveRef, (current) =>
    buildMatchLiveTransactionCommit(current, bootstrap, config, transactionUpdate)
  );
}

export async function dualUpdateMatchState(database, eventId, matchId, patch) {
  // Stage 5: matchLive-only state writes (no legacy reverse-mirror).
  try {
    await ensureMatchLiveExists(database, eventId, matchId);
    await update(ref(database, matchLivePath(eventId, matchId, "state")), patch);
    await update(ref(database, matchLivePath(eventId, matchId)), {
      updatedAt: Date.now(),
    });
  } catch (err) {
    logMatchLiveMirrorFailure("primary state update", err);
    throw err;
  }
}

export async function dualUpdateMatchStatsSide(
  database,
  eventId,
  matchId,
  side,
  patch
) {
  // Stage 5: matchLive-only stats writes (no legacy reverse-mirror).
  try {
    await ensureMatchLiveExists(database, eventId, matchId);
    await update(
      ref(database, matchLivePath(eventId, matchId, "stats", side)),
      patch
    );
    await update(ref(database, matchLivePath(eventId, matchId)), {
      updatedAt: Date.now(),
    });
  } catch (err) {
    logMatchLiveMirrorFailure("primary stats update", err);
    throw err;
  }
}

/** Flat-only competitor patch + refresh matchIndex (Stage 5+). */
export async function dualUpdateMatchConfigCompetitors(
  database,
  eventId,
  matchId,
  slot,
  patch
) {
  await update(
    ref(database, flatMatchConfigPath(eventId, matchId, "competitors", slot)),
    patch
  );
  try {
    const snap = await get(ref(database, flatMatchConfigPath(eventId, matchId)));
    if (snap.exists()) {
      await mirrorMatchIndex(database, eventId, matchId, {
        config: snap.val(),
      });
    }
  } catch (err) {
    console.warn("matchIndex mirror after promote failed:", err?.message || err);
  }
}

/**
 * Subscribe to match view from flat config + matchLive only (Stage 5+).
 */
export function subscribeMatchView(database, eventId, matchId, onData) {
  let flatConfig = null;
  let live = null;
  let lastEmitJson = undefined;

  const emit = () => {
    if (!flatConfig && !live) {
      if (lastEmitJson !== "null") {
        lastEmitJson = "null";
        onData(null);
      }
      return;
    }

    const merged = {
      config: flatConfig ?? null,
    };

    if (live) {
      if (live.state != null) merged.state = live.state;
      if (live.stats != null) merged.stats = live.stats;
      if (live.votes != null) merged.votes = live.votes;
      if (live.recentScores != null) merged.recentScores = live.recentScores;
      if (live.providedCourtId != null) {
        merged.providedCourtId = live.providedCourtId;
      }
      if (live.providedDeviceId != null) {
        merged.providedDeviceId = live.providedDeviceId;
      }
    }

    const nextJson = JSON.stringify(merged);
    if (nextJson === lastEmitJson) return;
    lastEmitJson = nextJson;
    onData(merged);
  };

  const unsubFlatConfig = onValue(
    ref(database, flatMatchConfigPath(eventId, matchId)),
    (snap) => {
      flatConfig = snap.exists() ? snap.val() : null;
      emit();
    }
  );

  const unsubLive = onValue(
    ref(database, matchLivePath(eventId, matchId)),
    (snap) => {
      live = snap.exists() ? snap.val() : null;
      emit();
    }
  );

  return () => {
    unsubFlatConfig();
    unsubLive();
  };
}

/**
 * Best-effort: copy live fields from an existing legacy match into matchLive.
 * @returns {Promise<true|false|null>} true ok, false permission/write failed, null if no legacy match
 */
export async function backfillMatchLiveFromLegacy(database, eventId, matchId) {
  const snap = await get(ref(database, legacyMatchPath(eventId, matchId)));
  if (!snap.exists()) return null;
  try {
    await mirrorMatchLive(database, eventId, matchId, snap.val());
    return true;
  } catch (err) {
    logMatchLiveMirrorFailure("backfill from legacy", err);
    return false;
  }
}

/**
 * Stage 4 batch: copy every legacy match under an event into
 * matches/…/config + matchIndex + matchLive.
 */
export async function backfillMatchFlatFromLegacyEvent(database, eventId) {
  const snap = await get(ref(database, legacyMatchesRoot(eventId)));
  if (!snap.exists()) return 0;
  const matches = snap.val() || {};
  let count = 0;
  for (const [matchId, matchData] of Object.entries(matches)) {
    await mirrorMatchFlatArtifacts(database, eventId, matchId, matchData);
    count += 1;
  }
  return count;
}

/**
 * Prefer flat matches+matchLive; fallback legacy and best-effort backfill.
 * Returns UI-shaped { [matchId]: { config, state, stats, … } }.
 */
export async function fetchMatchesForEvent(database, eventId) {
  const flatSnap = await get(ref(database, flatMatchesRoot(eventId)));
  if (flatSnap.exists()) {
    const liveSnap = await get(ref(database, matchLiveRoot(eventId)));
    return assembleMatchesFromFlat(
      flatSnap.val(),
      liveSnap.exists() ? liveSnap.val() : {}
    );
  }

  const legacySnap = await get(ref(database, legacyMatchesRoot(eventId)));
  if (!legacySnap.exists()) return {};

  const legacyVal = legacySnap.val() || {};
  try {
    await backfillMatchFlatFromLegacyEvent(database, eventId);
  } catch (err) {
    console.warn("match flat backfill skipped:", err?.message || err);
  }
  return legacyVal;
}

/**
 * Stage 5+: for each legacy match, ensure matchLive has a copy, then delete
 * state/stats/votes/recentScores/provided* from events/…/matches/{id}.
 * Keeps `config` on the legacy node.
 */
export async function stripLegacyMatchLiveFieldsForEvent(database, eventId) {
  const snap = await get(ref(database, legacyMatchesRoot(eventId)));
  if (!snap.exists()) {
    return { stripped: 0, ensuredLive: 0, skipped: 0, errors: [] };
  }

  const matches = snap.val() || {};
  const patch = buildLegacyMatchLiveStripPatch();
  let stripped = 0;
  let ensuredLive = 0;
  let skipped = 0;
  const errors = [];

  for (const [matchId, matchData] of Object.entries(matches)) {
    const hasLive = LEGACY_MATCH_LIVE_STRIP_KEYS.some(
      (key) => matchData?.[key] != null
    );
    if (!hasLive) {
      skipped += 1;
      continue;
    }
    try {
      const liveRef = ref(database, matchLivePath(eventId, matchId));
      const liveSnap = await get(liveRef);
      if (!liveSnap.exists()) {
        await mirrorMatchLive(database, eventId, matchId, matchData);
        ensuredLive += 1;
      }
      await update(ref(database, legacyMatchPath(eventId, matchId)), patch);
      stripped += 1;
    } catch (err) {
      errors.push({
        matchId,
        error: err?.code || err?.message || String(err),
      });
    }
  }

  return { stripped, ensuredLive, skipped, errors };
}

/**
 * Stage 5+: backfill flat artifacts from legacy if needed, then delete
 * the entire events/{eventId}/matches tree.
 */
export async function removeLegacyMatchesForEvent(database, eventId) {
  const snap = await get(ref(database, legacyMatchesRoot(eventId)));
  if (!snap.exists()) {
    return { stripped: false, matchCount: 0 };
  }
  const matchCount = Object.keys(snap.val() || {}).length;
  try {
    await backfillMatchFlatFromLegacyEvent(database, eventId);
  } catch (err) {
    console.warn(
      "[stage5+] flat backfill before legacy matches remove:",
      err?.message || err
    );
  }
  await remove(ref(database, legacyMatchesRoot(eventId)));
  return { stripped: true, matchCount };
}
