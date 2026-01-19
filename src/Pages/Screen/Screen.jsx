import React, { useState, useEffect, useMemo, useRef } from "react";
import { ref, onValue, set, get, update, runTransaction } from "firebase/database";
import { database } from "../../firebase";
import "./Screen.css";
import "./Edit.css";
import Edit from "./Edit";

const formatTime = (totalSeconds) => {
    if (typeof totalSeconds !== 'number' || isNaN(totalSeconds)) {
        return "0:00";
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// --- 輔助函數：計算單邊總分 ---
const calculateScore = (stats, opponentGamjeom) => {
    const p = stats?.pointsStat || [0,0,0,0,0];
    // p[0]=1分, p[1]=2分, p[2]=3分, p[3]=4分, p[4]=5分
    return (p[0]*1) + (p[1]*2) + (p[2]*3) + (p[3]*4) + (p[4]*5) + (opponentGamjeom || 0);
};

/**
 * --- 核心邏輯：優勢判定 (Superiority) ---
 * 1. 總分高者勝
 * 2. 平分 -> 比較 4分和5分 的「分數總和」(Value)
 * 3. 平分 -> 比較 3分和5分 的「命中次數」(Count)
 * 4. 平分 -> 比較 2分和4分 的「命中次數」(Count)
 * 5. 平分 -> 比較 1分 的「命中次數」(Count)
 * 6. 平分 -> 比較 Gamjeom 數量 (少者勝)
 */
const determineDominantSide = (redStats, blueStats) => {
    // 防呆提取
    const rP = redStats?.pointsStat || [0,0,0,0,0];
    const bP = blueStats?.pointsStat || [0,0,0,0,0];
    const rG = redStats?.gamjeom || 0;
    const bG = blueStats?.gamjeom || 0;

    // 1. 總分比較
    const redTotal = calculateScore({pointsStat: rP}, bG);
    const blueTotal = calculateScore({pointsStat: bP}, rG);

    if (redTotal > blueTotal) return 'red';
    if (blueTotal > redTotal) return 'blue';

    // --- 同分 Tie-Breaker ---

    // 2. 比較 4分和5分 的「分數總和」 (High Value Points)
    const redTurningPoints = (rP[3] * 4) + (rP[4] * 5);
    const blueTurningPoints = (bP[3] * 4) + (bP[4] * 5);
    if (redTurningPoints > blueTurningPoints) return 'red';
    if (blueTurningPoints > redTurningPoints) return 'blue';

    // 3. 比較 3分和5分 的「命中次數」 (High Value Hits)
    const redCount35 = rP[2] + rP[4];
    const blueCount35 = bP[2] + bP[4];
    if (redCount35 > blueCount35) return 'red';
    if (blueCount35 > redCount35) return 'blue';

    // 4. 比較 2分和4分 的「命中次數」 (Mid Value Hits)
    const redCount24 = rP[1] + rP[3];
    const blueCount24 = bP[1] + bP[3];
    if (redCount24 > blueCount24) return 'red';
    if (blueCount24 > redCount24) return 'blue';

    // 5. 比較 1分 的「命中次數」 (Punch Hits)
    if (rP[0] > bP[0]) return 'red';
    if (bP[0] > rP[0]) return 'blue';

    // 6. 比較 Gamjeom 數量 (少者優勢)
    if (rG < bG) return 'red'; 
    if (bG < rG) return 'blue';

    return 'none'; // 完全平手
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

    // Listener 1: Get currentMatchId
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

    // Listener 2: Get active match data
    useEffect(() => {
        if (!currentMatchId || !selectedEvent) return;
        const matchRef = ref(database, `events/${selectedEvent}/matches/${currentMatchId}`);
        const unsubscribe = onValue(matchRef, (snapshot) => {
            setMatchData(snapshot.val());
        });
        return () => unsubscribe();
    }, [currentMatchId, selectedEvent]);

    // New Timer Logic (from guide)
    useEffect(() => {
        if (!matchData?.state) return;

        const state = matchData.state;
        const { timer, isPaused, lastStartTime, isFinished } = state;

        const updateTimer = () => {
            if (isFinished) {
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
                const matchStateRef = ref(database, `events/${selectedEvent}/matches/${currentMatchId}/state`);
                update(matchStateRef, {
                    isFinished: true,
                    isPaused: true,
                    timer: 0,
                    lastStartTime: null
                });
            } else {
                setDisplayTime(remaining);
                animationFrameRef.current = requestAnimationFrame(updateTimer);
            }
        };

        animationFrameRef.current = requestAnimationFrame(updateTimer);

        return () => cancelAnimationFrame(animationFrameRef.current);

    }, [matchData?.state, selectedEvent, currentMatchId]);


    // Listener 3: Process judging queue
    useEffect(() => {
        if (!selectedEvent || !selectedCourt || !currentMatchId) return;
        const queueRef = ref(database, `judgingQueue/${selectedEvent}/${selectedCourt}`);
        const unsubscribe = onValue(queueRef, (snapshot) => {
            const queueData = snapshot.val();
            if (!queueData) return;

            console.log(`New votes for ${selectedCourt}. Processing...`);

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


    // --- Event Handlers ---
    const toggleDirection = () => setDirection((prev) => (prev === "row" ? "row-reverse" : "row"));
    
    const toggleTimer = async () => {
        if (!selectedEvent || !currentMatchId) return;
        const stateRef = ref(database, `events/${selectedEvent}/matches/${currentMatchId}/state`);

        try {
            const snapshot = await get(stateRef);
            if (!snapshot.exists()) return;

            const val = snapshot.val();
            const { isStarted = false, isPaused = true, isFinished = false, timer = 0, lastStartTime = null } = val;
            const now = Date.now();

            if (isFinished) return;

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

    const getDisplayName = (c) => c ? (c.name && c.affiliatedClub ? `${c.name} (${c.affiliatedClub})` : c.name) : "";

    const bluePlayerName = getDisplayName(matchData.config?.competitors?.blue) || "Blue Player";
    const redPlayerName = getDisplayName(matchData.config?.competitors?.red) || "Red Player";
    
    const redGamJeom = matchData.stats?.red?.gamjeom || 0;
    const blueGamJeom = matchData.stats?.blue?.gamjeom || 0;

    const redTotalScore = calculateScore(matchData.stats?.red, blueGamJeom);
    const blueTotalScore = calculateScore(matchData.stats?.blue, redGamJeom);
    
    const matchNumber = matchData.config?.matchId || "----";
    const roundNumber = matchData.state?.currentRound || 1;
    
    // --- Inline Style Logic ---
    const timerColor = matchData.state?.isPaused ? "#FFFF00" : "#FFFFFF";
    const redScoreColor = dominantSide === 'red' ? '#FFFF00' : '#FFFFFF';
    const blueScoreColor = dominantSide === 'blue' ? '#FFFF00' : '#FFFFFF';


    const { winReason, isFinished } = matchData?.state || {};

    const renderTimerContent = () => {
        if (winReason === 'PTG') return 'PTG';
        if (winReason === 'PUN') return 'PUN';
        if (isFinished) return "0:00";
        return formatTime(displayTime);
    };

    return (
        <>
            <div className="screen" onClick={() => !showEdit && document.documentElement.requestFullscreen()}>
                <div className="top" style={{ flexDirection: direction }}>
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
                            {redTotalScore}
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
                            <div className={`time-out match-font cursor-target ${!matchData.state?.isPaused ? "timeout-active" : ""}`} onClick={toggleTimer} style={{ backgroundColor: !matchData.state?.isPaused ? "#000000" : "#FFFF00" }}>
                                Time out
                            </div>
                        </div>
                        <div className="round-info">
                            <div className="round-font">ROUND</div>
                            <div className="round-number">{roundNumber}</div>
                        </div>
                    </div>
                    <div className="blue-score blue-bg">
                        <div 
                            className={'blue-score-text blue-score-bg score-font cursor-target'}
                            style={{ color: blueScoreColor }}
                            onClick={() => setShowEdit(true)}
                        >
                            {blueTotalScore}
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
                initialTimer={displayTime}
                phase={matchData?.state?.phase}
            />
        </>
    );
}

export default Screen;
