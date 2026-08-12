/**
 * Parse Home / session event display into title + optional date line.
 * Handles "Name (Day N) (DD/MM/YYYY)" and "Name (date)".
 */
export function normalizeEventDateDisplay(dateStr = "") {
  const ddMMyyyyMatch = String(dateStr).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddMMyyyyMatch) {
    return `${ddMMyyyyMatch[3]}/${ddMMyyyyMatch[2].padStart(2, "0")}/${ddMMyyyyMatch[1].padStart(2, "0")}`;
  }
  return dateStr;
}

export function parseEventHeading(fullEventName = "N/A") {
  const raw = fullEventName || "N/A";
  const matchDouble = raw.match(/^(.*?)\s*\((Day[^)]+)\)\s*\(([^)]+)\)\s*$/i);
  if (matchDouble) {
    return {
      mainEventName: matchDouble[1].trim(),
      eventDateStr: `${matchDouble[2].trim()} - ${normalizeEventDateDisplay(matchDouble[3].trim())}`,
    };
  }
  const matchSingle = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (matchSingle) {
    return {
      mainEventName: matchSingle[1].trim(),
      eventDateStr: normalizeEventDateDisplay(matchSingle[2].trim()),
    };
  }
  return { mainEventName: raw, eventDateStr: "" };
}
