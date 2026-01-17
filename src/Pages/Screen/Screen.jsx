import React, { useState, useEffect } from "react";
import { ref, onValue, set, get, update } from "firebase/database"; // Import all necessary functions
import { database } from "../../firebase";
import "./Screen.css";
import "./Edit.css";
import Edit from "./Edit";

// Helper function to format seconds into M:SS format
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

    // Get event and match ID from localStorage
    const [selectedEvent, setSelectedEvent] = useState(localStorage.getItem('selectedEvent'));
    const [selectedMatchId, setSelectedMatchId] = useState(localStorage.getItem('selectedMatchId'));

    // Main data listener - dynamic based on localStorage values
    useEffect(() => {
        // Listen for changes in localStorage and update state
        const handleStorageChange = () => {
            setSelectedEvent(localStorage.getItem('selectedEvent'));
            setSelectedMatchId(localStorage.getItem('selectedMatchId'));
        };
        window.addEventListener('storage', handleStorageChange);

        if (!selectedEvent || !selectedMatchId) {
            console.log("Event or Match ID not found in localStorage. Waiting for configuration...");
            setMatchData(null); // Clear data if no active match
            return;
        }

        console.log(`Screen configured for: ${selectedEvent} - Match ${selectedMatchId}`);
        const matchRef = ref(database, `events/${selectedEvent}/matches/${selectedMatchId}`);
        const unsubscribe = onValue(matchRef, (snapshot) => {
            const data = snapshot.val();
            setMatchData(data);
            console.log("Match data updated for", selectedMatchId);
        });

        return () => {
            unsubscribe();
            window.removeEventListener('storage', handleStorageChange);
        }
    }, [selectedEvent, selectedMatchId]);

    // Core Scoring Logic: Listen to the fixed judging queue for court1
    useEffect(() => {
        const eventName = localStorage.getItem('selectedEvent');
        if (!eventName) return;

        const matchId = localStorage.getItem('selectedMatchId');
        const queueRef = ref(database, `judgingQueue/${eventName}/court1`);

        const unsubscribe = onValue(queueRef, (snapshot) => {
            const queueData = snapshot.val();
            if (!queueData) return;

            console.log("New votes detected in judging queue. Processing...");

            if (!matchId) {
                console.warn("Votes received, but no active match configured. Clearing queue.");
                set(queueRef, null);
                return;
            }

            const MAJORITY = 2;
            const POINT_VALUES = { punch: 1, body: 2, head: 3, bodyTurn: 4, headTurn: 5 };
            const matchPath = `events/${eventName}/matches/${matchId}`;

            const processVotes = async () => {
                for (const color of ['red', 'blue']) {
                    for (const type of Object.keys(POINT_VALUES)) {
                        if (queueData[color]?.[type] && Object.keys(queueData[color][type]).length >= MAJORITY) {
                            const pointValue = POINT_VALUES[type];
                            console.log(`MAJORITY: ${color} ${type} (+${pointValue})`);
                            
                            const statsRef = ref(database, `${matchPath}/stats/${color}`);
                            const currentStats = (await get(statsRef)).val() || { pointsStat: [], gamjeom: 0 };
                            const newPointsStat = [...(currentStats.pointsStat || []), pointValue];
                            
                            await update(statsRef, { pointsStat: newPointsStat });
                            console.log(`SUCCESS: Score updated for ${color}.`);
                            return true;
                        }
                    }

                    if (queueData[color]?.['gamjeom'] && Object.keys(queueData[color]['gamjeom']).length >= MAJORITY) {
                        const opponentColor = color === 'red' ? 'blue' : 'red';
                        console.log(`MAJORITY: ${color} Gam-jeom. +1 for ${opponentColor}`);

                        const updates = {};
                        const offendingPlayerRef = ref(database, `${matchPath}/stats/${color}`);
                        const opponentPlayerRef = ref(database, `${matchPath}/stats/${opponentColor}`);

                        const offendingStats = (await get(offendingPlayerRef)).val() || { gamjeom: 0 };
                        const opponentStats = (await get(opponentPlayerRef)).val() || { pointsStat: [] };

                        updates[`${matchPath}/stats/${color}/gamjeom`] = (offendingStats.gamjeom || 0) + 1;
                        updates[`${matchPath}/stats/${opponentColor}/pointsStat`] = [...(opponentStats.pointsStat || []), 1];

                        await update(ref(database), updates);
                        console.log(`SUCCESS: Gam-jeom recorded for ${color}, score updated for ${opponentColor}.`);
                        return true;
                    }
                }
                return false;
            };

            processVotes().then(wasScoreApplied => {
                if (wasScoreApplied) {
                    console.log("Clearing judging queue after successful update.");
                    set(queueRef, null);
                }
            });
        });

        return () => unsubscribe();
    }, []); // This effect should only run once to set up the listener


    // --- Event Handlers ---
    const handleTimeoutClick = () => setTimeoutActive((prev) => !prev);
    const toggleDirection = () => setDirection((prev) => (prev === "row" ? "row-reverse" : "row"));

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === "Space") { e.preventDefault(); handleTimeoutClick(); }
            if (e.key === "\\") { toggleDirection(); }
            if (e.key === "e" || e.key === "E") { setShowEdit((prev) => !prev); }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // --- Data Extraction ---
    const getDisplayName = (competitor) => {
        if (!competitor) return "";
        const name = competitor.name || "";
        const club = competitor.affiliatedClub || "";
        if (name && club) {
            return `${name} (${club})`;
        }
        return name;
    };

    const bluePlayerName = getDisplayName(matchData?.config?.competitors?.blue) || "Blue Player";
    const redPlayerName = getDisplayName(matchData?.config?.competitors?.red) || "Red Player";
    
    const redTotalScore = matchData?.stats?.red?.pointsStat?.reduce((acc, val) => acc + val, 0) || 0;
    const blueTotalScore = matchData?.stats?.blue?.pointsStat?.reduce((acc, val) => acc + val, 0) || 0;
    
    const redGamJeom = matchData?.stats?.red?.gamjeom || 0;
    const blueGamJeom = matchData?.stats?.blue?.gamjeom || 0;
    
    const matchNumber = matchData?.config?.matchId || "----";
    const roundNumber = matchData?.state?.currentRound || 1;
    const timer = formatTime(matchData?.state?.timer);

    return (
        <>
            <div className="screen" onClick={() => document.documentElement.requestFullscreen()}>
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
            <Edit visible={showEdit} setVisible={setShowEdit} />
        </>
    );
}

export default Screen;
