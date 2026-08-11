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
  extractMatchLivePayload,
  legacyMatchConfigPath,
  legacyMatchPath,
  matchLivePath,
  matchLiveRoot,
} from "./matchPaths.js";

export async function mirrorMatchLive(database, eventId, matchId, matchData) {
  const payload = extractMatchLivePayload(matchData);
  await set(ref(database, matchLivePath(eventId, matchId)), payload);
}

export async function removeMatchLive(database, eventId, matchId) {
  await remove(ref(database, matchLivePath(eventId, matchId)));
}

export async function removeMatchLiveForEvent(database, eventId) {
  await remove(ref(database, matchLiveRoot(eventId)));
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
      console.warn("matchLive mirror after tx failed:", err?.message || err);
    }
  }
  return result;
}

export async function dualUpdateMatchState(database, eventId, matchId, patch) {
  const results = await Promise.allSettled([
    update(ref(database, legacyMatchPath(eventId, matchId, "state")), patch),
    update(ref(database, matchLivePath(eventId, matchId, "state")), patch),
  ]);
  const legacyResult = results[0];
  if (legacyResult.status === "rejected") {
    throw legacyResult.reason;
  }
  if (results[1].status === "rejected") {
    console.warn(
      "matchLive state dual-write skipped:",
      results[1].reason?.message || results[1].reason
    );
  }
}

export async function dualUpdateMatchStatsSide(
  database,
  eventId,
  matchId,
  side,
  patch
) {
  const results = await Promise.allSettled([
    update(
      ref(database, legacyMatchPath(eventId, matchId, "stats", side)),
      patch
    ),
    update(
      ref(database, matchLivePath(eventId, matchId, "stats", side)),
      patch
    ),
  ]);
  if (results[0].status === "rejected") {
    throw results[0].reason;
  }
  if (results[1].status === "rejected") {
    console.warn(
      "matchLive stats dual-write skipped:",
      results[1].reason?.message || results[1].reason
    );
  }
}

/**
 * Subscribe to match view: always keep legacy full match as base,
 * overlay non-null fields from matchLive when present.
 */
export function subscribeMatchView(database, eventId, matchId, onData) {
  let config = null;
  let live = null;
  let legacy = null;
  let lastEmitJson = undefined;

  const emit = () => {
    if (!legacy && !config && !live) {
      if (lastEmitJson !== "null") {
        lastEmitJson = "null";
        onData(null);
      }
      return;
    }

    const merged = {
      ...(legacy || {}),
      config: config ?? legacy?.config ?? null,
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
    unsubLive();
  };
}

/** Best-effort: copy live fields from an existing legacy match into matchLive. */
export async function backfillMatchLiveFromLegacy(database, eventId, matchId) {
  const snap = await get(ref(database, legacyMatchPath(eventId, matchId)));
  if (!snap.exists()) return false;
  await mirrorMatchLive(database, eventId, matchId, snap.val());
  return true;
}
