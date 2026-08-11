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

export async function dualUpdateMatchState(database, eventId, matchId, patch) {
  await update(ref(database, legacyMatchPath(eventId, matchId, "state")), patch);
  // Prefer full mirror so matchLive/{event}/{match} always appears as a node
  // (child-only update is easy to miss in Console and fails when parent is absent).
  try {
    const snap = await get(ref(database, legacyMatchPath(eventId, matchId)));
    if (snap.exists()) {
      await mirrorMatchLive(database, eventId, matchId, snap.val());
    }
  } catch (err) {
    logMatchLiveMirrorFailure("mirror after state update", err);
  }
}

export async function dualUpdateMatchStatsSide(
  database,
  eventId,
  matchId,
  side,
  patch
) {
  await update(
    ref(database, legacyMatchPath(eventId, matchId, "stats", side)),
    patch
  );
  try {
    const snap = await get(ref(database, legacyMatchPath(eventId, matchId)));
    if (snap.exists()) {
      await mirrorMatchLive(database, eventId, matchId, snap.val());
    }
  } catch (err) {
    logMatchLiveMirrorFailure("mirror after stats update", err);
  }
}

/** Dual-write a competitor patch under legacy + flat config (e.g. promoteWinner). */
export async function dualUpdateMatchConfigCompetitors(
  database,
  eventId,
  matchId,
  slot,
  patch
) {
  await update(
    ref(database, legacyMatchPath(eventId, matchId, "config", "competitors", slot)),
    patch
  );
  try {
    await update(
      ref(database, flatMatchConfigPath(eventId, matchId, "competitors", slot)),
      patch
    );
  } catch (err) {
    console.warn("flat match config competitor mirror failed:", err?.message || err);
  }
  try {
    const snap = await get(ref(database, legacyMatchPath(eventId, matchId)));
    if (snap.exists()) {
      await mirrorMatchIndex(database, eventId, matchId, snap.val());
    }
  } catch (err) {
    console.warn("matchIndex mirror after promote failed:", err?.message || err);
  }
}

/**
 * Subscribe to match view: always keep legacy full match as base,
 * overlay non-null fields from matchLive when present.
 * Also listen to flat config so Stage 4 dual-write stays visible if legacy lags.
 */
export function subscribeMatchView(database, eventId, matchId, onData) {
  let config = null;
  let flatConfig = null;
  let live = null;
  let legacy = null;
  let lastEmitJson = undefined;

  const emit = () => {
    if (!legacy && !config && !flatConfig && !live) {
      if (lastEmitJson !== "null") {
        lastEmitJson = "null";
        onData(null);
      }
      return;
    }

    const merged = {
      ...(legacy || {}),
      config: flatConfig ?? config ?? legacy?.config ?? null,
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

  const unsubLegacy = onValue(
    ref(database, legacyMatchPath(eventId, matchId)),
    (snap) => {
      legacy = snap.exists() ? snap.val() : null;
      emit();
    }
  );

  const unsubConfig = onValue(
    ref(database, legacyMatchConfigPath(eventId, matchId)),
    (snap) => {
      config = snap.exists() ? snap.val() : null;
      emit();
    }
  );

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
    unsubLegacy();
    unsubConfig();
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
