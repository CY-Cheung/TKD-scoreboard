import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ref, onValue } from "firebase/database";
import { database } from "../../firebase";
import { updateScoreAndCheckRules } from "../../Api";
import { ArrowLeft, Wifi, WifiOff, ShieldCheck } from "react-bootstrap-icons";
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

    const handleAction = (side, type, index, points, label) => {
        if (!eventId || !currentMatchId) return;

        // Trigger mobile haptic vibration if supported
        if (navigator.vibrate) {
            navigator.vibrate(60);
        }

        updateScoreAndCheckRules(eventId, currentMatchId, side, type, index, points);

        const actionText = `${side.toUpperCase()} ${label}`;
        setLastAction(actionText);

        setTimeout(() => {
            setLastAction((prev) => (prev === actionText ? null : prev));
        }, 2000);
    };

    const redName = matchData?.config?.competitors?.red?.name || "Hong (Red)";
    const blueName = matchData?.config?.competitors?.blue?.name || "Chung (Blue)";
    const matchNo = matchData?.config?.matchId || currentMatchId || "N/A";
    const currentRound = matchData?.state?.currentRound || 1;
    const isPaused = matchData?.state?.isPaused ?? true;

    return (
        <div className="controller-container">
            {/* Header Status Bar */}
            <div className="controller-header">
                <button className="back-btn" onClick={() => navigate("/")} aria-label="Back">
                    <ArrowLeft size={20} />
                </button>
                <div className="match-badge-info">
                    <span className="badge-item">{eventId || "No Event"}</span>
                    <span className="badge-item court">{courtId || "No Court"}</span>
                    <span className="badge-item match">Match #{matchNo}</span>
                </div>
                <div className="connection-status">
                    {isConnected ? (
                        <span className="connected-status">
                            <Wifi size={18} /> Connected
                        </span>
                    ) : (
                        <span className="disconnected-status">
                            <WifiOff size={18} /> Disconnected
                        </span>
                    )}
                </div>
            </div>

            {/* Last Action Toast */}
            {lastAction && <div className="last-action-banner">{lastAction}</div>}

            {/* Match Information Banner */}
            {!currentMatchId ? (
                <div className="no-match-card">
                    <h2>Waiting for Match...</h2>
                    <p>Court <strong>{courtId || "N/A"}</strong> currently has no active match.</p>
                </div>
            ) : (
                <div className="match-status-bar">
                    <div className="competitor red-text">{redName}</div>
                    <div className="round-indicator">
                        <span>Round {currentRound}</span>
                        <span className={`status-pill ${isPaused ? "paused" : "active"}`}>
                            {isPaused ? "PAUSED" : "LIVE"}
                        </span>
                    </div>
                    <div className="competitor blue-text">{blueName}</div>
                </div>
            )}

            {/* Controller Action Pad */}
            <div className="action-pad-grid">
                {/* RED SIDE (HONG) */}
                <div className="side-column red-column">
                    <div className="side-header red-bg">
                        <span>HONG (RED)</span>
                    </div>
                    <div className="button-group">
                        <button
                            className="ctrl-btn red-btn"
                            disabled={!currentMatchId}
                            onClick={() => handleAction("red", "pointsStat", 0, 1, "+1 Punch")}
                        >
                            +1 Punch
                        </button>
                        <button
                            className="ctrl-btn red-btn"
                            disabled={!currentMatchId}
                            onClick={() => handleAction("red", "pointsStat", 1, 1, "+2 Body Kick")}
                        >
                            +2 Body Kick
                        </button>
                        <button
                            className="ctrl-btn red-btn"
                            disabled={!currentMatchId}
                            onClick={() => handleAction("red", "pointsStat", 2, 1, "+3 Head Kick")}
                        >
                            +3 Head Kick
                        </button>
                        <button
                            className="ctrl-btn red-btn"
                            disabled={!currentMatchId}
                            onClick={() => handleAction("red", "pointsStat", 3, 1, "+4 Turn Body")}
                        >
                            +4 Turn Body
                        </button>
                        <button
                            className="ctrl-btn red-btn"
                            disabled={!currentMatchId}
                            onClick={() => handleAction("red", "pointsStat", 4, 1, "+5 Turn Head")}
                        >
                            +5 Turn Head
                        </button>

                        <div className="sub-actions">
                            <button
                                className="ctrl-btn warning-btn"
                                disabled={!currentMatchId}
                                onClick={() => handleAction("red", "gamjeom", null, 1, "+1 Gam-jeom")}
                            >
                                +1 Gam-jeom
                            </button>
                            <button
                                className="ctrl-btn sub-btn"
                                disabled={!currentMatchId}
                                onClick={() => handleAction("red", "gamjeom", null, -1, "-1 Gam-jeom")}
                            >
                                -1 Gam-jeom
                            </button>
                        </div>
                    </div>
                </div>

                {/* BLUE SIDE (CHUNG) */}
                <div className="side-column blue-column">
                    <div className="side-header blue-bg">
                        <span>CHUNG (BLUE)</span>
                    </div>
                    <div className="button-group">
                        <button
                            className="ctrl-btn blue-btn"
                            disabled={!currentMatchId}
                            onClick={() => handleAction("blue", "pointsStat", 0, 1, "+1 Punch")}
                        >
                            +1 Punch
                        </button>
                        <button
                            className="ctrl-btn blue-btn"
                            disabled={!currentMatchId}
                            onClick={() => handleAction("blue", "pointsStat", 1, 1, "+2 Body Kick")}
                        >
                            +2 Body Kick
                        </button>
                        <button
                            className="ctrl-btn blue-btn"
                            disabled={!currentMatchId}
                            onClick={() => handleAction("blue", "pointsStat", 2, 1, "+3 Head Kick")}
                        >
                            +3 Head Kick
                        </button>
                        <button
                            className="ctrl-btn blue-btn"
                            disabled={!currentMatchId}
                            onClick={() => handleAction("blue", "pointsStat", 3, 1, "+4 Turn Body")}
                        >
                            +4 Turn Body
                        </button>
                        <button
                            className="ctrl-btn blue-btn"
                            disabled={!currentMatchId}
                            onClick={() => handleAction("blue", "pointsStat", 4, 1, "+5 Turn Head")}
                        >
                            +5 Turn Head
                        </button>

                        <div className="sub-actions">
                            <button
                                className="ctrl-btn warning-btn"
                                disabled={!currentMatchId}
                                onClick={() => handleAction("blue", "gamjeom", null, 1, "+1 Gam-jeom")}
                            >
                                +1 Gam-jeom
                            </button>
                            <button
                                className="ctrl-btn sub-btn"
                                disabled={!currentMatchId}
                                onClick={() => handleAction("blue", "gamjeom", null, -1, "-1 Gam-jeom")}
                            >
                                -1 Gam-jeom
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Mode Indicator */}
            <div className="controller-footer">
                <ShieldCheck size={16} />
                <span>Single Referee Scoring Mode (Direct Match Control)</span>
            </div>
        </div>
    );
}

export default Controller;
