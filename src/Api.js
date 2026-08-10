// src/Api.js
import { ref, runTransaction, update, get, onValue } from "firebase/database";
import { database } from './firebase';
import {
    EMPTY_POINTS_STAT,
    getScoreValue,
    normalizePointsStat,
    resolveMatchRules,
} from './Utils/matchRules';

/** Multiple-referee vote window: judges must agree within this period (ms). */
export const VOTE_WINDOW_MS = 1000;

let globalServerTimeOffset = 0;
const offsetRef = ref(database, ".info/serverTimeOffset");
onValue(offsetRef, (snap) => {
  globalServerTimeOffset = snap.val() || 0;
});

/** Clear round-scoped scoring; keep match-scoped fields such as IVR remaining. */
const resetSideStatsForNextRound = (sideStats = {}) => {
    const next = { gamjeom: 0, pointsStat: [...EMPTY_POINTS_STAT] };
    if (typeof sideStats.ivrRemaining === "number" && !Number.isNaN(sideStats.ivrRemaining)) {
        next.ivrRemaining = sideStats.ivrRemaining;
    }
    return next;
};

export const updateScoreAndCheckRules = (eventName, matchId, side, type, index, delta, courtId = null, deviceId = null, seatName = null, mode = 'single') => {
    const matchRef = ref(database, `events/${eventName}/matches/${matchId}`);

    runTransaction(matchRef, (matchData) => {
        if (!matchData) return;
        
        if (courtId && deviceId) {
            matchData.providedCourtId = courtId;
            matchData.providedDeviceId = deviceId;
        }

        // Ensure state exists before reading from it
        if (!matchData.state) matchData.state = {
            isFinished: false, isPaused: true, timer: 0, winReason: null, lastStartTime: null, dominantSide: 'none'
        };
        
        if (!matchData.stats) matchData.stats = {
            red: { pointsStat: [...EMPTY_POINTS_STAT], gamjeom: 0 },
            blue: { pointsStat: [...EMPTY_POINTS_STAT], gamjeom: 0 }
        };

        if (matchData.state.phase === 'REST') return;

        const targetSide = matchData.stats[side];

        if (type === 'gamjeom') {
            targetSide.gamjeom = (targetSide.gamjeom || 0) + delta;
            if (targetSide.gamjeom < 0) targetSide.gamjeom = 0;
        } else if (type === 'gamjeomAvoiding') {
            targetSide.gamjeom = (targetSide.gamjeom || 0) + delta;
            if (targetSide.gamjeom < 0) targetSide.gamjeom = 0;
            targetSide.gamjeomAvoiding = (targetSide.gamjeomAvoiding || 0) + delta;
            if (targetSide.gamjeomAvoiding < 0) targetSide.gamjeomAvoiding = 0;
        } else if (type === 'pointsStat') {
            const now = Date.now() + globalServerTimeOffset;
            if (mode === 'multiple' && seatName) {
                // Handle Valid Point Voting Mechanism
                if (!matchData.votes) matchData.votes = [];
                
                
                // Add the new vote
                matchData.votes.push({ side, index, seatName, deviceId, timestamp: now });
                
                // Keep only votes from the last VOTE_WINDOW_MS (1 second valid-point window)
                matchData.votes = matchData.votes.filter(v => now - v.timestamp <= VOTE_WINDOW_MS);
                
                // Check if there are 2 or more UNIQUE referees who voted for the exact same side & index
                const matchingVotes = matchData.votes.filter(v => v.side === side && v.index === index);
                const uniqueSeats = new Set(matchingVotes.map(v => v.deviceId)); // Use deviceId to support testing with multiple Admin tabs
                
                if (uniqueSeats.size >= 2) {
                    // Valid Point achieved!
                    // Add score
                    targetSide.pointsStat = normalizePointsStat(targetSide.pointsStat);
                    targetSide.pointsStat[index] = (targetSide.pointsStat[index] || 0) + delta;
                    if (targetSide.pointsStat[index] < 0) targetSide.pointsStat[index] = 0;
                    
                    // Clear the votes for this specific score to prevent double-scoring
                    matchData.votes = matchData.votes.filter(v => !(v.side === side && v.index === index));
                    
                    // Add to recentScores
                    if (!matchData.recentScores) matchData.recentScores = [];
                    const actualSeatNames = Array.from(new Set(matchingVotes.map(v => v.seatName)));
                    matchData.recentScores.push({ side, index, seatNames: actualSeatNames, timestamp: now });
                } else {
                    // Not enough votes yet, just return and save the vote array
                    return matchData;
                }
            } else {
                // Single mode or direct score
                targetSide.pointsStat = normalizePointsStat(targetSide.pointsStat);
                targetSide.pointsStat[index] = (targetSide.pointsStat[index] || 0) + delta;
                if (targetSide.pointsStat[index] < 0) targetSide.pointsStat[index] = 0;
                
                // Add to recentScores in single mode if delta > 0
                if (delta > 0) {
                    if (!matchData.recentScores) matchData.recentScores = [];
                    matchData.recentScores.push({ side, index, seatNames: [seatName || 'J1'], timestamp: now });
                }
            }
        }

        const redGamjeom = matchData.stats.red.gamjeom;
        const blueGamjeom = matchData.stats.blue.gamjeom;
        const redScore = getScoreValue(matchData.stats.red, matchData.stats.blue);
        const blueScore = getScoreValue(matchData.stats.blue, matchData.stats.red);

        const pauseTimerForEvent = () => {
            if (!matchData.state.isPaused && matchData.state.lastStartTime) {
                const now = Date.now();
                const elapsed = Math.floor((now - matchData.state.lastStartTime) / 1000);

                matchData.state.timer = (matchData.state.timer || 0) - elapsed;
                if (matchData.state.timer < 0) matchData.state.timer = 0;
            }
            matchData.state.isPaused = true;
            matchData.state.lastStartTime = null;
        };

        const { maxPointGap: maxGap, maxGamjeom: maxGJ } = resolveMatchRules(matchData.config?.rules);

        const isPUN = redGamjeom >= maxGJ || blueGamjeom >= maxGJ;
        const isPTG = Math.abs(redScore - blueScore) >= maxGap;

        matchData.state.dominantSide = 'none'; // Reset dominance

        if (isPUN) {
            pauseTimerForEvent();
            matchData.state.winReason = 'PUN';
            if (redGamjeom >= maxGJ) matchData.state.dominantSide = 'blue';
            if (blueGamjeom >= maxGJ) matchData.state.dominantSide = 'red';
        }
        else if (isPTG) {
            pauseTimerForEvent();
            matchData.state.winReason = 'PTG';
            if (redScore > blueScore) matchData.state.dominantSide = 'red';
            if (blueScore > redScore) matchData.state.dominantSide = 'blue';
        }
        else {
            if (matchData.state.winReason === 'PTG' || matchData.state.winReason === 'PUN') {
                matchData.state.winReason = null;
            }
        }

        return matchData;
    })
    .catch((err) => console.error("Transaction failed:", err));
};

export const declareRoundWinner = (eventName, matchId, winnerSide) => {
    const matchRef = ref(database, `events/${eventName}/matches/${matchId}`);

    runTransaction(matchRef, (matchData) => {
        if (!matchData) return;
        if (!matchData.state) matchData.state = {};
        if (!matchData.stats) matchData.stats = {};
        if (!matchData.stats.roundWins) matchData.stats.roundWins = { red: 0, blue: 0 };
        if (!matchData.stats.roundScores) matchData.stats.roundScores = {};

        const currentRound = matchData.state.currentRound || 1;
        matchData.stats.roundScores[`R${currentRound}`] = {
            red: getScoreValue(matchData.stats.red, matchData.stats.blue),
            blue: getScoreValue(matchData.stats.blue, matchData.stats.red)
        };

        if (winnerSide === 'red') {
            matchData.stats.roundWins.red = (matchData.stats.roundWins.red || 0) + 1;
        } else if (winnerSide === 'blue') {
            matchData.stats.roundWins.blue = (matchData.stats.roundWins.blue || 0) + 1;
        }

        const redWins = matchData.stats.roundWins.red;
        const blueWins = matchData.stats.roundWins.blue;
        const { roundsToWin } = resolveMatchRules(matchData.config?.rules);

        if (redWins >= roundsToWin || blueWins >= roundsToWin) {
            matchData.state.isFinished = true;
            matchData.state.winReason = 'PTF';
            matchData.state.isPaused = true;
            matchData.state.timer = 0;
            matchData.state.phase = 'ROUND';
        } else {
            const originalStats = { ...matchData.stats };
            matchData.stats = {
                ...originalStats,
                red: resetSideStatsForNextRound(originalStats.red),
                blue: resetSideStatsForNextRound(originalStats.blue),
            };
            
            matchData.recentScores = [];
            
            matchData.state.phase = "REST";
            matchData.state.timer = matchData.config?.rules?.restDuration || 60;
            matchData.state.isPaused = false;
            matchData.state.lastStartTime = Date.now();
            matchData.state.isFinished = false;
            matchData.state.winReason = null;
            matchData.state.dominantSide = 'none';
        }

        return matchData;
    });
};

export const startNextRound = (eventName, matchId) => {
    const matchRef = ref(database, `events/${eventName}/matches/${matchId}`);
    runTransaction(matchRef, (matchData) => {
        if (!matchData) return;

        matchData.stats.red = resetSideStatsForNextRound(matchData.stats.red);
        matchData.stats.blue = resetSideStatsForNextRound(matchData.stats.blue);

        matchData.state.currentRound = (matchData.state.currentRound || 1) + 1;
        matchData.state.phase = "ROUND";
        matchData.state.timer = matchData.config?.rules?.roundDuration || 90;
        matchData.state.isPaused = true;
        matchData.state.lastStartTime = null;
        matchData.state.isFinished = false;
        matchData.state.dominantSide = 'none';

        return matchData;
    });
};

export const promoteWinner = async (eventName, currentMatchId, winnerSide) => {
    const matchRoot = `events/${eventName}/matches`;

    try {
        const snapshot = await get(ref(database, `${matchRoot}/${currentMatchId}/config`));
        const config = snapshot.val();
        if (!config) throw new Error("Match config not found");

        const winnerData = config.competitors[winnerSide];
        const { nextMatchId, nextMatchSlot } = config;

        if (!nextMatchId || !nextMatchSlot) {
            throw new Error("此場次未設定下一場比賽路徑 (Next Match ID/Slot missing)");
        }

        const targetPath = `${matchRoot}/${nextMatchId}/config/competitors/${nextMatchSlot}`;
        
        await update(ref(database, targetPath), {
            name: winnerData.name,
            affiliatedClub: winnerData.affiliatedClub || ""
        });

        // ALSO update the current match's state to record the winner!
        await update(ref(database, `${matchRoot}/${currentMatchId}/state`), {
            winnerSide: winnerSide
        });

        return `已成功晉級：\n${winnerData.name} -> ${nextMatchId} (${nextMatchSlot})`;

    } catch (e) {
        console.error(e);
        throw e;
    }
};

export const startTechCardAnnouncement = (eventName, matchId, { side, decision }) => {
    const stateRef = ref(database, `events/${eventName}/matches/${matchId}/state`);
    return update(stateRef, {
        techCardAnnouncement: {
            side,
            decision,
            startedAt: Date.now(),
        },
    });
};

export const finalizeTechCardAnnouncement = async (eventName, matchId) => {
    const matchRef = ref(database, `events/${eventName}/matches/${matchId}`);
    let payload = null;

    const result = await runTransaction(matchRef, (matchData) => {
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
    const stateRef = ref(database, `events/${eventName}/matches/${matchId}/state`);
    return update(stateRef, {
        kyeShi: {
            startedAt: Date.now(),
            duration: durationSeconds,
        },
    });
};

export const stopKyeShi = (eventName, matchId) => {
    const stateRef = ref(database, `events/${eventName}/matches/${matchId}/state`);
    return update(stateRef, { kyeShi: null });
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
    const statsRef = ref(database, `events/${eventName}/matches/${matchId}/stats/${side}`);
    if (value === null || value === undefined || value === "") {
        return update(statsRef, { ivrRemaining: IVR_UNLIMITED });
    }
    const next = Math.max(0, Math.floor(Number(value) || 0));
    return update(statsRef, { ivrRemaining: next });
};

export const startIvrAnnouncement = (eventName, matchId, { side, decision }) => {
    const stateRef = ref(database, `events/${eventName}/matches/${matchId}/state`);
    return update(stateRef, {
        ivrAnnouncement: {
            side,
            decision,
            startedAt: Date.now(),
        },
    });
};

export const finalizeIvrAnnouncement = async (eventName, matchId, eventSettings = {}) => {
    const matchRef = ref(database, `events/${eventName}/matches/${matchId}`);

    await runTransaction(matchRef, (matchData) => {
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
