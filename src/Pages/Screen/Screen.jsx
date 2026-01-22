import React, { useState, useEffect, useMemo, useRef } from "react";
import { ref, onValue, set, get, update, runTransaction } from "firebase/database";
import { database } from "../../firebase";
import "./Screen.css";
import "../../App.css";
import Edit from "./Edit";

const formatTime = (totalSeconds) => {
    if (typeof totalSeconds !== 'number' || isNaN(totalSeconds)) {
        return "0:00";
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const calculateScore = (stats, opponentGamjeom) => {
    const p = stats?.pointsStat || [0,0,0,0,0];
    return (p[0]*1) + (p[1]*2) + (p[2]*3) + (p[3]*4) + (p[4]*5) + (opponentGamjeom || 0);
};

const determineDominantSide = (redStats, blueStats) => {
    const rG = redStats?.gamjeom || 0;
    const bG = blueStats?.gamjeom || 0;

    // Rule 1: Check for disqualification by penalties (PUN)
    // A player with 5 or more Gam-jeom automatically loses.
    if (rG >= 5) return 'blue';
    if (bG >= 5) return 'red';

    // If no disqualification, proceed to score calculation
    const rP = redStats?.pointsStat || [0,0,0,0,0];
    const bP = blueStats?.pointsStat || [0,0,0,0,0];

    const redTotal = calculateScore({pointsStat: rP}, bG);
    const blueTotal = calculateScore({pointsStat: bP}, rG);

    // Rule 2: Higher total score wins
    if (redTotal > blueTotal) return 'red';
    if (blueTotal > redTotal) return 'blue';

    // --- Tie-breaking rules ---
    // Rule 3: Most turning kicks (4 & 5 points)
    const redTurningPoints = (rP[3] * 4) + (rP[4] * 5);
    const blueTurningPoints = (bP[3] * 4) + (bP[4] * 5);
    if (redTurningPoints > blueTurningPoints) return 'red';
    if (blueTurningPoints > redTurningPoints) return 'blue';
    
    // Rule 4: Most high-value kicks (3 & 5 points)
    const redCount35 = rP[2] + rP[4];
    const blueCount35 = bP[2] + bP[4];
    if (redCount35 > blueCount35) return 'red';
    if (blueCount35 > redCount35) return 'blue';

    // Rule 5: Most mid-value kicks (2 & 4 points)
    const redCount24 = rP[1] + rP[3];
    const blueCount24 = bP[1] + bP[3];
    if (redCount24 > blueCount24) return 'red';
    if (blueCount24 > redCount24) return 'blue';

    // Rule 6: Most basic punches (1 point)
    if (rP[0] > bP[0]) return 'red';
    if (bP[0] > rP[0]) return 'blue';
    
    // Rule 7: Fewer penalties
    if (rG < bG) return 'red';
    if (bG < rG) return 'blue';

    // If all else is equal, it's a draw (superiority decision needed)
    return 'none';
};

function Screen() {
    const [matchData, setMatchData] = useState(null);
    const [direction, setDirection] = useState("row");
    const [showEdit, setShowEdit] = useState(false);
    const [displayTime, setDisplayTime] = useState(0);

    const [selectedEvent, setSelectedEvent] = useState(localStorage.getItem('selectedEvent'));
    const [selectedCourt, setSelectedCourt] = useState(localStorage.getItem('selectedCourt'));
    const [currentMatchId, setCurrentMatchId] = useState(null);

    const animationFrameRef = useRef();

    useEffect(() => {
        if (!selectedEvent || !selectedCourt) return;
        const courtMatchIdRef = ref(database, `events/${selectedEvent}/courts/${selectedCourt}/currentMatchId`);
        const unsubscribe = onValue(courtMatchIdRef, (snapshot) => {
            const newMatchId = snapshot.val();
            if (newMatchId) {
                setCurrentMatchId(newMatchId);
            } else {
                setCurrentMatchId(null);
                setMatchData(null);
            }
        });
        return () => unsubscribe();
    }, [selectedEvent, selectedCourt]);

    useEffect(() => {
        if (!currentMatchId || !selectedEvent) return;
        const matchRef = ref(database, `events/${selectedEvent}/matches/${currentMatchId}`);
        const unsubscribe = onValue(matchRef, (snapshot) => {
            setMatchData(snapshot.val());
        });
        return () => unsubscribe();
    }, [currentMatchId, selectedEvent]);

    useEffect(() => {
        if (!matchData?.state) return;

        const state = matchData.state;
        const { timer, isPaused, lastStartTime, isFinished, phase } = state;

        const updateTimer = () => {
            if (isFinished && phase !== 'REST') {
                setDisplayTime(0);
                cancelAnimationFrame(animationFrameRef.current);
                return;
            }

            if (isPaused) {
                setDisplayTime(timer || 0);
                cancelAnimationFrame(animationFrameRef.current);
                return;
            }

            const now = Date.now();
            const elapsed = Math.floor((now - lastStartTime) / 1000);
            const remaining = (timer || 0) - elapsed;

            if (remaining <= 0) {
                setDisplayTime(0);
                cancelAnimationFrame(animationFrameRef.current);
                
                if (phase !== 'REST') {
                    const matchStateRef = ref(database, `events/${selectedEvent}/matches/${currentMatchId}/state`);
                    update(matchStateRef, {
                        isFinished: true,
                        isPaused: true,
                        timer: 0,
                        lastStartTime: null
                    });
                }
            } else {
                setDisplayTime(remaining);
                animationFrameRef.current = requestAnimationFrame(updateTimer);
            }
        };

        animationFrameRef.current = requestAnimationFrame(updateTimer);

        return () => cancelAnimationFrame(animationFrameRef.current);

    }, [matchData?.state, selectedEvent, currentMatchId]);

    useEffect(() => {
        if (!selectedEvent || !selectedCourt || !currentMatchId) return;
        const queueRef = ref(database, `judgingQueue/${selectedEvent}/${selectedCourt}`);
        const unsubscribe = onValue(queueRef, (snapshot) => {
            const queueData = snapshot.val();
            if (!queueData) return;

            const MAJORITY = 2;
            const POINT_VALUES = { punch: 1, body: 2, head: 3, bodyTurn: 4, headTurn: 5 };
            const matchPath = `events/${selectedEvent}/matches/${currentMatchId}`;

            const processVotes = async () => {
                for (const color of ['red', 'blue']) {
                    for (const type of Object.keys(POINT_VALUES)) {
                        if (queueData[color]?.[type] && Object.keys(queueData[color][type]).length >= MAJORITY) {
                            const pointValue = POINT_VALUES[type];
                            const pointIndex = Object.values(POINT_VALUES).indexOf(pointValue);
                            const statRef = ref(database, `${matchPath}/stats/${color}/pointsStat/${pointIndex}`);
                            await runTransaction(statRef, (currentVal) => (currentVal || 0) + 1);
                            return true;
                        }
                    }
                    if (queueData[color]?.['gamjeom'] && Object.keys(queueData[color]['gamjeom']).length >= MAJORITY) {
                        const offendingPlayerRef = ref(database, `${matchPath}/stats/${color}/gamjeom`);
                        await runTransaction(offendingPlayerRef, (currentVal) => (currentVal || 0) + 1);
                        return true;
                    }
                }
                return false;
            };

            processVotes().then(wasActionTaken => {
                if (wasActionTaken) {
                    set(queueRef, null);
                }
            });
        });
        return () => unsubscribe();
    }, [selectedEvent, selectedCourt, currentMatchId]);

    const toggleDirection = () => setDirection((prev) => (prev === "row" ? "row-reverse" : "row"));
    
    const toggleTimer = async () => {
        if (!selectedEvent || !currentMatchId) return;
        const stateRef = ref(database, `events/${selectedEvent}/matches/${currentMatchId}/state`);

        try {
            const snapshot = await get(stateRef);
            if (!snapshot.exists()) return;

            const val = snapshot.val();
            const { isStarted = false, isPaused = true, isFinished = false, timer = 0, lastStartTime = null, phase } = val;
            const now = Date.now();

            if (isFinished && phase !== 'REST') return;

            if (!isStarted) {
                await update(stateRef, { isStarted: true, isPaused: false, isFinished: false, lastStartTime: now });
                return;
            }

            if (isPaused) {
                await update(stateRef, { isPaused: false, lastStartTime: now });
            } else {
                const startAt = lastStartTime || now;
                const elapsed = Math.floor((now - startAt) / 1000);
                let newTimer = timer - elapsed;
                if (newTimer < 0) newTimer = 0;

                await update(stateRef, { isPaused: true, timer: newTimer, lastStartTime: null });
            }
        } catch (error) {
            console.error("Toggle Timer Error:", error);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === "Space") { e.preventDefault(); toggleTimer(); }
            if (e.key === "\\") { toggleDirection(); }
            if (e.key === "e" || e.key === "E") { setShowEdit(prev => !prev); }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedEvent, currentMatchId]);

    const redStats = matchData?.stats?.red;
    const blueStats = matchData?.stats?.blue;

    const dominantSide = useMemo(() => {
        return determineDominantSide(redStats, blueStats);
    }, [redStats, blueStats]);

    if (!selectedCourt) {
        return <div className="screen-unconfigured"><h1>Screen Unconfigured</h1><p>Please go to <strong>Court Setup</strong> to assign this screen to a court.</p></div>;
    }

    if (!matchData) {
        return <div className="screen-configured-no-match"><h1>{selectedCourt.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h1><p>Waiting for a match to be loaded...</p></div>;
    }

    const { state = {}, config = {}, stats = {} } = matchData;
    const { phase = 'ROUND', currentRound = 1, winReason, isFinished, isPaused } = state;
    const { roundScores = {}, roundWins = { red: 0, blue: 0 } } = stats;
    const isResting = phase === 'REST';
    const isFinal = roundWins.red === 2 || roundWins.blue === 2;

    const getDisplayName = (c) => {
        if (c?.name) {
            return c.affiliatedClub ? `${c.name} (${c.affiliatedClub})` : c.name;
        }
        if (c?.previousMatch) {
            return `Winner of ${c.previousMatch}`;
        }
        return "";
    };

    const bluePlayerName = getDisplayName(config.competitors?.blue) || "Blue Player";
    const redPlayerName = getDisplayName(config.competitors?.red) || "Red Player";
    
    const redGamJeom = stats.red?.gamjeom || 0;
    const blueGamJeom = stats.blue?.gamjeom || 0;

    const redTotalScore = calculateScore(stats.red, blueGamJeom);
    const blueTotalScore = calculateScore(stats.blue, redGamJeom);
    
    const matchNumber = config.matchId || "----";
    
    const timerColor = isPaused ? "#FFFF00" : "#FFFFFF";
    const redScoreColor = !isResting && dominantSide === 'red' ? '#FFFF00' : '#FFFFFF';
    const blueScoreColor = !isResting && dominantSide === 'blue' ? '#FFFF00' : '#FFFFFF';

    const renderTimerContent = () => {
        if (winReason) return winReason;
        return formatTime(displayTime);
    };

    const renderSideHistory = (color) => {
        const scores = roundScores || {};
        return (
            <div className="round-history-container">
                {Object.entries(scores)
                    .sort(([a], [b]) => parseInt(a.substring(1)) - parseInt(b.substring(1)))
                    .map(([round, scoreData]) => (
                        <div className="history-row" key={round}>
                            <span className="history-label">{round}</span>
                            <span className="history-value">{scoreData[color] ?? 0}</span>
                        </div>
                    ))}
                <div className="total-round-wins">{roundWins[color] || 0}</div>
            </div>
        );
    };

    const getTimeoutStyle = () => {
        const style = { backgroundColor: !isPaused ? "#000000" : "#FFFF00" };
        if (isPaused) {
            style.color = "#000000";
        } else if (!isResting) {
            style.color = "#000000";
        }
        return style;
    };

    return (
        <>
            <div className="screen" onClick={() => !showEdit && document.documentElement.requestFullscreen()}>
                <div className={`top ${isResting ? 'rest-mode' : ''}`} style={{ flexDirection: direction }}>
                    <div className="red-name red-bg name-font">{redPlayerName}</div>
                    <div className="blue-name blue-bg name-font">{bluePlayerName}</div>
                </div>
                <div className="midbottom" style={{ flexDirection: direction, display: "flex" }}>
                    <div className="red-log red-bg">
                        <div className="red-gamjeom red-bg" onClick={() => setShowEdit(true)}>
                            <div className="gamjeom-number">{redGamJeom}</div>
                            <div className="gamjeom-font">GAM-JEOM</div>
                        </div>
                    </div>
                    <div className="red-score red-bg">
                         <div 
                            className={'red-score-text red-score-bg score-font cursor-target'}
                            style={{ color: redScoreColor }}
                            onClick={() => setShowEdit(true)}
                        >
                            {isResting || isFinal ? renderSideHistory('red') : redTotalScore}
                        </div>
                    </div>
                    <div className="match-info">
                        <div className="match cursor-target" onClick={toggleDirection}>
                            <div className="match-font">MATCH</div>
                            <div className="match-number">{matchNumber}</div>
                        </div>
                        <div className="timer">
                            <div className="game-timer timer-font cursor-target" onClick={toggleTimer} style={{ color: timerColor }}>
                                {renderTimerContent()}
                            </div>
                            <div 
                                className={`time-out match-font cursor-target ${!isPaused ? "timeout-active" : ""} ${isResting ? 'rest-mode' : ''}`} 
                                onClick={toggleTimer} 
                                style={getTimeoutStyle()}
                            >
                                {isResting ? 'REST TIME' : 'Time out'}
                            </div>
                        </div>
                        <div className="round-info">
                            <div className="round-font">ROUND</div>
                            <div className="round-number">{currentRound}</div>
                        </div>
                    </div>
                    <div className="blue-score blue-bg">
                        <div 
                            className={'blue-score-text blue-score-bg score-font cursor-target'}
                            style={{ color: blueScoreColor }}
                            onClick={() => setShowEdit(true)}
                        >
                            {isResting || isFinal ? renderSideHistory('blue') : blueTotalScore}
                        </div>
                    </div>
                    <div className="blue-log blue-bg">
                        <div className="blue-gamjeom blue-bg" onClick={() => setShowEdit(true)}>
                            <div className="gamjeom-number">{blueGamJeom}</div>
                            <div className="gamjeom-font">GAM-JEOM</div>
                        </div>
                    </div>
                </div>
            </div>
            <Edit 
                visible={showEdit} 
                setVisible={setShowEdit} 
                eventName={selectedEvent}
                matchId={currentMatchId}
                matchData={matchData}
                dominantSide={dominantSide}
            />
        </>
    );
}

export default Screen;
