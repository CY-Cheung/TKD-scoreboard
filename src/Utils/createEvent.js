/**
 * Shared event creation helpers for CourtSetup / DataImport.
 * Owns Firebase writes for new events; callers own UI state + toasts.
 */

import { ref, set } from "firebase/database";
import { database } from "../firebase";
import { appendIvrQuotaToSettings } from "../Api";
import { parseHktkdaPdfFile } from "./pdfParser";

export function buildGeneratedCourts(courtCount = 1) {
  const count = Math.max(1, Math.min(12, parseInt(courtCount, 10) || 1));
  const courts = {};
  for (let i = 1; i <= count; i++) {
    courts[`court${i}`] = { name: `court${i}`, currentMatchId: "" };
  }
  return { courts, count };
}

/** DD/MM/YYYY → { formattedDate: YYYY/MM/DD, cleanDate: YYYYMMDD } */
export function formatMatchDateParts(dateStr = "") {
  if (!dateStr) return { formattedDate: "", cleanDate: "" };
  const parts = dateStr.split("/");
  let formattedDate = dateStr;
  let cleanDate = dateStr.replace(/[^0-9]/g, "");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    formattedDate = `${y}/${m.padStart(2, "0")}/${d.padStart(2, "0")}`;
    cleanDate = `${y}${m.padStart(2, "0")}${d.padStart(2, "0")}`;
  }
  return { formattedDate, cleanDate };
}

export function applyFinalRulesToPdfResult(pdfParseResult, finalRules) {
  if (!pdfParseResult) return;
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
}

/**
 * Validate + parse HKTKDA schedule PDF.
 * @returns {{ ok: true, result } | { ok: false, error: 'NO_FILE'|'INVALID_PDF'|'EMPTY_SCHEDULE' }}
 */
export async function parseSchedulePdfFile(file) {
  if (!file) return { ok: false, error: "NO_FILE" };
  if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
    return { ok: false, error: "INVALID_PDF" };
  }
  const result = await parseHktkdaPdfFile(file);
  if (!result || result.matchCount === 0) {
    return { ok: false, error: "EMPTY_SCHEDULE" };
  }
  return { ok: true, result };
}

/**
 * Create one event, or split multi-day PDF into sub-events.
 * @throws Error with message AUTH_REQUIRED | MISSING_EVENT_FIELDS | Firebase errors
 */
export async function createEventFromFormOrPdf({
  user,
  eventId,
  eventName,
  setupPassword = "",
  maxPointGap = 15,
  maxGamjeom = 5,
  roundDuration = 90,
  restDuration = 60,
  ivrQuota = "",
  courtCount = 1,
  pdfParseResult = null,
  includeCourtCountInEmptyToast = true,
}) {
  if (!user) {
    const err = new Error("AUTH_REQUIRED");
    throw err;
  }

  const trimmedId = (eventId || "").trim();
  const trimmedName = (eventName || "").trim();
  if (!trimmedId || !trimmedName) {
    const err = new Error("MISSING_EVENT_FIELDS");
    throw err;
  }

  const finalRules = {
    maxPointGap: parseInt(maxPointGap, 10) || 15,
    maxGamjeom: parseInt(maxGamjeom, 10) || 5,
    roundDuration: parseInt(roundDuration, 10) || 90,
    restDuration: parseInt(restDuration, 10) || 60,
  };

  const settings = appendIvrQuotaToSettings(
    {
      setupPassword,
      ...finalRules,
    },
    ivrQuota
  );

  const { courts, count } = buildGeneratedCourts(courtCount);
  const baseMeta = {
    createdBy: user.uid,
    createdByEmail: user.email || "",
    createdAt: Date.now(),
    settings,
    courts,
  };

  if (pdfParseResult) {
    applyFinalRulesToPdfResult(pdfParseResult, finalRules);

    if (pdfParseResult.datesList?.length > 1) {
      let createdCount = 0;
      let firstSelectedId = "";

      for (let i = 0; i < pdfParseResult.datesList.length; i++) {
        const dateStr = pdfParseResult.datesList[i];
        const { formattedDate, cleanDate } = formatMatchDateParts(dateStr);
        const subEventId = `${trimmedId}_Day${i + 1}_${cleanDate}`;
        const subEventName = `${trimmedName} (Day ${i + 1}) (${formattedDate})`;
        if (i === 0) firstSelectedId = subEventId;

        await set(ref(database, `events/${subEventId}`), {
          EventName: subEventName,
          ...baseMeta,
          matchDate: formattedDate,
          matches: pdfParseResult.dateGroups[dateStr].matches,
        });
        createdCount++;
      }

      return {
        selectedEventId: firstSelectedId,
        toastMessage: `✅ 成功按 ${pdfParseResult.datesList.length} 個比賽日期拆分並建立 ${createdCount} 個子賽事！`,
        courtCount: count,
        mode: "pdf-multi",
      };
    }

    const dateStr = pdfParseResult.datesList?.[0] || "";
    const { formattedDate } = formatMatchDateParts(dateStr);

    await set(ref(database, `events/${trimmedId}`), {
      EventName: trimmedName,
      ...baseMeta,
      matchDate: formattedDate,
      matches: pdfParseResult.matches,
    });

    return {
      selectedEventId: trimmedId,
      toastMessage: `✅ 成功建立賽事並匯入賽程：${trimmedName}`,
      courtCount: count,
      mode: "pdf-single",
    };
  }

  await set(ref(database, `events/${trimmedId}`), {
    EventName: trimmedName,
    ...baseMeta,
    matches: {},
  });

  const emptyToast = includeCourtCountInEmptyToast
    ? `✅ 成功建立賽事：${trimmedName} (${trimmedId})，包含 ${count} 個場地！`
    : `✅ 成功建立賽事：${trimmedName}`;

  return {
    selectedEventId: trimmedId,
    toastMessage: emptyToast,
    courtCount: count,
    mode: "empty",
  };
}
