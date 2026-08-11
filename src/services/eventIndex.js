/**
 * eventIndex helpers — Stage 1 RTDB flattening (list metadata only).
 * @see docs/FIREBASE_FLATTENING_PLAN.md
 */

export function resolveEventDisplayName(eventLike, fallbackId = "") {
  if (!eventLike || typeof eventLike !== "object") {
    return fallbackId;
  }
  return (
    eventLike.EventName ||
    eventLike.eventName ||
    eventLike.settings?.eventName ||
    eventLike.name ||
    fallbackId
  );
}

/**
 * Build a light index payload from a full (or partial) event node.
 */
export function buildEventIndexEntry(eventData = {}, fallbackId = "") {
  return {
    EventName: resolveEventDisplayName(eventData, fallbackId),
    createdBy: eventData.createdBy ?? null,
    createdByEmail: eventData.createdByEmail ?? null,
  };
}

/**
 * Map eventIndex tree → UI list rows.
 */
export function listFromEventIndex(indexVal) {
  if (!indexVal || typeof indexVal !== "object") return [];
  return Object.keys(indexVal).map((id) => {
    const item = indexVal[id] || {};
    return {
      id,
      displayName: resolveEventDisplayName(item, id),
      createdBy: item.createdBy ?? null,
      createdByEmail: item.createdByEmail ?? null,
    };
  });
}

/**
 * Map full /events tree → UI list rows (legacy / backfill source).
 */
export function listFromEventsTree(eventsVal) {
  if (!eventsVal || typeof eventsVal !== "object") return [];
  return Object.keys(eventsVal).map((id) => {
    const item = eventsVal[id] || {};
    return {
      id,
      displayName: resolveEventDisplayName(item, id),
      createdBy: item.createdBy ?? null,
      createdByEmail: item.createdByEmail ?? null,
    };
  });
}

/**
 * Build multi-path update object for backfilling eventIndex from /events.
 * Keys are eventIds; values are index entries.
 */
export function buildEventIndexBackfill(eventsVal) {
  if (!eventsVal || typeof eventsVal !== "object") return {};
  const out = {};
  for (const id of Object.keys(eventsVal)) {
    out[id] = buildEventIndexEntry(eventsVal[id], id);
  }
  return out;
}
