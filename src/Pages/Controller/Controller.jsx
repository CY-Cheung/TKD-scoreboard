import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ref, onValue } from "firebase/database";
import { database } from "../../firebase";
import { updateScoreAndCheckRules } from "../../Api";
import Button from "../../Components/Button/Button";
import { Wifi, WifiOff, ArrowLeft } from "react-bootstrap-icons";
import "./Controller.css";

function Controller() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Extract event and court from URL query or fallback to localStorage
    const eventFromUrl = searchParams.get("event") || localStorage.getItem("selectedEvent") || "";
    const courtFromUrl = searchParams.get("court") || localStorage.getItem("selectedCourt") || "";

    const [eventId, setEventId] = useState(eventFromUrl);
    const [courtId, setCourtId] = useState(courtFromUrl);
    const [currentMatchId, setCurrentMatchId] = useState(null);
    const [matchData, setMatchData] = useState(null);
    const [lastAction, setLastAction] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    // Save selected params to localStorage
    useEffect(() => {
        if (eventId) localStorage.setItem("selectedEvent", eventId);
        if (courtId) localStorage.setItem("selectedCourt", courtId);
    }, [eventId, courtId]);

    // Listen to currentMatchId on court
    useEffect(() => {
        if (!eventId || !courtId) {
            setIsConnected(false);
            return;
        }

        const courtMatchIdRef = ref(database, `events/${eventId}/courts/${courtId}/currentMatchId`);
        const unsubscribe = onValue(
            courtMatchIdRef,
            (snapshot) => {
                setIsConnected(true);
                const matchId = snapshot.val();
                setCurrentMatchId(matchId || null);
                if (!matchId) setMatchData(null);
            },
            (error) => {
                console.error("Court match ID listener error:", error);
                setIsConnected(false);
            }
        );

        return () => unsubscribe();
    }, [eventId, courtId]);

    // Listen to matchData
    useEffect(() => {
        if (!eventId || !currentMatchId) {
            setMatchData(null);
            return;
        }

        const matchRef = ref(database, `events/${eventId}/matches/${currentMatchId}`);
        const unsubscribe = onValue(matchRef, (snapshot) => {
            setMatchData(snapshot.val());
        });

        return () => unsubscribe();
    }, [eventId, currentMatchId]);

    const handleScore = (side, index, label) => {
        if (!eventId || !currentMatchId) return;

        // Mobile haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(60);
        }

        // Call scoring API (+1 point increment for the selected point index)
        updateScoreAndCheckRules(eventId, currentMatchId, side, "pointsStat", index, 1);

        const actionText = `${side.toUpperCase()} ${label}`;
        setLastAction(actionText);

        setTimeout(() => {
            setLastAction((prev) => (prev === actionText ? null : prev));
        }, 1800);
    };

    const redName = matchData?.config?.competitors?.red?.name || "Hong (Red)";
    const blueName = matchData?.config?.competitors?.blue?.name || "Chung (Blue)";
    const matchNo = matchData?.config?.matchId || currentMatchId || "N/A";
    const currentRound = matchData?.state?.currentRound || 1;
    const isPaused = matchData?.state?.isPaused ?? true;

    return (
        <div className="controller">
            {/* Top Bar Banner for Match & Connection Status */}
            <div className="ctrl-top-bar">
                <button className="ctrl-back-btn" onClick={() => navigate("/")} aria-label="Back">
                    <ArrowLeft size={18} />
                </button>
                <div className="ctrl-info-badges">
                    <span className="ctrl-badge">{eventId || "No Event"}</span>
                    <span className="ctrl-badge court">{courtId || "No Court"}</span>
                    <span className="ctrl-badge match">Match #{matchNo}</span>
                </div>
                <div className="ctrl-conn-status">
                    {isConnected ? (
                        <span className="conn-connected"><Wifi size={16} /> Live</span>
                    ) : (
                        <span className="conn-disconnected"><WifiOff size={16} /> Offline</span>
                    )}
                </div>
            </div>

            {/* Action Feedback Banner Toast */}
            {lastAction && <div className="ctrl-action-banner">{lastAction}</div>}

            {/* Column 1: Red 5, Red 4, Red 1 */}
            <div className="col">
                <Button 
                    text="Red 5" 
                    angle={350} 
                    fontSize="3.5vw" 
                    onClick={() => handleScore("red", 4, "+5 Turn Head")} 
                />
                <Button 
                    text="Red 4" 
                    angle={350} 
                    fontSize="3.5vw" 
                    onClick={() => handleScore("red", 3, "+4 Turn Body")} 
                />
                <Button 
                    text="Red 1" 
                    angle={350} 
                    fontSize="3.5vw" 
                    onClick={() => handleScore("red", 0, "+1 Punch")} 
                />
            </div>

            {/* Column 2: Red 3, Red 2 */}
            <div className="col">
                <Button 
                    text="Red 3" 
                    angle={350} 
                    fontSize="3.5vw" 
                    onClick={() => handleScore("red", 2, "+3 Head")} 
                />
                <Button 
                    text="Red 2" 
                    angle={350} 
                    fontSize="3.5vw" 
                    onClick={() => handleScore("red", 1, "+2 Body")} 
                />
            </div>

            {/* Column 3: Center Info Panel */}
            <div className="col center-col">
                <div className="center-match-details">
                    <div className="competitor-label red-text">{redName}</div>
                    <div className="vs-divider">VS</div>
                    <div className="competitor-label blue-text">{blueName}</div>
                    <div className="round-pill">
                        Round {currentRound} ({isPaused ? "PAUSED" : "ACTIVE"})
                    </div>
                </div>
            </div>

            {/* Column 4: Blue 3, Blue 2 */}
            <div className="col">
                <Button 
                    text="Blue 3" 
                    angle={210} 
                    fontSize="3.5vw" 
                    onClick={() => handleScore("blue", 2, "+3 Head")} 
                />
                <Button 
                    text="Blue 2" 
                    angle={210} 
                    fontSize="3.5vw" 
                    onClick={() => handleScore("blue", 1, "+2 Body")} 
                />
            </div>

            {/* Column 5: Blue 5, Blue 4, Blue 1 */}
            <div className="col">
                <Button 
                    text="Blue 5" 
                    angle={210} 
                    fontSize="3.5vw" 
                    onClick={() => handleScore("blue", 4, "+5 Turn Head")} 
                />
                <Button 
                    text="Blue 4" 
                    angle={210} 
                    fontSize="3.5vw" 
                    onClick={() => handleScore("blue", 3, "+4 Turn Body")} 
                />
                <Button 
                    text="Blue 1" 
                    angle={210} 
                    fontSize="3.5vw" 
                    onClick={() => handleScore("blue", 0, "+1 Punch")} 
                />
            </div>
        </div>
    );
}

export default Controller;
