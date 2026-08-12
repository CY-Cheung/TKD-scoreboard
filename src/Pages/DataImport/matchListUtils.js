/**
 * Pure helpers for DataImport matches list / date filter.
 */

/** Unique matchDate strings from a matches map (order of first appearance). */
export function listAvailableMatchDates(currentMatches = {}) {
  return Array.from(
    new Set(
      Object.values(currentMatches)
        .map((m) => m.config?.matchDate)
        .filter(Boolean)
    )
  );
}

/** Match ids filtered by selectedDateFilter (`all` or a date string). */
export function filterMatchIdsByDate(
  currentMatches = {},
  selectedDateFilter = "all"
) {
  return Object.keys(currentMatches).filter((mId) => {
    if (selectedDateFilter === "all") return true;
    return currentMatches[mId]?.config?.matchDate === selectedDateFilter;
  });
}

/**
 * Competitor row label: previousMatch winner, name(+club), or empty.
 * @param {{ name?: string, affiliatedClub?: string, previousMatch?: string }} competitor
 */
export function getCompetitorDisplayText(competitor = {}) {
  if (!competitor.name && !competitor.affiliatedClub && competitor.previousMatch) {
    return `${competitor.previousMatch} Winner`;
  }
  if (competitor.affiliatedClub) {
    return `${competitor.name} (${competitor.affiliatedClub})`;
  }
  return competitor.name || "";
}

/**
 * Split displayName like "Foo (Day 1) (Sat)" into title / day / subtitle parts.
 * @returns {{ title: string, dayLabel: string|null, subLabel: string|null }}
 */
export function parseEventDisplayParts(rawName = "Event") {
  const dayMatch = String(rawName).match(/^(.*?)\s*(\(Day\s+\d+\))\s*(\(.*\))$/);
  if (!dayMatch) {
    return { title: rawName || "Event", dayLabel: null, subLabel: null };
  }
  return {
    title: dayMatch[1],
    dayLabel: dayMatch[2].replace(/[()]/g, ""),
    subLabel: dayMatch[3].replace(/[()]/g, ""),
  };
}
