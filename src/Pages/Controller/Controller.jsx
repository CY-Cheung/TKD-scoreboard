import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ref, onValue, set, onDisconnect, runTransaction } from "firebase/database";
import { database } from "../../firebase";
import { updateScoreAndCheckRules } from "../../Api";
import { useAuth } from "../../Context/AuthContext";
import { useEventSession } from "../../Context/EventSessionContext";
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
    extractSeatDeviceId,
    isAdminSeat,
    refereeSeatPath,
    shouldKickFromSeat,
} from "./seatGrab";
import { armScoreHaptic, shouldVibrateForRecentScores, triggerScoreHaptic } from "./scoreHaptic";
import {
    canAcceptScoreInput,
    buildControllerMatchSummary,
    resolveControllerBackPath,
    buildScoreActionFeedback,
} from "./controllerMatchView";
import {
    subscribeCourt,
} from "../../services/courtFirebase";
import { subscribeMatchView } from "../../services/matchFirebase";
import ControllerScorePad from "./ControllerScorePad";
import ControllerTopBar from "./ControllerTopBar";
import ControllerNamesBar from "./ControllerNamesBar";
import ControllerCenterPanel from "./ControllerCenterPanel";
import {
    ControllerConnectingScreen,
    ControllerSeatGrabErrorScreen,
    ControllerCourtFullScreen,
} from "./ControllerStatusScreens";
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
        return subscribeCourt(
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
    // Firebase runTransaction / onDisconnect / heartbeat stay here (P0).
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
        let presenceActive = false;

        let isMounted = true;

        const clearSeatPaths = () => {
            // Stop heartbeats BEFORE nulling the seat so an in-flight
            // update({ lastSeen }) cannot recreate a deviceId-less ghost.
            presenceActive = false;
            if (heartbeatId) {
                clearInterval(heartbeatId);
                heartbeatId = null;
            }
            if (!grabbedSeat) return;
            const seatToClear = grabbedSeat;
            grabbedSeat = null;
            const flatPath = refereeSeatPath(eventId, courtId, seatToClear);
            set(ref(database, flatPath), null).catch(() => {});
        };

        const registerDisconnectHandlers = () => {
            if (!flatSeatRef || !presenceActive) return;
            onDisconnect(flatSeatRef).remove().catch(() => {});
        };

        const startPresence = (seatName) => {
            flatSeatRef = ref(
                database,
                refereeSeatPath(eventId, courtId, seatName)
            );
            presenceActive = true;

            // Re-arm onDisconnect whenever Firebase reconnects (mobile browsers).
            const connectedRef = ref(database, ".info/connected");
            connectedUnsub = onValue(connectedRef, (snap) => {
                if (snap.val() === true) {
                    registerDisconnectHandlers();
                }
            });

            registerDisconnectHandlers();

            heartbeatId = setInterval(() => {
                if (!isMounted || !presenceActive || !grabbedSeat) return;
                // Always write full seat payload (deviceId required by rules).
                // Abort if we no longer own the seat or presence stopped.
                runTransaction(flatSeatRef, (current) => {
                    if (!presenceActive) return;
                    if (current != null && extractSeatDeviceId(current) !== newDeviceId) {
                        return;
                    }
                    return buildSeatDevicePayload(
                        newDeviceId,
                        getDeviceName(),
                        Date.now()
                    );
                }).catch(() => {});
            }, SEAT_HEARTBEAT_INTERVAL_MS);

            // pagehide/beforeunload often fire when the phone closes the tab;
            // React effect cleanup frequently does NOT run in that case.
            window.addEventListener("pagehide", clearSeatPaths);
            window.addEventListener("beforeunload", clearSeatPaths);
        };

        const trySeat = async (seatName) => {
            if (!isMounted) return false;
            // Claim on flat courts path only.
            const flatRefForClaim = ref(
                database,
                refereeSeatPath(eventId, courtId, seatName)
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

        return subscribeCourt(
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
        if (!canAcceptScoreInput(matchData)) return;

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
            const actionObj = buildScoreActionFeedback(side, label);
            setLastAction(actionObj);
            setTimeout(() => {
                setLastAction((prev) => (prev?.text === actionObj.text ? null : prev));
            }, 1800);
        });
    };

    const summary = buildControllerMatchSummary(matchData, currentMatchId);

    if (seatGrabPending && !mySeat && !user) {
        return <ControllerConnectingScreen />;
    }

    if (seatGrabError) {
        return (
            <ControllerSeatGrabErrorScreen
                error={seatGrabError}
                onRetry={() => window.location.reload()}
            />
        );
    }

    if (isFull) {
        return (
            <ControllerCourtFullScreen
                onBack={() => navigate("/court-setup")}
            />
        );
    }

    return (
        <div className="controller" onClick={requestFullscreen}>
            <div className="ctrl-stage">
                <ControllerTopBar
                    isConnected={isConnected}
                    onBack={() => navigate(resolveControllerBackPath(user))}
                />

                {lastAction && (
                    <div className={`ctrl-action-banner ${lastAction.side === "red" ? "red-banner" : "blue-banner"}`}>
                        {lastAction.text}
                    </div>
                )}

                <ControllerNamesBar
                    redName={summary.redName}
                    blueName={summary.blueName}
                />

                <ControllerScorePad onScore={handleScore}>
                    <ControllerCenterPanel
                        redScore={summary.redScore}
                        blueScore={summary.blueScore}
                        currentRound={summary.currentRound}
                        isPaused={summary.isPaused}
                        refereeMode={refereeMode}
                        mySeat={mySeat}
                        matchNo={summary.matchNo}
                    />
                </ControllerScorePad>
            </div>
        </div>
    );
}

export default Controller;
