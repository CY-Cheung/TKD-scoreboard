import React, { useState, useEffect } from "react";
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
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

function Screen() {
    const [matchData, setMatchData] = useState(null);
    const [timeoutActive, setTimeoutActive] = useState(true);
    const [direction, setDirection] = useState("row");
    const [showEdit, setShowEdit] = useState(false);

    const [selectedEvent, setSelectedEvent] = useState(localStorage.getItem('selectedEvent'));
    const [selectedCourt, setSelectedCourt] = useState(localStorage.getItem('selectedCourt'));
    const [currentMatchId, setCurrentMatchId] = useState(null);

    // Listener 1: Listen for the currentMatchId of the configured court.
    useEffect(() => {
        if (!selectedEvent || !selectedCourt) {
            console.log("Screen not configured. Waiting for event and court setup.");
            return;
        }

        const courtMatchIdRef = ref(database, `events/${selectedEvent}/courts/${selectedCourt}/currentMatchId`);
        
        const unsubscribe = onValue(courtMatchIdRef, (snapshot) => {
            const newMatchId = snapshot.val();
            if (newMatchId) {
                console.log(`Court ${selectedCourt} is now loading Match ID: ${newMatchId}`);
                setCurrentMatchId(newMatchId);
            } else {
                console.log(`Court ${selectedCourt} has no active match.`);
                setCurrentMatchId(null);
                setMatchData(null); // Clear data if match is unloaded
            }
        });

        return () => unsubscribe();
    }, [selectedEvent, selectedCourt]);

    // Listener 2: Listen to the data of the active match.
    useEffect(() => {
        if (!currentMatchId || !selectedEvent) {
            return; // Do nothing if there's no active match ID
        }

        const matchRef = ref(database, `events/${selectedEvent}/matches/${currentMatchId}`);
        const unsubscribe = onValue(matchRef, (snapshot) => {
            const data = snapshot.val();
            setMatchData(data);
            console.log("Real-time data updated for match:", currentMatchId);
        });

        return () => unsubscribe();
    }, [currentMatchId, selectedEvent]);

    // Listener 3: Process the judging queue for the configured court.
    useEffect(() => {
        if (!selectedEvent || !selectedCourt) return;

        const queueRef = ref(database, `judgingQueue/${selectedEvent}/${selectedCourt}`);
        
        const unsubscribe = onValue(queueRef, (snapshot) => {
            const queueData = snapshot.val();
            if (!queueData) return;

            if (!currentMatchId) {
                console.warn("Votes received, but no active match configured for this court. Clearing queue.");
                set(queueRef, null);
                return;
            }
            
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
                            console.log(`MAJORITY: ${color} ${type} (+${pointValue})`);
                            
                            const statRef = ref(database, `${matchPath}/stats/${color}/pointsStat/${pointIndex}`);
                            await runTransaction(statRef, (currentVal) => (currentVal || 0) + 1);
                            
                            console.log(`SUCCESS: Score updated for ${color}.`);
                            return true;
                        }
                    }

                    if (queueData[color]?.['gamjeom'] && Object.keys(queueData[color]['gamjeom']).length >= MAJORITY) {
                        console.log(`MAJORITY: ${color} Gam-jeom.`);
                        
                        const offendingPlayerRef = ref(database, `${matchPath}/stats/${color}/gamjeom`);
                        await runTransaction(offendingPlayerRef, (currentVal) => (currentVal || 0) + 1);
                        
                        console.log(`SUCCESS: Gam-jeom recorded for ${color}.`);
                        return true;
                    }
                }
                return false;
            };

            processVotes().then(wasActionTaken => {
                if (wasActionTaken) {
                    console.log("Clearing judging queue after successful action.");
                    set(queueRef, null);
                }
            });
        });

        return () => unsubscribe();
    }, [selectedEvent, selectedCourt, currentMatchId]);


    // --- Event Handlers ---
    const handleTimeoutClick = () => setTimeoutActive((prev) => !prev);
    const toggleDirection = () => setDirection((prev) => (prev === "row" ? "row-reverse" : "row"));

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (showEdit) return; 

            if (e.code === "Space") { e.preventDefault(); handleTimeoutClick(); }
            if (e.key === "\\") { toggleDirection(); }
            if (e.key === "e" || e.key === "E") { setShowEdit(true); }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [showEdit]);

    // --- UI Rendering ---
    if (!selectedCourt) {
        return (
            <div className="screen-unconfigured">
                <h1>Screen Unconfigured</h1>
                <p>Please go to <strong>Court Setup</strong> to assign this screen to a court.</p>
            </div>
        );
    }

    if (!matchData) {
        return (
            <div className="screen-configured-no-match">
                <h1>{selectedCourt.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h1>
                <p>Waiting for a match to be loaded from the control panel...</p>
            </div>
        );
    }

    // --- Data Calculation for Display ---
    const calculatePointsFromStats = (stats) => {
        if (!stats || !stats.pointsStat) return 0;
        const pointValues = [1, 2, 3, 4, 5];
        return stats.pointsStat.reduce((total, count, index) => {
            return total + ((count || 0) * pointValues[index]);
        }, 0);
    };

    const getDisplayName = (competitor) => {
        if (!competitor) return "";
        const name = competitor.name || "";
        const club = competitor.affiliatedClub || "";
        if (name && club) {
            return `${name} (${club})`;
        }
        return name;
    };

    const bluePlayerName = getDisplayName(matchData.config?.competitors?.blue) || "Blue Player";
    const redPlayerName = getDisplayName(matchData.config?.competitors?.red) || "Red Player";
    
    const redGamJeom = matchData.stats?.red?.gamjeom || 0;
    const blueGamJeom = matchData.stats?.blue?.gamjeom || 0;

    const redTotalScore = calculatePointsFromStats(matchData.stats?.red) + blueGamJeom;
    const blueTotalScore = calculatePointsFromStats(matchData.stats?.blue) + redGamJeom;
    
    const matchNumber = matchData.config?.matchId || "----";
    const roundNumber = matchData.state?.currentRound || 1;
    const timer = formatTime(matchData.state?.timer);

    return (
        <>
            <div className="screen" onClick={() => !showEdit && document.documentElement.requestFullscreen()}>
                <div className="top" style={{ flexDirection: direction }}>
                    <div className="red-name red-bg name-font cursor-target">{redPlayerName}</div>
                    <div className="blue-name blue-bg name-font cursor-target">{bluePlayerName}</div>
                </div>
                <div className="midbottom" style={{ flexDirection: direction, display: "flex" }}>
                    <div className="red-log red-bg">
                        <div className="red-gamjeom red-bg cursor-target" onClick={() => setShowEdit(true)}>
                            <div className="gamjeom-number">{redGamJeom}</div>
                            <div className="gamjeom-font">GAM-JEOM</div>
                        </div>
                    </div>
                    <div className="red-score red-bg">
                        <div className="red-score-text red-score-bg score-font cursor-target" onClick={() => setShowEdit(true)}>{redTotalScore}</div>
                    </div>
                    <div className="match-info">
                        <div className="match cursor-target" onClick={toggleDirection}>
                            <div className="match-font">MATCH</div>
                            <div className="match-number">{matchNumber}</div>
                        </div>
                        <div className="timer">
                            <div
                                className={`game-timer timer-font cursor-target ${timeoutActive ? "timeout-active" : ""}`}
                                onClick={handleTimeoutClick}
                                style={{ color: timeoutActive ? "#FFFFFF" : "#FFFF00" }}
                            >
                                {timer}
                            </div>
                            <div
                                className={`time-out match-font cursor-target ${timeoutActive ? "timeout-active" : ""}`}
                                onClick={handleTimeoutClick}
                                style={{ backgroundColor: timeoutActive ? "#000000" : "#FFFF00" }}
                            >
                                Time out
                            </div>
                        </div>
                        <div className="round-info">
                            <div className="round-font">ROUND</div>
                            <div className="round-number">{roundNumber}</div>
                        </div>
                    </div>
                    <div className="blue-score blue-bg">
                        <div className="blue-score-text blue-score-bg score-font cursor-target" onClick={() => setShowEdit(true)}>{blueTotalScore}</div>
                    </div>
                    <div className="blue-log blue-bg">
                        <div className="blue-gamjeom blue-bg cursor-target" onClick={() => setShowEdit(true)}>
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
            />
        </>
    );
}

export default Screen;
