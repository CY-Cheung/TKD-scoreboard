import { parseName } from "./parseName";
import { formatIvrQuotaForInput } from "../../Api";
import { createMatchDocument } from "../../services/matchFactory";
import { appendIvrQuotaToRules } from "../../Api";

/**
 * Derive DataImport form field values from a stored match document.
 */
export function deriveMatchFormFields(matchData) {
  const config = matchData?.config || {};
  const rules = config.rules || {};
  const competitors = config.competitors || {};

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

  return {
    nextMatchId: config.nextMatchId || "",
    nextMatchSlot: config.nextMatchSlot || "",
    maxPointGap: rules.maxPointGap || 15,
    maxGamjeom: rules.maxGamjeom || 5,
    roundDuration: rules.roundDuration || 90,
    restDuration: rules.restDuration || 60,
    ivrQuota: formatIvrQuotaForInput(rules.ivrQuota),
    blueName: blue.name,
    blueAffiliatedClub: blue.affiliatedClub,
    bluePreviousMatch: blue.previousMatch,
    redName: red.name,
    redAffiliatedClub: red.affiliatedClub,
    redPreviousMatch: red.previousMatch,
  };
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
