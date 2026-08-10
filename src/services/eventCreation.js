import { DEFAULT_MATCH_RULES } from "../domain/defaultRules.js";
import { createStoredMatchRules } from "./matchFactory.js";

/**
 * Normalize create-event form rule fields (legacy || defaults).
 */
export function normalizeRulesFromForm({
  maxPointGap,
  maxGamjeom,
  roundDuration,
  restDuration,
} = {}) {
  return createStoredMatchRules({
    maxPointGap: parseInt(maxPointGap, 10) || DEFAULT_MATCH_RULES.maxPointGap,
    maxGamjeom: parseInt(maxGamjeom, 10) || DEFAULT_MATCH_RULES.maxGamjeom,
    roundDuration: parseInt(roundDuration, 10) || DEFAULT_MATCH_RULES.roundDuration,
    restDuration: parseInt(restDuration, 10) || DEFAULT_MATCH_RULES.restDuration,
  });
}

/**
 * Build courts map. CourtSetup clamps 1–12 (invalid → 4).
 * DataImport should pass courtCount=1.
 */
export function buildCourtsMap(courtCount, { invalidFallback = 4 } = {}) {
  const count = Math.max(
    1,
    Math.min(12, parseInt(courtCount, 10) || invalidFallback)
  );
  const courts = {};
  for (let i = 1; i <= count; i++) {
    courts[`court${i}`] = { name: `court${i}`, currentMatchId: "" };
  }
  return { courts, count };
}

/**
 * PDF date "DD/MM/YYYY" → display YYYY/MM/DD + clean YYYYMMDD.
 */
export function formatPdfDate(dateStr = "") {
  const parts = String(dateStr).split("/");
  let formattedDate = dateStr;
  let cleanDate = String(dateStr).replace(/[^0-9]/g, "");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    formattedDate = `${y}/${m.padStart(2, "0")}/${d.padStart(2, "0")}`;
    cleanDate = `${y}${m.padStart(2, "0")}${d.padStart(2, "0")}`;
  }
  return { formattedDate, cleanDate };
}

/**
 * Overlay form rules onto PDF matches (in-place — legacy behaviour).
 */
export function applyRulesToPdfResult(pdfParseResult, finalRules) {
  if (!pdfParseResult) return pdfParseResult;

  if (pdfParseResult.dateGroups) {
    Object.values(pdfParseResult.dateGroups).forEach((group) => {
      if (group.matches) {
        Object.values(group.matches).forEach((m) => {
          if (m.config) m.config.rules = { ...m.config.rules, ...finalRules };
        });
      }
    });
  } else if (pdfParseResult.matches) {
    Object.values(pdfParseResult.matches).forEach((m) => {
      if (m.config) m.config.rules = { ...m.config.rules, ...finalRules };
    });
  }

  return pdfParseResult;
}

function baseEventMeta(user, now) {
  return {
    createdBy: user.uid,
    createdByEmail: user.email || "",
    createdAt: now,
  };
}

/**
 * Pure builder: event Firebase payloads (no writes).
 *
 * @returns {{
 *   records: Array<{ id: string, data: object }>,
 *   primaryEventId: string,
 *   mode: 'multi'|'single-pdf'|'empty',
 *   datesCount: number,
 *   courtCount: number,
 * }}
 */
export function buildEventRecords({
  eventId,
  eventName,
  user,
  settings,
  courts,
  courtCount,
  pdfParseResult = null,
  now = Date.now(),
}) {
  const meta = baseEventMeta(user, now);
  const resolvedCourtCount =
    courtCount ?? Object.keys(courts || {}).length;

  if (pdfParseResult) {
    applyRulesToPdfResult(
      pdfParseResult,
      // rules already baked into settings for event; matches need form rules only
      createStoredMatchRules({
        maxPointGap: settings.maxPointGap,
        maxGamjeom: settings.maxGamjeom,
        roundDuration: settings.roundDuration,
        restDuration: settings.restDuration,
      })
    );

    if (pdfParseResult.datesList?.length > 1) {
      const records = [];
      let primaryEventId = "";

      for (let i = 0; i < pdfParseResult.datesList.length; i++) {
        const dateStr = pdfParseResult.datesList[i];
        const { formattedDate, cleanDate } = formatPdfDate(dateStr);
        if (i === 0) primaryEventId = `${eventId}_Day1_${cleanDate}`;

        const subEventId = `${eventId}_Day${i + 1}_${cleanDate}`;
        const subEventName = `${eventName} (Day ${i + 1}) (${formattedDate})`;

        records.push({
          id: subEventId,
          data: {
            EventName: subEventName,
            ...meta,
            matchDate: formattedDate,
            settings,
            courts,
            matches: pdfParseResult.dateGroups[dateStr].matches,
          },
        });
      }

      return {
        records,
        primaryEventId,
        mode: "multi",
        datesCount: pdfParseResult.datesList.length,
        courtCount: resolvedCourtCount,
      };
    }

    const dateStr = pdfParseResult.datesList?.[0] || "";
    const { formattedDate } = formatPdfDate(dateStr);

    return {
      records: [
        {
          id: eventId,
          data: {
            EventName: eventName,
            ...meta,
            matchDate: formattedDate,
            settings,
            courts,
            matches: pdfParseResult.matches,
          },
        },
      ],
      primaryEventId: eventId,
      mode: "single-pdf",
      datesCount: pdfParseResult.datesList?.length || 0,
      courtCount: resolvedCourtCount,
    };
  }

  return {
    records: [
      {
        id: eventId,
        data: {
          EventName: eventName,
          ...meta,
          settings,
          courts,
          matches: {},
        },
      },
    ],
    primaryEventId: eventId,
    mode: "empty",
    datesCount: 0,
    courtCount: resolvedCourtCount,
  };
}
