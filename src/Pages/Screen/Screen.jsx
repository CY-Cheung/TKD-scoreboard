import React, { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
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
    const [matchData, setMatchData] = useState(null); // Renamed for clarity
    const [timeoutActive, setTimeoutActive] = useState(true);
    const [direction, setDirection] = useState("row");
    const [showEdit, setShowEdit] = useState(false);

    // --- Firebase Data Listener ---
    useEffect(() => {
        const courtRef = ref(database, 'court1');

        const unsubscribe = onValue(courtRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setMatchData(data); // Store the entire match object
            }
        });

        return () => unsubscribe();
    }, []);

    // --- Event Handlers ---
    const handleTimeoutClick = () => {
        setTimeoutActive((prev) => !prev);
    };

    const toggleDirection = () => {
        setDirection((prev) => (prev === "row" ? "row-reverse" : "row"));
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === "Space") {
                e.preventDefault();
                handleTimeoutClick();
            }
            if (e.key === "\\") {
                toggleDirection();
            }
            if (e.key === "e" || e.key === "E") {
                setShowEdit((prev) => !prev);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // --- Data Extraction from the new structure ---
    const redPlayerName = matchData?.config?.competitors?.red?.name || "Red Player";
    const bluePlayerName = matchData?.config?.competitors?.blue?.name || "Blue Player";
    
    const redTotalScore = matchData?.stats?.red?.pointsStat?.reduce((acc, val) => acc + val, 0) || 0;
    const blueTotalScore = matchData?.stats?.blue?.pointsStat?.reduce((acc, val) => acc + val, 0) || 0;
    
    const redGamJeom = matchData?.stats?.red?.gamjeom || 0;
    const blueGamJeom = matchData?.stats?.blue?.gamjeom || 0;
    
    const matchNumber = matchData?.config?.matchId || "----";
    const roundNumber = matchData?.state?.currentRound || 1;
    const timer = formatTime(matchData?.state?.timer);


    return (
        <>
            <div
                className="screen"
                onClick={() => document.documentElement.requestFullscreen()}
            >
                {/* Top: Player Names */}
                <div className="top" style={{ flexDirection: direction }}>
                    <div className="red-name red-bg name-font cursor-target">
                        {redPlayerName}
                    </div>
                    <div className="blue-name blue-bg name-font cursor-target">
                        {bluePlayerName}
                    </div>
                </div>

                {/* Mid/Bottom Section */}
                <div
                    className="midbottom"
                    style={{ flexDirection: direction, display: "flex" }}
                >
                    {/* Red Side Blocks */}
                    <div className="red-log red-bg">
                        {/* Referee logs can be implemented later */}
                        <div className="red-gamjeom red-bg cursor-target" onClick={() => setShowEdit(true)}>
                            <div className="gamjeom-number">{redGamJeom}</div>
                            <div className="gamjeom-font">GAM-JEOM</div>
                        </div>
                    </div>

                    <div className="red-score red-bg">
                        <div className="red-score-text red-score-bg score-font cursor-target" onClick={() => setShowEdit(true)}>
                            {redTotalScore}
                        </div>
                    </div>

                    {/* Center: Match Info */}
                    <div className="match-info">
                        <div className="match cursor-target" onClick={toggleDirection}>
                            <div className="match-font">MATCH</div>
                            <div className="match-number">{matchNumber}</div>
                        </div>
                        <div className="timer">
                            <div
                                className={`game-timer timer-font cursor-target ${timeoutActive ? " timeout-active" : ""}`}
                                onClick={handleTimeoutClick}
                                style={{ color: timeoutActive ? "#FFFFFF" : "#FFFF00" }}
                            >
                                {timer}
                            </div>
                            <div
                                className={`time-out match-font cursor-target ${timeoutActive ? " timeout-active" : ""}`}
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

                    {/* Blue Side Blocks */}
                    <div className="blue-score blue-bg">
                        <div className="blue-score-text blue-score-bg score-font cursor-target" onClick={() => setShowEdit(true)}>
                            {blueTotalScore}
                        </div>
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
