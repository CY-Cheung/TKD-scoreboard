// src/Api.js
import { ref, runTransaction } from "firebase/database";
import { database } from './firebase';

const getScoreValue = (stats, opponentGamjeom) => {
    const p = stats?.pointsStat || [0,0,0,0,0];
    const points = (p[0]*1) + (p[1]*2) + (p[2]*3) + (p[3]*4) + (p[4]*5);
    return points + (opponentGamjeom || 0);
};

export const updateScoreAndCheckRules = (eventName, matchId, side, type, index, delta) => {
    const matchRef = ref(database, `events/${eventName}/matches/${matchId}`);

    runTransaction(matchRef, (matchData) => {
        if (!matchData) return;

        if (matchData.state.matchPhase === 'REST') return;

        if (!matchData.stats) matchData.stats = { 
            red: { pointsStat: [0,0,0,0,0], gamjeom: 0 }, 
            blue: { pointsStat: [0,0,0,0,0], gamjeom: 0 } 
        };
        if (!matchData.state) matchData.state = { 
            isFinished: false, isPaused: true, timer: 0, winReason: null, lastStartTime: null 
        };

        const targetSide = matchData.stats[side];
        
        if (type === 'gamjeom') {
            targetSide.gamjeom = (targetSide.gamjeom || 0) + delta;
            if (targetSide.gamjeom < 0) targetSide.gamjeom = 0;
        } else if (type === 'pointsStat') {
            if (!targetSide.pointsStat || targetSide.pointsStat.length < 5) {
                 const oldStats = targetSide.pointsStat || [];
                 targetSide.pointsStat = [
                    oldStats[0] || 0, oldStats[1] || 0, oldStats[2] || 0,
                    oldStats[3] || 0, oldStats[4] || 0
                 ];
            }
            targetSide.pointsStat[index] = (targetSide.pointsStat[index] || 0) + delta;
            if (targetSide.pointsStat[index] < 0) targetSide.pointsStat[index] = 0;
        }

        const redGamjeom = matchData.stats.red.gamjeom;
        const blueGamjeom = matchData.stats.blue.gamjeom;
        const redScore = getScoreValue(matchData.stats.red, blueGamjeom);
        const blueScore = getScoreValue(matchData.stats.blue, redGamjeom);

        const freezeTimer = () => {
            if (!matchData.state.isPaused && matchData.state.lastStartTime) {
                const now = Date.now();
                const elapsed = Math.floor((now - matchData.state.lastStartTime) / 1000);
                
                matchData.state.timer = (matchData.state.timer || 0) - elapsed;
                if (matchData.state.timer < 0) matchData.state.timer = 0;
            }
            matchData.state.isPaused = true;
            matchData.state.lastStartTime = null;
            matchData.state.isFinished = true;
        };

        const maxGap = matchData.config?.rules?.maxPointGap || 12;
        const maxGJ = matchData.config?.rules?.maxGamjeom || 5;

        const isPUN = redGamjeom >= maxGJ || blueGamjeom >= maxGJ;
        const isPTG = Math.abs(redScore - blueScore) >= maxGap;

        if (isPUN) {
            freezeTimer();
            matchData.state.winReason = 'PUN';
        } 
        else if (isPTG) {
            freezeTimer();
            matchData.state.winReason = 'PTG';
        } 
        else {
            if (matchData.state.winReason === 'PTG' || matchData.state.winReason === 'PUN') {
                matchData.state.isFinished = false; 
                matchData.state.winReason = null;
            }
        }

        return matchData;
    })
    .catch((err) => console.error("Transaction failed:", err));
};

export const startRestTime = (eventName, matchId, winnerSide) => {
    const matchRef = ref(database, `events/${eventName}/matches/${matchId}`);
    runTransaction(matchRef, (matchData) => {
        if (!matchData) return;
        if (!matchData.stats) matchData.stats = {};
        if (!matchData.stats.roundWins) matchData.stats.roundWins = { red: 0, blue: 0 };
        if (!matchData.stats.roundScores) matchData.stats.roundScores = {};

        const currentRound = matchData.state.currentRound || 1;
        matchData.stats.roundScores[`R${currentRound}`] = {
            red: getScoreValue(matchData.stats.red, matchData.stats.blue.gamjeom),
            blue: getScoreValue(matchData.stats.blue, matchData.stats.red.gamjeom)
        };

        if (winnerSide && typeof winnerSide === 'string') {
            const cleanWinnerSide = winnerSide.trim();
            if (cleanWinnerSide === 'red') {
                matchData.stats.roundWins.red = (matchData.stats.roundWins.red || 0) + 1;
            }
            if (cleanWinnerSide === 'blue') {
                matchData.stats.roundWins.blue = (matchData.stats.roundWins.blue || 0) + 1;
            }
        }

        matchData.state.matchPhase = "REST";
        matchData.state.timer = 60; 
        matchData.state.isPaused = false;
        matchData.state.lastStartTime = Date.now();
        matchData.state.isFinished = false; 
        matchData.state.winReason = null;

        return matchData;
    });
};

export const startNextRound = (eventName, matchId) => {
    const matchRef = ref(database, `events/${eventName}/matches/${matchId}`);
    runTransaction(matchRef, (matchData) => {
        if (!matchData) return;

        const originalStats = { ...matchData.stats };

        matchData.stats = {
            ...originalStats, 
            red: { gamjeom: 0, pointsStat: [0,0,0,0,0] },
            blue: { gamjeom: 0, pointsStat: [0,0,0,0,0] }
        };

        matchData.state.currentRound = (matchData.state.currentRound || 1) + 1;

        matchData.state.matchPhase = "FIGHTING";
        matchData.state.timer = 120;
        matchData.state.isPaused = true;
        matchData.state.lastStartTime = null;
        matchData.state.isFinished = false;

        return matchData;
    });
};
