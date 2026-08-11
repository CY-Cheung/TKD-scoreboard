import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ref, onValue, set, update, onDisconnect, runTransaction } from "firebase/database";
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
    SEAT_HEARTBEAT_INTERVAL_MS,
    applySeatClaimTransaction,
    buildSeatDevicePayload,
    createAdminDeviceId,
    createRefereeDeviceId,
    isAdminSeat,
    legacyRefereeSeatPath,
    refereeSeatPath,
    shouldKickFromSeat,
} from "./seatGrab";
import { armScoreHaptic, shouldVibrateForRecentScores, triggerScoreHaptic } from "./scoreHaptic";
import {
    subscribePreferFlatCourt,
} from "../../services/courtFirebase";
import { subscribeMatchView } from "../../services/matchFirebase";
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
    const [seatGrabError, setSeatGrabError] = useState(null);
    const [seatGrabPending, setSeatGrabPending] = useState(false);
    const [matchData, setMatchData] = useState(null);
    const [lastAction, setLastAction] = useState(null); // { side: 'red'|'blue', text: '...' }
    const [isConnected, setIsConnected] = useState(false);
    const [refereeMode, setRefereeMode] = useState('single');
    // undefined = not seeded yet; null/string = last haptic'd recentScores key
    const lastRecentScoreHapticKeyRef = useRef(undefined);

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
            setSeatGrabPending(false);
            // Admin also needs a deviceId for the scoring API
            setDeviceId(createAdminDeviceId());
            return;
        }

        const newDeviceId = createRefereeDeviceId();
        setDeviceId(newDeviceId);
        setIsFull(false);
        setSeatGrabError(null);
        setSeatGrabPending(true);
        let grabbedSeat = null;
        let lastGrabError = null;
        let flatSeatRef = null;
        let heartbeatId = null;
        let connectedUnsub = null;

        let isMounted = true;

        const clearSeatPaths = () => {
            if (!grabbedSeat) return;
            const flatPath = refereeSeatPath(eventId, courtId, grabbedSeat);
            const legacyPath = legacyRefereeSeatPath(eventId, courtId, grabbedSeat);
            set(ref(database, flatPath), null).catch(() => {});
            // Best-effort: wipe leftover dual-write seat so Screen flat-primary UI stays clean.
            set(ref(database, legacyPath), null).catch(() => {});
        };

        const registerDisconnectHandlers = () => {
            if (!flatSeatRef) return;
            onDisconnect(flatSeatRef).remove().catch(() => {});
        };

        const startPresence = (seatName) => {
            flatSeatRef = ref(
                database,
                refereeSeatPath(eventId, courtId, seatName)
            );

            // Re-arm onDisconnect whenever Firebase reconnects (mobile browsers).
            const connectedRef = ref(database, ".info/connected");
            connectedUnsub = onValue(connectedRef, (snap) => {
                if (snap.val() === true) {
                    registerDisconnectHandlers();
                }
            });

            registerDisconnectHandlers();

            heartbeatId = setInterval(() => {
                if (!isMounted || !grabbedSeat) return;
                update(flatSeatRef, { lastSeen: Date.now() }).catch(() => {});
            }, SEAT_HEARTBEAT_INTERVAL_MS);

            // pagehide/beforeunload often fire when the phone closes the tab;
            // React effect cleanup frequently does NOT run in that case.
            window.addEventListener("pagehide", clearSeatPaths);
            window.addEventListener("beforeunload", clearSeatPaths);
        };

        const trySeat = async (seatName) => {
            if (!isMounted) return false;
            // Stage 5b: claim on flat courts path only (no legacy dual-write).
            const flatRefForClaim = ref(
                database,
                refereeSeatPath(eventId, courtId, seatName)
            );
            const legacyRefForCleanup = ref(
                database,
                legacyRefereeSeatPath(eventId, courtId, seatName)
            );
            try {
                const deviceData = buildSeatDevicePayload(
                    newDeviceId,
                    getDeviceName()
                );

                const result = await runTransaction(flatRefForClaim, (currentData) =>
                    applySeatClaimTransaction(currentData, deviceData)
                );

                if (result.committed) {
                    if (!isMounted) {
                        set(flatRefForClaim, null).catch(() => {});
                        return false;
                    }
                    // Drop any leftover legacy seat for this chair (pre-cutover dual-write).
                    set(legacyRefForCleanup, null).catch(() => {});
                    setMySeat(seatName);
                    setSeatGrabError(null);
                    grabbedSeat = seatName;
                    startPresence(seatName);
                    return true;
                }
                return false;
            } catch (e) {
                lastGrabError = e?.code || e?.message || String(e);
                console.error("Seat grab failed:", seatName, lastGrabError);
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
                if (await trySeat(seatName)) {
                    if (isMounted) setSeatGrabPending(false);
                    return;
                }
            }
            if (!isMounted) return;
            setSeatGrabPending(false);
            if (lastGrabError) {
                setSeatGrabError(lastGrabError);
                setIsFull(false);
            } else {
                setIsFull(true);
            }
        };

        grabSeat();

        return () => {
            isMounted = false;
            setSeatGrabPending(false);
            if (heartbeatId) clearInterval(heartbeatId);
            if (connectedUnsub) connectedUnsub();
            window.removeEventListener("pagehide", clearSeatPaths);
            window.removeEventListener("beforeunload", clearSeatPaths);
            clearSeatPaths();
        };
    }, [eventId, courtId, user]);

    // Self-disconnect listener: watch mySeat and kick out if deviceId doesn't match
    // Skip for Admin users - they don't occupy a referee seat in Firebase
    useEffect(() => {
        if (!eventId || !courtId || !mySeat || !deviceId) return;
        if (isAdminSeat(mySeat)) return;

        // Stage 5b: kick listener watches flat seat (claim source of truth).
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

    // Listen to matchData (config + matchLive)
    useEffect(() => {
        if (!eventId || !currentMatchId) {
            setMatchData(null);
            lastRecentScoreHapticKeyRef.current = undefined;
            return;
        }

        lastRecentScoreHapticKeyRef.current = undefined;
        return subscribeMatchView(database, eventId, currentMatchId, setMatchData);
    }, [currentMatchId, eventId]);

    // Shared score haptic: every Controller vibrates when recentScores gains a new entry
    // (covers multi-judge consensus within 1000ms — including phones that only voted).
    useEffect(() => {
        const { vibrate, nextKey } = shouldVibrateForRecentScores(
            matchData?.recentScores,
            lastRecentScoreHapticKeyRef.current
        );
        lastRecentScoreHapticKeyRef.current = nextKey;
        if (vibrate) {
            triggerScoreHaptic();
        }
    }, [matchData?.recentScores]);

    const handleScore = (side, index, label) => {
        if (!eventId || !currentMatchId) return;

        // Block remote input when timer is not running
        const isCurrentlyPaused = matchData?.state?.isPaused ?? true;
        if (isCurrentlyPaused) return;
        if (matchData?.state?.phase === "REST") return;

        // Arm Vibration API inside the click gesture so Samsung WebViews still
        // accept a pulse when recentScores arrives shortly after (shared haptic).
        armScoreHaptic();

        // Call scoring API (+1 point increment for selected point index).
        // Haptic is broadcast via recentScores listener (all Controllers), not here —
        // so multi-mode late consensus still vibrates every phone.
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

    if (seatGrabPending && !mySeat && !user) {
        return (
            <div className="controller" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white', padding: '20px', textAlign: 'center' }}>
                <h1>Connecting…</h1>
                <p>正在搶裁判席位（J1–J3）…</p>
            </div>
        );
    }

    if (seatGrabError) {
        return (
            <div className="controller" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white', padding: '20px', textAlign: 'center' }}>
                <h1 style={{ color: '#ff3b30' }}>Seat Grab Failed</h1>
                <p>搶位失敗。請確認 Firebase rules 已 publish，並重新掃 QR。</p>
                <p style={{ opacity: 0.7, fontSize: '0.9rem', wordBreak: 'break-all' }}>{seatGrabError}</p>
                <Button text="Retry (重試)" onClick={() => window.location.reload()} variant="yellow" />
            </div>
        );
    }

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
