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
  mergeMatchView,
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
  await Promise.all([
    update(ref(database, legacyMatchPath(eventId, matchId, "state")), patch),
    update(ref(database, matchLivePath(eventId, matchId, "state")), patch),
  ]);
}

export async function dualUpdateMatchStatsSide(
  database,
  eventId,
  matchId,
  side,
  patch
) {
  await Promise.all([
    update(
      ref(database, legacyMatchPath(eventId, matchId, "stats", side)),
      patch
    ),
    update(
      ref(database, matchLivePath(eventId, matchId, "stats", side)),
      patch
    ),
  ]);
}

/**
 * Subscribe to match view: config (legacy) + matchLive, with legacy full-match fallback.
 */
export function subscribeMatchView(database, eventId, matchId, onData) {
  let config = null;
  let live = null;
  let liveExists = false;
  let legacyFallback = null;
  let legacyUnsub = null;

  const emit = () => {
    if (liveExists) {
      onData(mergeMatchView(config, live, legacyFallback));
      return;
    }
    if (legacyFallback) {
      onData(legacyFallback);
      return;
    }
    if (config) {
      onData({ config, state: null, stats: null });
      return;
    }
    onData(null);
  };

  const ensureLegacyFallback = () => {
    if (legacyUnsub || liveExists) return;
    legacyUnsub = onValue(
      ref(database, legacyMatchPath(eventId, matchId)),
      (snap) => {
        legacyFallback = snap.exists() ? snap.val() : null;
        emit();
      }
    );
  };

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
      liveExists = snap.exists();
      live = snap.exists() ? snap.val() : null;
      if (!liveExists) {
        ensureLegacyFallback();
      } else if (legacyUnsub) {
        legacyUnsub();
        legacyUnsub = null;
        legacyFallback = null;
      }
      emit();
    }
  );

  // If live never fires quickly, still attach legacy fallback once
  ensureLegacyFallback();

  return () => {
    unsubConfig();
    unsubLive();
    if (legacyUnsub) legacyUnsub();
  };
}

/** Best-effort: copy live fields from an existing legacy match into matchLive. */
export async function backfillMatchLiveFromLegacy(database, eventId, matchId) {
  const snap = await get(ref(database, legacyMatchPath(eventId, matchId)));
  if (!snap.exists()) return false;
  await mirrorMatchLive(database, eventId, matchId, snap.val());
  return true;
}
