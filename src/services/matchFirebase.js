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
  extractMatchConfig,
  extractMatchIndexPayload,
  extractMatchLivePayload,
  flatMatchConfigPath,
  flatMatchesRoot,
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
 * Write flat match artifacts: matches/…/config + matchIndex + matchLive.
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

/** Remove top-level match trees for one match. */
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

/** Remove top-level match trees for a whole event (event delete). */
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

/** Flat matches/…/config only (rules inject for scoring TX). */
export async function fetchMatchConfigForRules(database, eventId, matchId) {
  const flatSnap = await get(ref(database, flatMatchConfigPath(eventId, matchId)));
  return flatSnap.exists() ? flatSnap.val() : null;
}

/**
 * Pure helper for matchLive TX view:
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

/** Ensure matchLive node exists (empty shell if missing). */
export async function ensureMatchLiveExists(database, eventId, matchId) {
  const liveRef = ref(database, matchLivePath(eventId, matchId));
  const snap = await get(liveRef);
  if (snap.exists()) return;
  await set(liveRef, extractMatchLivePayload({}));
}

/**
 * Transaction on matchLive (primary).
 * Injects flat config for scoring rules.
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
  const bootstrap = liveSnap.exists() ? null : extractMatchLivePayload({});

  return runTransaction(liveRef, (current) =>
    buildMatchLiveTransactionCommit(current, bootstrap, config, transactionUpdate)
  );
}

export async function updateMatchLiveState(database, eventId, matchId, patch) {
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

export async function updateMatchLiveStatsSide(
  database,
  eventId,
  matchId,
  side,
  patch
) {
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

/** Patch competitors under flat matches/…/config + refresh matchIndex. */
export async function updateMatchConfigCompetitors(
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
 * Subscribe to match view from flat config + matchLive only.
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
      // Never emit null config — live often arrives before flat config;
      // null breaks Screen (`config.competitors` throw → blank board).
      config: flatConfig && typeof flatConfig === "object" ? flatConfig : {},
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
 * Load UI matches from flat matches + matchLive only.
 * Returns UI-shaped { [matchId]: { config, state, stats, … } }.
 */
export async function fetchMatchesForEvent(database, eventId) {
  const flatSnap = await get(ref(database, flatMatchesRoot(eventId)));
  if (!flatSnap.exists()) return {};
  const liveSnap = await get(ref(database, matchLiveRoot(eventId)));
  return assembleMatchesFromFlat(
    flatSnap.val(),
    liveSnap.exists() ? liveSnap.val() : {}
  );
}
