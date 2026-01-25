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

    if (rG >= 5) return 'blue';
    if (bG >= 5) return 'red';

    const rP = redStats?.pointsStat || [0,0,0,0,0];
    const bP = blueStats?.pointsStat || [0,0,0,0,0];

    const redTotal = calculateScore({pointsStat: rP}, bG);
    const blueTotal = calculateScore({pointsStat: bP}, rG);

    if (redTotal > blueTotal) return 'red';
    if (blueTotal > redTotal) return 'blue';

    const redTurningPoints = (rP[3] * 4) + (rP[4] * 5);
    const blueTurningPoints = (bP[3] * 4) + (bP[4] * 5);
    if (redTurningPoints > blueTurningPoints) return 'red';
    if (blueTurningPoints > redTurningPoints) return 'blue';
    
    const redCount35 = rP[2] + rP[4];
    const blueCount35 = bP[2] + bP[4];
    if (redCount35 > blueCount35) return 'red';
    if (blueCount35 > redCount35) return 'blue';

    const redCount24 = rP[1] + rP[3];
    const blueCount24 = bP[1] + bP[3];
    if (redCount24 > blueCount24) return 'red';
    if (blueCount24 > redCount24) return 'blue';

    if (rP[0] > bP[0]) return 'red';
    if (bP[0] > rP[0]) return 'blue';
    
    if (rG < bG) return 'red';
    if (bG < rG) return 'blue';

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
    const isMatchLoaded = !!matchData;

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
        if (!currentMatchId || !selectedEvent) {
            setMatchData(null); // Ensure matchData is cleared if no match ID
            return;
        }
        const matchRef = ref(database, `events/${selectedEvent}/matches/${currentMatchId}`);
        const unsubscribe = onValue(matchRef, (snapshot) => {
            setMatchData(snapshot.val());
        });
        return () => unsubscribe();
    }, [currentMatchId, selectedEvent]);

    useEffect(() => {
        if (!matchData?.state) {
            setDisplayTime(0);
            return;
        };

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

    // --- Real-time Judging Queue Processing --- 
    useEffect(() => {
        if (!selectedEvent || !selectedCourt || !currentMatchId) return;
        // ... (judging logic remains the same)
    }, [selectedEvent, selectedCourt, currentMatchId]);

    const toggleDirection = () => setDirection((prev) => (prev === "row" ? "row-reverse" : "row"));
    
    const toggleTimer = async () => {
        if (!isMatchLoaded) return;
        const stateRef = ref(database, `events/${selectedEvent}/matches/${currentMatchId}/state`);
        // ... (timer toggle logic remains the same)
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === "Space") { e.preventDefault(); toggleTimer(); }
            if (e.key === "\\") { toggleDirection(); }
            if (e.key === "e" || e.key === "E") { setShowEdit(prev => !prev); }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isMatchLoaded, selectedEvent, currentMatchId]); // Added isMatchLoaded dependency

    // --- Data Handling for Display ---
    const { state = {}, config = {}, stats = {} } = matchData || {};
    const { phase = 'ROUND', currentRound: matchCurrentRound, winReason, isFinished, isPaused = true } = state;
    const { roundScores = {}, roundWins: matchRoundWins = {} } = stats;

    const redStats = stats.red;
    const blueStats = stats.blue;

    const dominantSide = useMemo(() => {
        if (!isMatchLoaded) return 'none';
        return determineDominantSide(redStats, blueStats);
    }, [redStats, blueStats, isMatchLoaded]);

    if (!selectedCourt) {
        return <div className="screen-unconfigured"><h1>Screen Unconfigured</h1><p>Please go to <strong>Court Setup</strong> to assign this screen to a court.</p></div>;
    }

    const isResting = phase === 'REST';
    const roundWins = { red: matchRoundWins.red || 0, blue: matchRoundWins.blue || 0 };
    const isFinal = roundWins.red === 2 || roundWins.blue === 2;

    const getDisplayName = (c) => {
        if (!c || !c.name) return " "; // Return a space for layout stability
        return c.affiliatedClub ? `${c.name} (${c.affiliatedClub})` : c.name;
    };

    const bluePlayerName = getDisplayName(config.competitors?.blue);
    const redPlayerName = getDisplayName(config.competitors?.red);
    
    const redGamJeom = stats.red?.gamjeom ?? 0;
    const blueGamJeom = stats.blue?.gamjeom ?? 0;

    const redTotalScore = isMatchLoaded ? calculateScore(stats.red, blueGamJeom) : 0;
    const blueTotalScore = isMatchLoaded ? calculateScore(stats.blue, redGamJeom) : 0;
    
    const matchNumber = config.matchId ?? "000";
    const currentRound = matchCurrentRound ?? 1;
    
    const timerColor = isPaused ? "#FFFF00" : "#FFFFFF";
    const redScoreColor = !isResting && dominantSide === 'red' ? '#FFFF00' : '#FFFFFF';
    const blueScoreColor = !isResting && dominantSide === 'blue' ? '#FFFF00' : '#FFFFFF';

    const renderTimerContent = () => {
        if (winReason) return winReason;
        if (!isMatchLoaded) return "0:00";
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
                <div className="total-round-wins">{roundWins[color]}</div>
            </div>
        );
    };

    const getTimeoutStyle = () => {
        // Default style for when there is no match
        const style = { backgroundColor: "#FFFF00", color: "#000000" }; 
        if (isMatchLoaded) {
            Object.assign(style, { backgroundColor: !isPaused ? "#000000" : "#FFFF00" });
            if (isPaused) {
                style.color = "#000000";
            } else if (!isResting) {
                style.color = "#000000";
            }
        }
        return style;
    };

    return (
        <>
            <div className="screen" onClick={() => !showEdit && document.documentElement.requestFullscreen()}>
                {/* Top Section: Player Names */}
                <div className={`top ${isResting ? 'rest-mode' : ''}`} style={{ flexDirection: direction }}>
                    <div className="red-name red-bg name-font">{redPlayerName}</div>
                    <div className="blue-name blue-bg name-font">{bluePlayerName}</div>
                </div>

                {/* Main Section: Scores and Info */}
                <div className="midbottom" style={{ flexDirection: direction, display: "flex" }}>
                    {/* Red Side: Gam-jeom and Score */}
                    <div className="red-log red-bg">
                        <div className="red-gamjeom red-bg" onClick={() => isMatchLoaded && setShowEdit(true)}>
                            <div className="gamjeom-number">{redGamJeom}</div>
                            <div className="gamjeom-font">GAM-JEOM</div>
                        </div>
                    </div>
                    <div className="red-score red-bg">
                         <div 
                            className={'red-score-text red-score-bg score-font cursor-target'}
                            style={{ color: redScoreColor }}
                            onClick={() => isMatchLoaded && setShowEdit(true)}
                        >
                            {isResting || isFinal ? renderSideHistory('red') : redTotalScore}
                        </div>
                    </div>

                    {/* Center: Match Info */}
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
                                className={`time-out match-font cursor-target ${isMatchLoaded && !isPaused ? "timeout-active" : ""} ${isResting ? 'rest-mode' : ''}`}
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

                    {/* Blue Side: Score and Gam-jeom */}
                    <div className="blue-score blue-bg">
                        <div 
                            className={'blue-score-text blue-score-bg score-font cursor-target'}
                            style={{ color: blueScoreColor }}
                            onClick={() => isMatchLoaded && setShowEdit(true)}
                        >
                            {isResting || isFinal ? renderSideHistory('blue') : blueTotalScore}
                        </div>
                    </div>
                    <div className="blue-log blue-bg">
                        <div className="blue-gamjeom blue-bg" onClick={() => isMatchLoaded && setShowEdit(true)}>
                            <div className="gamjeom-number">{blueGamJeom}</div>
                            <div className="gamjeom-font">GAM-JEOM</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
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
