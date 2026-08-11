import { get, set, remove, update, ref } from "firebase/database";
import {
  buildEventIndexEntry,
  buildEventIndexBackfill,
  listFromEventIndex,
  listFromEventsTree,
} from "./eventIndex.js";

/**
 * Upsert one eventIndex row from event payload (or explicit fields).
 */
export async function writeEventIndexEntry(database, eventId, eventData) {
  await set(
    ref(database, `eventIndex/${eventId}`),
    buildEventIndexEntry(eventData, eventId)
  );
}

export async function removeEventIndexEntry(database, eventId) {
  await remove(ref(database, `eventIndex/${eventId}`));
}

/**
 * Prefer light eventIndex; if empty, fall back to /events and best-effort backfill.
 */
export async function fetchEventList(database) {
  const indexSnap = await get(ref(database, "eventIndex"));
  if (indexSnap.exists()) {
    return listFromEventIndex(indexSnap.val());
  }

  const eventsSnap = await get(ref(database, "events"));
  if (!eventsSnap.exists()) {
    return [];
  }

  const eventsVal = eventsSnap.val();
  const list = listFromEventsTree(eventsVal);

  try {
    const backfill = buildEventIndexBackfill(eventsVal);
    if (Object.keys(backfill).length > 0) {
      await update(ref(database, "eventIndex"), backfill);
    }
  } catch (err) {
    console.warn("eventIndex backfill skipped:", err?.message || err);
  }

  return list;
}
