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

    // Helper to extract query parameter from searchParams, search URL, Hash URL, or localStorage
    const getParam = (key) => {
        const fromSearch = searchParams.get(key);
        if (fromSearch) return fromSearch;

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get(key)) return urlParams.get(key);

        if (window.location.hash.includes("?")) {
            const hashQuery = window.location.hash.split("?")[1];
            const hashParams = new URLSearchParams(hashQuery);
            if (hashParams.get(key)) return hashParams.get(key);
        }

        if (key === "event") return localStorage.getItem("selectedEvent") || "";
        if (key === "court") return localStorage.getItem("selectedCourt") || "";

        return "";
    };

    const initialEvent = getParam("event");
    const initialCourt = getParam("court");

    const [eventId, setEventId] = useState(initialEvent);
    const [courtId, setCourtId] = useState(initialCourt);
    const [currentMatchId, setCurrentMatchId] = useState(null);
    const [matchData, setMatchData] = useState(null);
    const [lastAction, setLastAction] = useState(null); // { side: 'red'|'blue', text: '...' }
    const [isConnected, setIsConnected] = useState(false);

    // Sync state if URL changes
    useEffect(() => {
        const ev = getParam("event");
        const ct = getParam("court");
        if (ev) {
            setEventId(ev);
            localStorage.setItem("selectedEvent", ev);
        }
        if (ct) {
            setCourtId(ct);
            localStorage.setItem("selectedCourt", ct);
        }
    }, [searchParams]);

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
    }, [currentMatchId, eventId]);

    // Cross-browser Fullscreen request helper
    const handleFullscreen = () => {
        if (!document.fullscreenElement) {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else if (document.documentElement.webkitRequestFullscreen) {
                document.documentElement.webkitRequestFullscreen();
            } else if (document.documentElement.msRequestFullscreen) {
                document.documentElement.msRequestFullscreen();
            }
        }
    };

    const handleScore = (side, index, label) => {
        if (!eventId || !currentMatchId) return;

        // Mobile haptic vibration feedback
        if (navigator.vibrate) {
            navigator.vibrate(60);
        }

        // Call scoring API (+1 point increment for selected point index)
        updateScoreAndCheckRules(eventId, currentMatchId, side, "pointsStat", index, 1);

        const actionObj = { side, text: `${side.toUpperCase()} ${label}` };
        setLastAction(actionObj);

        setTimeout(() => {
            setLastAction((prev) => (prev?.text === actionObj.text ? null : prev));
        }, 1800);
    };

    const redName = matchData?.config?.competitors?.red?.name || "Hong (Red)";
    const blueName = matchData?.config?.competitors?.blue?.name || "Chung (Blue)";
    const matchNo = matchData?.config?.matchId || currentMatchId || "N/A";
    const currentRound = matchData?.state?.currentRound || 1;
    const isPaused = matchData?.state?.isPaused ?? true;

    return (
        <div className="controller" onClick={handleFullscreen}>
            {/* Top Bar Banner for Match & Connection Status */}
            <div className="ctrl-top-bar">
                <button 
                    className="ctrl-back-btn" 
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate("/");
                    }} 
                    aria-label="Back"
                >
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

            {/* Action Feedback Banner Toast with Side Color */}
            {lastAction && (
                <div className={`ctrl-action-banner ${lastAction.side === "red" ? "red-banner" : "blue-banner"}`}>
                    {lastAction.text}
                </div>
            )}

            {/* Column 1: Red 6, Red 4, Red 1 */}
            <div className="col red-col">
                <Button 
                    text="Red 6" 
                    angle={350} 
                    fontSize="4vw" 
                    onClick={() => handleScore("red", 4, "+6 Turn Head")} 
                />
                <Button 
                    text="Red 4" 
                    angle={350} 
                    fontSize="4vw" 
                    onClick={() => handleScore("red", 3, "+4 Turn Body")} 
                />
                <Button 
                    text="Red 1" 
                    angle={350} 
                    fontSize="4vw" 
                    onClick={() => handleScore("red", 0, "+1 Punch")} 
                />
            </div>

            {/* Column 2: Red 3, Red 2 */}
            <div className="col red-col">
                <Button 
                    text="Red 3" 
                    angle={350} 
                    fontSize="4vw" 
                    onClick={() => handleScore("red", 2, "+3 Head")} 
                />
                <Button 
                    text="Red 2" 
                    angle={350} 
                    fontSize="4vw" 
                    onClick={() => handleScore("red", 1, "+2 Body")} 
                />
            </div>

            {/* Column 3: Center Info Panel (Horizontal Left-to-Right layout) */}
            <div className="col center-col">
                <div className="center-match-details-horizontal">
                    <div className="competitor-side red-side-text">{redName}</div>
                    <div className="center-vs-box">
                        <span className="vs-badge">VS</span>
                        <span className="round-pill">R{currentRound} • {isPaused ? "PAUSED" : "LIVE"}</span>
                    </div>
                    <div className="competitor-side blue-side-text">{blueName}</div>
                </div>
            </div>

            {/* Column 4: Blue 3, Blue 2 */}
            <div className="col blue-col">
                <Button 
                    text="Blue 3" 
                    angle={210} 
                    fontSize="4vw" 
                    onClick={() => handleScore("blue", 2, "+3 Head")} 
                />
                <Button 
                    text="Blue 2" 
                    angle={210} 
                    fontSize="4vw" 
                    onClick={() => handleScore("blue", 1, "+2 Body")} 
                />
            </div>

            {/* Column 5: Blue 6, Blue 4, Blue 1 */}
            <div className="col blue-col">
                <Button 
                    text="Blue 6" 
                    angle={210} 
                    fontSize="4vw" 
                    onClick={() => handleScore("blue", 4, "+6 Turn Head")} 
                />
                <Button 
                    text="Blue 4" 
                    angle={210} 
                    fontSize="4vw" 
                    onClick={() => handleScore("blue", 3, "+4 Turn Body")} 
                />
                <Button 
                    text="Blue 1" 
                    angle={210} 
                    fontSize="4vw" 
                    onClick={() => handleScore("blue", 0, "+1 Punch")} 
                />
            </div>
        </div>
    );
}

export default Controller;
