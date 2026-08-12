import { ref, set } from "firebase/database";
import { appendIvrQuotaToSettings } from "../Api";
import {
  buildCourtsMap,
  buildEventRecords,
  normalizeRulesFromForm,
} from "./eventCreation";
import { writeEventIndexEntry } from "./eventIndexFirebase";
import {
  mirrorCourtsMapToFlat,
  eventMetaPayloadForWrite,
} from "./courtFirebase";
import { mirrorMatchFlatArtifacts } from "./matchFirebase";

/**
 * Persist create-event records to flat RTDB (meta + index + courts + matches).
 * Write order must stay: events → eventIndex → courts → match artifacts.
 */
export async function persistCreatedEvents({
  database,
  user,
  eventId,
  eventName,
  setupPassword,
  formRulesFields,
  ivrQuota,
  courtCount,
  pdfParseResult,
}) {
  const formRules = normalizeRulesFromForm(formRulesFields);
  const { courts, count } = buildCourtsMap(courtCount);
  const settings = appendIvrQuotaToSettings(
    { setupPassword, ...formRules },
    ivrQuota
  );

  const built = buildEventRecords({
    eventId,
    eventName,
    user,
    settings,
    courts,
    courtCount: count,
    pdfParseResult,
  });

  for (const record of built.records) {
    await set(
      ref(database, `events/${record.id}`),
      eventMetaPayloadForWrite(record.data)
    );
    await writeEventIndexEntry(database, record.id, record.data);
    await mirrorCourtsMapToFlat(database, record.id, record.data.courts);
    if (record.data.matches) {
      await Promise.all(
        Object.entries(record.data.matches).map(([mid, mdata]) =>
          mirrorMatchFlatArtifacts(database, record.id, mid, mdata)
        )
      );
    }
  }

  return { ...built, courtCountUsed: count };
}

/** Toast copy for create-event success (CourtSetup vs DataImport differ on empty mode). */
export function toastMessageForCreateMode(
  mode,
  {
    trimmedName,
    trimmedId,
    datesCount,
    recordsLength,
    courtCount,
    includeCourtCountOnBare = false,
  } = {}
) {
  if (mode === "multi") {
    return `✅ 成功按 ${datesCount} 個比賽日期拆分並建立 ${recordsLength} 個子賽事！`;
  }
  if (mode === "single-pdf") {
    return `✅ 成功建立賽事並匯入賽程：${trimmedName}`;
  }
  // mode === 'empty' (or any other)
  if (includeCourtCountOnBare) {
    return `✅ 成功建立賽事：${trimmedName} (${trimmedId})，包含 ${courtCount} 個場地！`;
  }
  return `✅ 成功建立賽事：${trimmedName}`;
}

/** Default create-event form field values after success. */
export function defaultCreateEventFormValues() {
  return {
    newEventId: "",
    newEventName: "",
    newSetupPassword: "",
    newMaxPointGap: 15,
    newMaxGamjeom: 5,
    newRoundDuration: 90,
    newRestDuration: 60,
    newIvrQuota: "",
    pdfParseResult: null,
  };
}
