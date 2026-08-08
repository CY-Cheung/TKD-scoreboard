// src/Api.js
import { ref, runTransaction, update, get } from "firebase/database";
import { database } from './firebase';

const getScoreValue = (stats, opponentStats) => {
    const p = stats?.pointsStat || [0,0,0,0,0];
    const points = (p[0]*1) + (p[1]*2) + (p[2]*3) + (p[3]*4) + (p[4]*6);
    return points + (opponentStats?.gamjeom || 0) + (opponentStats?.gamjeomAvoiding || 0);
};

export const updateScoreAndCheckRules = (eventName, matchId, side, type, index, delta, courtId = null, deviceId = null, seatName = null, mode = 'single') => {
    const matchRef = ref(database, `events/${eventName}/matches/${matchId}`);

    runTransaction(matchRef, (matchData) => {
        if (!matchData) return;
        
        if (courtId && deviceId) {
            matchData.providedCourtId = courtId;
            matchData.providedDeviceId = deviceId;
        }

        if (matchData.state.phase === 'REST') return;

        if (!matchData.stats) matchData.stats = {
            red: { pointsStat: [0,0,0,0,0], gamjeom: 0 },
            blue: { pointsStat: [0,0,0,0,0], gamjeom: 0 }
        };
        if (!matchData.state) matchData.state = {
            isFinished: false, isPaused: true, timer: 0, winReason: null, lastStartTime: null, dominantSide: 'none'
        };

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
            if (mode === 'multiple' && seatName) {
                // Handle Valid Point Voting Mechanism
                if (!matchData.votes) matchData.votes = [];
                const now = Date.now();
                
                // Add the new vote
                matchData.votes.push({ side, index, seatName, deviceId, timestamp: now });
                
                // Keep only votes from the last 1000ms
                matchData.votes = matchData.votes.filter(v => now - v.timestamp <= 1000);
                
                // Check if there are 2 or more UNIQUE referees who voted for the exact same side & index
                const matchingVotes = matchData.votes.filter(v => v.side === side && v.index === index);
                const uniqueSeats = new Set(matchingVotes.map(v => v.seatName));
                
                if (uniqueSeats.size >= 2) {
                    // Valid Point achieved!
                    // Add score
                    if (!targetSide.pointsStat || targetSide.pointsStat.length < 5) {
                        const oldStats = targetSide.pointsStat || [];
                        targetSide.pointsStat = [
                            oldStats[0] || 0, oldStats[1] || 0, oldStats[2] || 0,
                            oldStats[3] || 0, oldStats[4] || 0
                        ];
                    }
                    targetSide.pointsStat[index] = (targetSide.pointsStat[index] || 0) + delta;
                    if (targetSide.pointsStat[index] < 0) targetSide.pointsStat[index] = 0;
                    
                    // Clear the votes for this specific score to prevent double-scoring
                    matchData.votes = matchData.votes.filter(v => !(v.side === side && v.index === index));
                } else {
                    // Not enough votes yet, just return and save the vote array
                    return matchData;
                }
            } else {
                // Single mode or direct score
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

        const maxGap = matchData.config?.rules?.maxPointGap || 15;
        const maxGJ = matchData.config?.rules?.maxGamjeom || 5;

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
        const roundsToWin = matchData.config?.rules?.roundsToWin || 2;

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
                red: { gamjeom: 0, pointsStat: [0,0,0,0,0] },
                blue: { gamjeom: 0, pointsStat: [0,0,0,0,0] }
            };
            
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

        matchData.stats.red = { gamjeom: 0, pointsStat: [0,0,0,0,0] };
        matchData.stats.blue = { gamjeom: 0, pointsStat: [0,0,0,0,0] };

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
        if (!config) return;

        const winnerData = config.competitors[winnerSide];
        const { nextMatchId, nextMatchSlot } = config;

        if (!nextMatchId || !nextMatchSlot) {
            alert("此場次未設定下一場比賽路徑 (Next Match ID/Slot missing)");
            return;
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

        alert(`已成功晉級：\n${winnerData.name} -> ${nextMatchId} (${nextMatchSlot})`);

    } catch (e) {
        console.error(e);
        alert(`晉級失敗: ${e.message}`);
    }
};
