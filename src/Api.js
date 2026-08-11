// src/Api.js
import { ref, update, get, onValue } from "firebase/database";
import { database } from './firebase';
import { applyScoreAndCheckRules } from './domain/scoreTransaction.js';
import {
    applyDeclareRoundWinner,
    applyStartNextRound,
} from './domain/roundTransaction.js';
import {
    dualUpdateMatchState,
    dualUpdateMatchStatsSide,
    dualUpdateMatchConfigCompetitors,
    runMatchLiveTransaction,
    fetchMatchConfigForRules,
} from './services/matchFirebase.js';

let globalServerTimeOffset = 0;
const offsetRef = ref(database, ".info/serverTimeOffset");
onValue(offsetRef, (snap) => {
  globalServerTimeOffset = snap.val() || 0;
});

// Re-export pure scoring helpers for callers that already import from Api.
export { getScoreValue } from './domain/scoreMath.js';
export {
    resetSideStatsForNextRound,
    resolveMatchRules,
    determineDominantSide,
    getFinalWinnerSide,
    isMatchFinal,
} from './domain/matchRules.js';
export {
    VOTE_WINDOW_MS,
    applyScoreAndCheckRules,
} from './domain/scoreTransaction.js';

/**
 * Apply a score/vote transaction.
 * @returns {Promise<{ committed: boolean, scored: boolean }>}
 *   scored=true only when points were actually applied (not vote-only / aborted).
 */
export const updateScoreAndCheckRules = (eventName, matchId, side, type, index, delta, courtId = null, deviceId = null, seatName = null, mode = 'single') => {
    const meta = { scored: false };

    return runMatchLiveTransaction(database, eventName, matchId, (matchData) => {
        // voteNow uses server offset; pauseNow stays wall-clock (legacy quirk).
        return applyScoreAndCheckRules(
            matchData,
            { side, type, index, delta, courtId, deviceId, seatName, mode },
            {
                voteNow: Date.now() + globalServerTimeOffset,
                pauseNow: Date.now(),
            },
            meta
        );
    })
    .then((result) => ({
        committed: Boolean(result?.committed),
        scored: Boolean(result?.committed && meta.scored),
    }))
    .catch((err) => {
        console.error("Transaction failed:", err);
        return { committed: false, scored: false };
    });
};

export const declareRoundWinner = (eventName, matchId, winnerSide) => {
    runMatchLiveTransaction(database, eventName, matchId, (matchData) =>
        applyDeclareRoundWinner(matchData, winnerSide, Date.now())
    );
};

export const startNextRound = (eventName, matchId) => {
    runMatchLiveTransaction(database, eventName, matchId, (matchData) =>
        applyStartNextRound(matchData)
    );
};

export const promoteWinner = async (eventName, currentMatchId, winnerSide) => {
    try {
        const config = await fetchMatchConfigForRules(
            database,
            eventName,
            currentMatchId
        );
        if (!config) throw new Error("Match config not found");

        const winnerData = config.competitors[winnerSide];
        const { nextMatchId, nextMatchSlot } = config;

        if (!nextMatchId || !nextMatchSlot) {
            throw new Error("此場次未設定下一場比賽路徑 (Next Match ID/Slot missing)");
        }

        await dualUpdateMatchConfigCompetitors(
            database,
            eventName,
            nextMatchId,
            nextMatchSlot,
            {
                name: winnerData.name,
                affiliatedClub: winnerData.affiliatedClub || ""
            }
        );

        await dualUpdateMatchState(database, eventName, currentMatchId, {
            winnerSide: winnerSide
        });

        return `已成功晉級：\n${winnerData.name} -> ${nextMatchId} (${nextMatchSlot})`;

    } catch (e) {
        console.error(e);
        throw e;
    }
};

export const startTechCardAnnouncement = (eventName, matchId, { side, decision }) => {
    return dualUpdateMatchState(database, eventName, matchId, {
        techCardAnnouncement: {
            side,
            decision,
            startedAt: Date.now(),
        },
    });
};

export const finalizeTechCardAnnouncement = async (eventName, matchId) => {
    let payload = null;

    const result = await runMatchLiveTransaction(database, eventName, matchId, (matchData) => {
        if (!matchData?.state?.techCardAnnouncement) return undefined;

        const ann = matchData.state.techCardAnnouncement;
        payload = { side: ann.side, decision: ann.decision };
        delete matchData.state.techCardAnnouncement;
        return matchData;
    });

    if (!result.committed || !payload) return;

    if (payload.decision === "reject") {
        updateScoreAndCheckRules(eventName, matchId, payload.side, "gamjeom", null, 1);
    }
};

export const startKyeShi = (eventName, matchId, durationSeconds = 60) => {
    return dualUpdateMatchState(database, eventName, matchId, {
        kyeShi: {
            startedAt: Date.now(),
            duration: durationSeconds,
        },
    });
};

export const stopKyeShi = (eventName, matchId) => {
    return dualUpdateMatchState(database, eventName, matchId, { kyeShi: null });
};

const isIvrQuotaEmpty = (value) => value === null || value === undefined || value === "";

/** Edit textbox empty = unlimited WT quota (stored as -1). */
export const IVR_UNLIMITED = -1;

export const isIvrUnlimited = (value) =>
    value === IVR_UNLIMITED || isIvrQuotaEmpty(value);

export const parseIvrQuotaInput = (value) => {
    if (isIvrQuotaEmpty(value)) return null;
    const trimmed = String(value).trim();
    if (trimmed === "") return null;
    const n = parseInt(trimmed, 10);
    if (Number.isNaN(n) || n < 1) return null;
    return n;
};

export const formatIvrQuotaForInput = (value) => {
    if (isIvrQuotaEmpty(value) || isIvrUnlimited(value)) return "";
    return String(value);
};

export const appendIvrQuotaToSettings = (settings, ivrQuotaInput) => {
    const parsed = parseIvrQuotaInput(ivrQuotaInput);
    if (parsed !== null) {
        settings.ivrQuota = parsed;
    } else {
        delete settings.ivrQuota;
    }
    return settings;
};

export const appendIvrQuotaToRules = (rules, ivrQuotaInput) => {
    const parsed = parseIvrQuotaInput(ivrQuotaInput);
    if (parsed !== null) {
        rules.ivrQuota = parsed;
    } else {
        delete rules.ivrQuota;
    }
    return rules;
};

export const buildIvrQuotaUpdate = (ivrQuotaInput) => {
    const parsed = parseIvrQuotaInput(ivrQuotaInput);
    return { ivrQuota: parsed !== null ? parsed : null };
};

export const isIvrWtMode = (eventSettings = {}, matchRules = {}) =>
    isIvrUnlimited(eventSettings?.ivrQuota) && isIvrUnlimited(matchRules?.ivrQuota);

export const resolveIvrQuotaCap = (eventSettings = {}, matchRules = {}) => {
    const matchQ = matchRules?.ivrQuota;
    if (!isIvrUnlimited(matchQ)) return Number(matchQ);
    const eventQ = eventSettings?.ivrQuota;
    if (!isIvrUnlimited(eventQ)) return Number(eventQ);
    return IVR_UNLIMITED;
};

export const getEffectiveIvrRemaining = (stats, side, eventSettings = {}, matchRules = {}) => {
    const stored = stats?.[side]?.ivrRemaining;
    if (stored === IVR_UNLIMITED) return IVR_UNLIMITED;
    if (typeof stored === "number" && !Number.isNaN(stored)) return stored;
    return resolveIvrQuotaCap(eventSettings, matchRules);
};

export const formatIvrQuotaForEdit = (remaining) => {
    if (isIvrUnlimited(remaining)) return "";
    return String(Math.max(0, remaining ?? 0));
};

export const projectIvrRemaining = (current, decision) => {
    if (isIvrUnlimited(current)) {
        return decision === "reject" ? 0 : IVR_UNLIMITED;
    }
    if (decision === "reject") {
        return 0;
    }
    return Math.max(0, current - 1);
};

export const setIvrRemaining = (eventName, matchId, side, value) => {
    if (value === null || value === undefined || value === "") {
        return dualUpdateMatchStatsSide(database, eventName, matchId, side, {
            ivrRemaining: IVR_UNLIMITED,
        });
    }
    const next = Math.max(0, Math.floor(Number(value) || 0));
    return dualUpdateMatchStatsSide(database, eventName, matchId, side, {
        ivrRemaining: next,
    });
};

export const startIvrAnnouncement = (eventName, matchId, { side, decision }) => {
    return dualUpdateMatchState(database, eventName, matchId, {
        ivrAnnouncement: {
            side,
            decision,
            startedAt: Date.now(),
        },
    });
};

export const finalizeIvrAnnouncement = async (eventName, matchId, eventSettings = {}) => {
    await runMatchLiveTransaction(database, eventName, matchId, (matchData) => {
        if (!matchData?.state?.ivrAnnouncement) return undefined;

        const ann = matchData.state.ivrAnnouncement;
        const side = ann.side;
        const decision = ann.decision;
        delete matchData.state.ivrAnnouncement;

        if (!matchData.stats) matchData.stats = { red: {}, blue: {} };
        if (!matchData.stats[side]) matchData.stats[side] = {};

        const rules = matchData.config?.rules || {};
        const current = getEffectiveIvrRemaining(matchData.stats, side, eventSettings, rules);
        matchData.stats[side].ivrRemaining = projectIvrRemaining(current, decision);

        return matchData;
    });
};
