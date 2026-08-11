/**
 * Stage 5a — detect / remove orphan top-level trees left after event deletes
 * that predated full cascade cleanup.
 *
 * Orphan = eventId present under courts|matches|matchIndex|matchLive
 * but absent from eventIndex ∪ events.
 */

import { get, ref } from "firebase/database";
import { removeFlatCourtsForEvent } from "./courtFirebase.js";
import { removeMatchFlatArtifactsForEvent } from "./matchFirebase.js";

export const ORPHAN_TREE_ROOTS = Object.freeze([
  "courts",
  "matches",
  "matchIndex",
  "matchLive",
]);

/**
 * @param {object} opts
 * @param {string[]} opts.knownEventIds  live events (eventIndex ∪ events)
 * @param {Record<string, string[]>} opts.treeKeys  { courts: [...], matchLive: [...], ... }
 * @returns {{ orphanEventIds: string[], byTree: Record<string, string[]> }}
 */
export function listOrphanEventIds({ knownEventIds = [], treeKeys = {} } = {}) {
  const known = new Set(
    (knownEventIds || []).filter((id) => typeof id === "string" && id.length > 0)
  );
  const byTree = {};
  const orphanSet = new Set();

  for (const root of ORPHAN_TREE_ROOTS) {
    const ids = treeKeys[root] || [];
    const orphans = ids.filter((id) => id && !known.has(id));
    byTree[root] = orphans.slice().sort();
    orphans.forEach((id) => orphanSet.add(id));
  }

  return {
    orphanEventIds: [...orphanSet].sort(),
    byTree,
  };
}

/** Child keys of a root object map (or empty). */
export function keysFromShallowMap(val) {
  if (!val || typeof val !== "object") return [];
  return Object.keys(val);
}

/**
 * Load known event ids + top-level tree keys via SDK gets.
 * (Trees are keyed by eventId; value size may be large for matchLive — acceptable for admin tool.)
 */
export async function scanOrphanFirebaseTrees(database) {
  const [
    indexSnap,
    eventsSnap,
    courtsSnap,
    matchesSnap,
    matchIndexSnap,
    matchLiveSnap,
  ] = await Promise.all([
    get(ref(database, "eventIndex")),
    get(ref(database, "events")),
    get(ref(database, "courts")),
    get(ref(database, "matches")),
    get(ref(database, "matchIndex")),
    get(ref(database, "matchLive")),
  ]);

  const knownEventIds = [
    ...new Set([
      ...keysFromShallowMap(indexSnap.exists() ? indexSnap.val() : null),
      ...keysFromShallowMap(eventsSnap.exists() ? eventsSnap.val() : null),
    ]),
  ].sort();

  const treeKeys = {
    courts: keysFromShallowMap(courtsSnap.exists() ? courtsSnap.val() : null),
    matches: keysFromShallowMap(matchesSnap.exists() ? matchesSnap.val() : null),
    matchIndex: keysFromShallowMap(
      matchIndexSnap.exists() ? matchIndexSnap.val() : null
    ),
    matchLive: keysFromShallowMap(
      matchLiveSnap.exists() ? matchLiveSnap.val() : null
    ),
  };

  const { orphanEventIds, byTree } = listOrphanEventIds({
    knownEventIds,
    treeKeys,
  });

  return { knownEventIds, treeKeys, orphanEventIds, byTree };
}

/**
 * Remove top-level courts + matches + matchIndex + matchLive for one orphan eventId.
 * Does NOT touch events/ or eventIndex/ (orphan by definition has no live event).
 */
export async function removeOrphanTreesForEvent(database, eventId) {
  if (!eventId) return;
  await removeFlatCourtsForEvent(database, eventId);
  await removeMatchFlatArtifactsForEvent(database, eventId);
}

/**
 * @returns {Promise<{ removed: string[], failed: { eventId: string, error: string }[] }>}
 */
export async function removeAllOrphanTrees(database, orphanEventIds) {
  const removed = [];
  const failed = [];
  for (const eventId of orphanEventIds || []) {
    try {
      await removeOrphanTreesForEvent(database, eventId);
      removed.push(eventId);
    } catch (err) {
      failed.push({
        eventId,
        error: err?.message || String(err),
      });
    }
  }
  return { removed, failed };
}

/** Human-readable summary for confirm dialogs. */
export function formatOrphanScanSummary({ orphanEventIds, byTree }) {
  if (!orphanEventIds?.length) {
    return "No orphan top-level trees found.";
  }
  const lines = [
    `Found ${orphanEventIds.length} orphan event id(s):`,
    ...orphanEventIds.map((id) => `• ${id}`),
    "",
    "Present under:",
  ];
  for (const root of ORPHAN_TREE_ROOTS) {
    const ids = byTree?.[root] || [];
    if (ids.length) {
      lines.push(`  ${root}: ${ids.join(", ")}`);
    }
  }
  return lines.join("\n");
}
