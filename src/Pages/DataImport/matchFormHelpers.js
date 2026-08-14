import { parseName } from "./parseName";
import { formatIvrQuotaForInput } from "../../Api";
import { createMatchDocument } from "../../services/matchFactory";
import { appendIvrQuotaToRules } from "../../Api";
import { DEFAULT_MATCH_RULES } from "../../domain/defaultRules";

/**
 * Form rule defaults from event settings (Create Event values).
 * Used when opening Manage Match / switching event / after Add Match.
 */
export function deriveFormDefaultsFromEventSettings(settings = {}) {
  return {
    nextMatchId: "",
    nextMatchSlot: "",
    maxPointGap: settings.maxPointGap ?? DEFAULT_MATCH_RULES.maxPointGap,
    maxGamjeom: settings.maxGamjeom ?? DEFAULT_MATCH_RULES.maxGamjeom,
    roundDuration: settings.roundDuration ?? DEFAULT_MATCH_RULES.roundDuration,
    restDuration: settings.restDuration ?? DEFAULT_MATCH_RULES.restDuration,
    ivrQuota: formatIvrQuotaForInput(settings.ivrQuota),
    blueName: "",
    blueAffiliatedClub: "",
    bluePreviousMatch: "",
    redName: "",
    redAffiliatedClub: "",
    redPreviousMatch: "",
  };
}

function pickRuleValue(matchValue, eventValue, fallback) {
  if (matchValue !== null && matchValue !== undefined && matchValue !== "") {
    return matchValue;
  }
  if (eventValue !== null && eventValue !== undefined && eventValue !== "") {
    return eventValue;
  }
  return fallback;
}

/**
 * Derive DataImport form field values from a stored match document.
 * Falls back to event settings so Create Event values (e.g. IVR quota) show
 * when the match did not store an override.
 */
export function deriveMatchFormFields(matchData, eventSettings = {}) {
  const config = matchData?.config || {};
  const rules = config.rules || {};
  const competitors = config.competitors || {};
  const defaults = deriveFormDefaultsFromEventSettings(eventSettings);

  const resolveCompetitor = (competitor = {}) => {
    if (competitor.affiliatedClub !== undefined) {
      return {
        name: competitor.name || "",
        affiliatedClub: competitor.affiliatedClub || "",
        previousMatch: competitor.previousMatch || "",
      };
    }
    const parsed = parseName(competitor.name);
    return {
      name: parsed.name,
      affiliatedClub: parsed.club,
      previousMatch: competitor.previousMatch || "",
    };
  };

  const blue = resolveCompetitor(competitors.blue);
  const red = resolveCompetitor(competitors.red);

  const ivrSource = pickRuleValue(rules.ivrQuota, eventSettings.ivrQuota, null);

  return {
    nextMatchId: config.nextMatchId || "",
    nextMatchSlot: config.nextMatchSlot || "",
    maxPointGap: pickRuleValue(
      rules.maxPointGap,
      eventSettings.maxPointGap,
      defaults.maxPointGap
    ),
    maxGamjeom: pickRuleValue(
      rules.maxGamjeom,
      eventSettings.maxGamjeom,
      defaults.maxGamjeom
    ),
    roundDuration: pickRuleValue(
      rules.roundDuration,
      eventSettings.roundDuration,
      defaults.roundDuration
    ),
    restDuration: pickRuleValue(
      rules.restDuration,
      eventSettings.restDuration,
      defaults.restDuration
    ),
    ivrQuota: formatIvrQuotaForInput(ivrSource),
    blueName: blue.name,
    blueAffiliatedClub: blue.affiliatedClub,
    bluePreviousMatch: blue.previousMatch,
    redName: red.name,
    redAffiliatedClub: red.affiliatedClub,
    redPreviousMatch: red.previousMatch,
  };
}

/**
 * Apply deriveMatchFormFields result onto DataImport setters.
 */
export function applyMatchFormFields(fields, setters) {
  if (!fields || !setters) return;
  setters.setNextMatchId?.(fields.nextMatchId);
  setters.setNextMatchSlot?.(fields.nextMatchSlot);
  setters.setMaxPointGap?.(fields.maxPointGap);
  setters.setMaxGamjeom?.(fields.maxGamjeom);
  setters.setRoundDuration?.(fields.roundDuration);
  setters.setRestDuration?.(fields.restDuration);
  setters.setIvrQuota?.(fields.ivrQuota);
  setters.setBlueName?.(fields.blueName);
  setters.setBlueAffiliatedClub?.(fields.blueAffiliatedClub);
  setters.setBluePreviousMatch?.(fields.bluePreviousMatch);
  setters.setRedName?.(fields.redName);
  setters.setRedAffiliatedClub?.(fields.redAffiliatedClub);
  setters.setRedPreviousMatch?.(fields.redPreviousMatch);
}

/**
 * Build a match document from DataImport form state.
 */
export function buildMatchFromForm({
  matchId,
  nextMatchId,
  nextMatchSlot,
  maxPointGap,
  maxGamjeom,
  roundDuration,
  restDuration,
  ivrQuota,
  blueName,
  blueAffiliatedClub,
  bluePreviousMatch,
  redName,
  redAffiliatedClub,
  redPreviousMatch,
}) {
  return createMatchDocument({
    matchId,
    nextMatchId: nextMatchId || null,
    nextMatchSlot: nextMatchSlot || null,
    rules: appendIvrQuotaToRules(
      {
        maxPointGap: parseInt(maxPointGap, 10),
        maxGamjeom: parseInt(maxGamjeom, 10),
        roundDuration: parseInt(roundDuration, 10),
        restDuration: parseInt(restDuration, 10),
      },
      ivrQuota
    ),
    competitors: {
      blue: {
        name: blueName,
        affiliatedClub: blueAffiliatedClub || "",
        previousMatch: bluePreviousMatch || null,
      },
      red: {
        name: redName,
        affiliatedClub: redAffiliatedClub || "",
        previousMatch: redPreviousMatch || null,
      },
    },
    roundDuration: parseInt(roundDuration, 10),
  });
}

/** Clear competitor / linkage fields after a successful Add Match. */
export function clearMatchFormCompetitorFields(setters) {
  setters.setMatchId?.("");
  setters.setBlueName?.("");
  setters.setBlueAffiliatedClub?.("");
  setters.setRedName?.("");
  setters.setRedAffiliatedClub?.("");
  setters.setNextMatchId?.("");
  setters.setNextMatchSlot?.("");
  setters.setBluePreviousMatch?.("");
  setters.setRedPreviousMatch?.("");
}

/** Reset rule fields to event settings (keep competitors untouched). */
export function applyEventRuleDefaultsToForm(eventSettings, setters) {
  const defaults = deriveFormDefaultsFromEventSettings(eventSettings);
  setters.setMaxPointGap?.(defaults.maxPointGap);
  setters.setMaxGamjeom?.(defaults.maxGamjeom);
  setters.setRoundDuration?.(defaults.roundDuration);
  setters.setRestDuration?.(defaults.restDuration);
  setters.setIvrQuota?.(defaults.ivrQuota);
}
