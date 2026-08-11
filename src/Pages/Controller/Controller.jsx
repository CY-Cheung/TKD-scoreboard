import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ref, onValue, set, onDisconnect, runTransaction } from "firebase/database";
import { database } from "../../firebase";
import { updateScoreAndCheckRules } from "../../Api";
import { useAuth } from "../../Context/AuthContext";
import { useEventSession } from "../../Context/EventSessionContext";
import Button from "../../Components/Button/Button";
import { Wifi, WifiOff, ArrowLeft } from "react-bootstrap-icons";
import { requestFullscreen } from "../../Utils/requestFullscreen";
import { getDeviceName, resolveControllerParam } from "./controllerParams";
import {
    ADMIN_SEAT,
    REFEREE_SEAT_ORDER,
    SEAT_GRAB_STRICT_MODE_DELAY_MS,
    applySeatClaimTransaction,
    buildSeatDevicePayload,
    createAdminDeviceId,
    createRefereeDeviceId,
    isAdminSeat,
    legacyRefereeSeatPath,
    refereeSeatPath,
    shouldKickFromSeat,
} from "./seatGrab";
import { armScoreHaptic, triggerScoreHaptic } from "./scoreHaptic";
import {
    subscribePreferFlatCourt,
} from "../../services/courtFirebase";
import ControllerScorePad from "./ControllerScorePad";
import "./Controller.css";

function Controller() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { session, setEventSession } = useEventSession();

    const getParam = (key) =>
        resolveControllerParam(key, { searchParams, session });

    const initialEvent = getParam("event");
    const initialCourt = getParam("court");

    const [eventId, setEventId] = useState(initialEvent);
    const [courtId, setCourtId] = useState(initialCourt);
    const [eventName, setEventName] = useState("");
    const [currentMatchId, setCurrentMatchId] = useState(null);
    const [deviceId, setDeviceId] = useState("");
    const [mySeat, setMySeat] = useState(null);
    const [isFull, setIsFull] = useState(false);
    const [matchData, setMatchData] = useState(null);
    const [lastAction, setLastAction] = useState(null); // { side: 'red'|'blue', text: '...' }
    const [isConnected, setIsConnected] = useState(false);
    const [refereeMode, setRefereeMode] = useState('single');

    // Sync state + EventSession when URL / QR deep-link params change
    useEffect(() => {
        const ev = getParam("event");
        const ct = getParam("court");
        if (ev) setEventId(ev);
        if (ct) setCourtId(ct);
        if (ev && ct) {
            setEventSession({
                eventId: ev,
                courtId: ct,
                eventName: session?.eventName || ev,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // Listen to refereeMode (prefer flat courts path)
    useEffect(() => {
        if (!eventId || !courtId) return;
        return subscribePreferFlatCourt(
            database,
            eventId,
            courtId,
            ["config", "refereeMode"],
            (val) => setRefereeMode(val || "single")
        );
    }, [eventId, courtId]);

    // Fetch Event Name (leaf path only — avoid whole event tree)
    useEffect(() => {
        if (!eventId) return;
        const nameRef = ref(database, `events/${eventId}/EventName`);
        const unsubscribe = onValue(nameRef, (snapshot) => {
            setEventName(snapshot.val() || eventId);
        });
        return () => unsubscribe();
    }, [eventId]);

    // Grab Referee Seat (J1, J2, J3) if not logged in
    useEffect(() => {
        if (!eventId || !courtId) return;
        
        if (user) {
            setMySeat(ADMIN_SEAT);
            // Admin also needs a deviceId for the scoring API
            setDeviceId(createAdminDeviceId());
            return;
        }

        const newDeviceId = createRefereeDeviceId();
        setDeviceId(newDeviceId);
        setIsFull(false);
        let grabbedSeat = null;

        let isMounted = true;
        const trySeat = async (seatName) => {
            if (!isMounted) return false;
            const seatRef = ref(
                database,
                refereeSeatPath(eventId, courtId, seatName)
            );
            const legacySeatRef = ref(
                database,
                legacyRefereeSeatPath(eventId, courtId, seatName)
            );
            try {
                const deviceData = buildSeatDevicePayload(
                    newDeviceId,
                    getDeviceName()
                );

                // Canonical claim on flat path; mirror to legacy for dual-write.
                const result = await runTransaction(seatRef, (currentData) =>
                    applySeatClaimTransaction(currentData, deviceData)
                );

                if (result.committed) {
                    if (!isMounted) {
                        set(seatRef, null);
                        set(legacySeatRef, null).catch(() => {});
                        return false;
                    }
                    set(legacySeatRef, deviceData).catch(() => {});
                    onDisconnect(seatRef).remove();
                    onDisconnect(legacySeatRef).remove();
                    setMySeat(seatName);
                    grabbedSeat = seatName;
                    return true;
                }
                return false;
            } catch (e) {
                return false;
            }
        };

        const grabSeat = async () => {
            // Delay bypasses React StrictMode double-mount race condition
            await new Promise((resolve) =>
                setTimeout(resolve, SEAT_GRAB_STRICT_MODE_DELAY_MS)
            );
            if (!isMounted) return;

            for (const seatName of REFEREE_SEAT_ORDER) {
                if (await trySeat(seatName)) return;
            }
            if (isMounted) setIsFull(true);
        };

        grabSeat();

        return () => {
            isMounted = false;
            if (grabbedSeat) {
                set(
                    ref(
                        database,
                        refereeSeatPath(eventId, courtId, grabbedSeat)
                    ),
                    null
                ).catch(() => {});
                set(
                    ref(
                        database,
                        legacyRefereeSeatPath(eventId, courtId, grabbedSeat)
                    ),
                    null
                ).catch(() => {});
            }
        };
    }, [eventId, courtId, user]);

    // Self-disconnect listener: watch mySeat and kick out if deviceId doesn't match
    // Skip for Admin users - they don't occupy a referee seat in Firebase
    useEffect(() => {
        if (!eventId || !courtId || !mySeat || !deviceId) return;
        if (isAdminSeat(mySeat)) return;

        const seatRef = ref(
            database,
            refereeSeatPath(eventId, courtId, mySeat)
        );
        const unsubscribe = onValue(seatRef, (snapshot) => {
            if (shouldKickFromSeat(snapshot.val(), deviceId)) {
                setIsConnected(false);
                setMySeat(null);
                setDeviceId(null); // Force regenerate next time
                setMatchData(null);
            }
        });

        return () => unsubscribe();
    }, [eventId, courtId, mySeat, deviceId]);

    // Listen to currentMatchId on court
    useEffect(() => {
        if (!eventId || !courtId) {
            setIsConnected(false);
            return;
        }

        return subscribePreferFlatCourt(
            database,
            eventId,
            courtId,
            "currentMatchId",
            (matchId) => {
                setIsConnected(true);
                setCurrentMatchId(matchId || null);
                if (!matchId) setMatchData(null);
            }
        );
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

    const handleScore = (side, index, label) => {
        if (!eventId || !currentMatchId) return;

        // Block remote input when timer is not running
        const isCurrentlyPaused = matchData?.state?.isPaused ?? true;
        if (isCurrentlyPaused) return;
        if (matchData?.state?.phase === "REST") return;

        // Arm Vibration API inside the click gesture (helps older Samsung WebViews
        // still accept a haptic after the async Firebase transaction settles).
        armScoreHaptic();

        // Single mode applies points immediately → haptic in-gesture (S22+ friendly).
        // Multiple mode may only record a vote → wait for scored===true.
        const expectImmediateScore = refereeMode !== "multiple";
        if (expectImmediateScore) {
            triggerScoreHaptic();
        }

        // Call scoring API (+1 point increment for selected point index).
        updateScoreAndCheckRules(
            eventId,
            currentMatchId,
            side,
            "pointsStat",
            index,
            1,
            courtId,
            deviceId,
            mySeat,
            refereeMode
        ).then(({ scored }) => {
            if (!scored) return;
            if (!expectImmediateScore) {
                triggerScoreHaptic();
            }
            const actionObj = { side, text: `${side.toUpperCase()} ${label}` };
            setLastAction(actionObj);
            setTimeout(() => {
                setLastAction((prev) => (prev?.text === actionObj.text ? null : prev));
            }, 1800);
        });
    };

    const redName = matchData?.config?.competitors?.red?.name || "Hong (Red)";
    const blueName = matchData?.config?.competitors?.blue?.name || "Chung (Blue)";
    const matchNo = matchData?.config?.matchId || currentMatchId || "N/A";
    const currentRound = matchData?.state?.currentRound || 1;
    const isPaused = matchData?.state?.isPaused ?? true;

    if (isFull) {
        return (
            <div className="controller" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white', padding: '20px', textAlign: 'center' }}>
                <h1 style={{ color: '#ff3b30' }}>Court is Full</h1>
                <p>There are already 3 referees connected to this court.</p>
                <Button text="Back (返回)" onClick={() => navigate("/court-setup")} variant="orange" />
            </div>
        );
    }

    return (
        <div className="controller aurora-bg" onClick={requestFullscreen}>
            {/* Top Bar Banner for Match & Connection Status */}
            <div className="ctrl-top-bar">
                <Button 
                    className="ctrl-back-btn" 
                    onClick={(e) => {
                        e.stopPropagation();
                        if (user) {
                            navigate("/home");
                        } else {
                            navigate("/court-setup");
                        }
                    }} 
                    aria-label="Back"
                    icon={<ArrowLeft size={'1.5cqi'} />}
                    fontSize="1cqi"
                    angle={180}
                />
                <div className="ctrl-info-badges">
                    <span className="ctrl-badge">{eventName || eventId || "No Event"}</span>
                    <span className="ctrl-badge court">{courtId || "No Court"}</span>
                    <span className="ctrl-badge match">Match #{matchNo}</span>
                    {mySeat && <span className="ctrl-badge" style={{ backgroundColor: '#ffcc00', color: 'black' }}>{mySeat}</span>}
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

            <ControllerScorePad onScore={handleScore}>
                <div className="col center-col">
                    <div className="center-match-details-horizontal">
                        <div className="competitor-side red-side-text">{redName}</div>
                        <div className="center-vs-box">
                            <span className="vs-badge">VS</span>
                            <span className="round-pill">R{currentRound} • {isPaused ? "PAUSED" : "LIVE"}</span>
                            <span className="round-pill" style={{ fontSize: '1cqi', opacity: 0.8, background: refereeMode === 'multiple' ? 'rgba(255,100,0,0.4)' : 'rgba(0,200,100,0.3)' }}>
                                {refereeMode === 'multiple' ? '👥 Multi' : '👤 Single'} • {mySeat || '...'}
                            </span>
                        </div>
                        <div className="competitor-side blue-side-text">{blueName}</div>
                    </div>
                </div>
            </ControllerScorePad>
        </div>
    );
}

export default Controller;
